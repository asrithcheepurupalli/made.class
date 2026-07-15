// Meta WhatsApp Cloud API provider.
//
// Configure three env vars to switch from the dev provider to real delivery:
//   WHATSAPP_ACCESS_TOKEN   — system-user token from Meta Business
//   WHATSAPP_PHONE_ID       — the sending phone-number id
//   WHATSAPP_VERIFY_TOKEN   — any secret string, echoed in webhook setup
//
// Notes for production: Meta requires pre-approved message templates for
// business-initiated messages; the free-form `text` payload below works inside
// a 24h customer-service window and for sandbox/test numbers. Swapping to
// template sends means changing buildPayload() only.

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

export async function sendWhatsApp(
  toPhone: string,
  body: string
): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return { ok: false, error: "not configured" };

  const to = toPhone.replace(/[^\d]/g, ""); // Cloud API wants digits only, country code included
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
    const data = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };
    if (!res.ok || !data.messages?.[0]?.id) {
      return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, providerId: data.messages[0].id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}
