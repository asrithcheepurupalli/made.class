import { db } from "./db";

// Provider-agnostic parent messaging. Messages are queued in OutboxMessage and
// drained by a provider. Parents never install an app: delivery is WhatsApp
// (Business API) or SMS. The dev provider just marks rows sent so the whole
// flow is demoable without credentials.

export type MessageTemplate =
  | "fee_reminder"
  | "absence_alert"
  | "notice"
  | "receipt";

interface QueueInput {
  toPhone: string;
  toName?: string;
  template: MessageTemplate;
  body: string;
  channel?: "whatsapp" | "sms";
}

export async function queueMessage(input: QueueInput) {
  return db.outboxMessage.create({
    data: {
      toPhone: input.toPhone,
      toName: input.toName,
      template: input.template,
      body: input.body,
      channel: input.channel ?? "whatsapp",
    },
  });
}

export async function queueMessages(inputs: QueueInput[]) {
  if (inputs.length === 0) return { count: 0 };
  return db.outboxMessage.createMany({
    data: inputs.map((i) => ({
      toPhone: i.toPhone,
      toName: i.toName,
      template: i.template,
      body: i.body,
      channel: i.channel ?? "whatsapp",
    })),
  });
}

// Dev provider: marks queued messages as sent. A real provider (e.g. a
// WhatsApp BSP) replaces this with actual API calls + webhook status updates.
export async function drainOutboxDev() {
  const queued = await db.outboxMessage.findMany({
    where: { status: "queued" },
    select: { id: true },
  });
  if (queued.length === 0) return 0;
  await db.outboxMessage.updateMany({
    where: { id: { in: queued.map((m) => m.id) } },
    data: { status: "sent", sentAt: new Date() },
  });
  return queued.length;
}

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
