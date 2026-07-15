import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Meta WhatsApp Cloud API webhook.
// GET: subscription verification handshake.
// POST: message status updates (sent → delivered → read / failed), matched to
// outbox rows via the provider message id captured at send time.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge);
  }
  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

interface StatusUpdate {
  id: string;
  status: string; // sent | delivered | read | failed
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const statuses: StatusUpdate[] = [];
  const entries = (body as { entry?: { changes?: { value?: { statuses?: StatusUpdate[] } }[] }[] })?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      for (const s of change.value?.statuses ?? []) {
        if (s?.id && s?.status) statuses.push({ id: s.id, status: s.status });
      }
    }
  }

  for (const s of statuses) {
    // delivered/read both count as sent+confirmed; failures are surfaced
    const status = s.status === "failed" ? "failed" : "sent";
    await db.outboxMessage.updateMany({
      where: { providerId: s.id },
      data: { status, ...(status === "sent" ? { sentAt: new Date() } : {}) },
    });
  }

  return NextResponse.json({ received: statuses.length });
}
