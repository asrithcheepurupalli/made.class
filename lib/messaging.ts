import { db } from "./db";
import { sendWhatsApp, whatsappConfigured } from "./providers/whatsapp";

// Provider-agnostic parent messaging. Messages are queued in OutboxMessage and
// drained by a provider: the Meta WhatsApp Cloud API when WHATSAPP_* env vars
// are set, otherwise a dev provider that marks rows sent so every flow stays
// demoable without credentials.

export type MessageTemplate =
  | "fee_reminder"
  | "absence_alert"
  | "notice"
  | "receipt";

interface QueueInput {
  schoolId?: string;
  toPhone: string;
  toName?: string;
  template: MessageTemplate;
  body: string;
  channel?: "whatsapp" | "sms";
}

export async function queueMessage(input: QueueInput) {
  const msg = await db.outboxMessage.create({
    data: {
      schoolId: input.schoolId,
      toPhone: input.toPhone,
      toName: input.toName,
      template: input.template,
      body: input.body,
      channel: input.channel ?? "whatsapp",
    },
  });
  await maybeDrain();
  return msg;
}

export async function queueMessages(inputs: QueueInput[]) {
  if (inputs.length === 0) return { count: 0 };
  const res = await db.outboxMessage.createMany({
    data: inputs.map((i) => ({
      schoolId: i.schoolId,
      toPhone: i.toPhone,
      toName: i.toName,
      template: i.template,
      body: i.body,
      channel: i.channel ?? "whatsapp",
    })),
  });
  await maybeDrain();
  return res;
}

// Dev provider drains are a single fast UPDATE — await them so the outbox is
// consistent before the response. Real API drains can be slow (one HTTP call
// per message), so they run best-effort here with the outbox button and the
// delivery webhook as backstops.
async function maybeDrain() {
  if (whatsappConfigured()) void drainOutbox();
  else await drainOutbox();
}

// Drain the queue. Real provider when configured; dev provider otherwise.
export async function drainOutbox(limit = 200): Promise<number> {
  const queued = await db.outboxMessage.findMany({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  if (queued.length === 0) return 0;

  if (!whatsappConfigured()) {
    await db.outboxMessage.updateMany({
      where: { id: { in: queued.map((m) => m.id) } },
      data: { status: "sent", sentAt: new Date() },
    });
    return queued.length;
  }

  let sent = 0;
  for (const m of queued) {
    const res = await sendWhatsApp(m.toPhone, m.body);
    await db.outboxMessage.update({
      where: { id: m.id },
      data: res.ok
        ? { status: "sent", sentAt: new Date(), providerId: res.providerId }
        : { status: "failed" },
    });
    if (res.ok) sent++;
  }
  return sent;
}

// Back-compat alias used by the outbox screen's manual button.
export const drainOutboxDev = drainOutbox;

// --- Templates (en + hi). Kept as plain functions so adding languages or
// swapping to approved WABA template names later is mechanical. ---

const t = {
  fee_reminder: {
    en: (p: { student: string; head: string; amount: number; due: string; school: string; upiLink?: string }) =>
      `Dear parent, fee "${p.head}" of Rs ${p.amount} for ${p.student} is due by ${p.due}.` +
      (p.upiLink ? ` Pay via UPI: ${p.upiLink}` : "") +
      ` - ${p.school}`,
    hi: (p: { student: string; head: string; amount: number; due: string; school: string; upiLink?: string }) =>
      `प्रिय अभिभावक, ${p.student} की "${p.head}" फीस ₹${p.amount} की देय तिथि ${p.due} है।` +
      (p.upiLink ? ` UPI से भुगतान करें: ${p.upiLink}` : "") +
      ` - ${p.school}`,
  },
  absence_alert: {
    en: (p: { student: string; date: string; school: string }) =>
      `Dear parent, ${p.student} was marked absent on ${p.date}. Please contact the school if this is unexpected. - ${p.school}`,
    hi: (p: { student: string; date: string; school: string }) =>
      `प्रिय अभिभावक, ${p.student} ${p.date} को विद्यालय में अनुपस्थित रहे। कोई त्रुटि हो तो विद्यालय से संपर्क करें। - ${p.school}`,
  },
  receipt: {
    en: (p: { student: string; head: string; amount: number; ref: string; school: string }) =>
      `Payment received: Rs ${p.amount} for "${p.head}" (${p.student}). Ref: ${p.ref}. Thank you! - ${p.school}`,
    hi: (p: { student: string; head: string; amount: number; ref: string; school: string }) =>
      `भुगतान प्राप्त: ₹${p.amount}, "${p.head}" (${p.student})। संदर्भ: ${p.ref}। धन्यवाद! - ${p.school}`,
  },
  notice: {
    en: (p: { title: string; body: string; school: string }) => `${p.title}\n\n${p.body}\n- ${p.school}`,
    hi: (p: { title: string; body: string; school: string }) => `${p.title}\n\n${p.body}\n- ${p.school}`,
  },
};

export const templates = t;

export function lang(l: string | null | undefined): "en" | "hi" {
  return l === "hi" ? "hi" : "en";
}
