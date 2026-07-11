// UPI deep links (NPCI upi:// scheme). Opening on a phone offers the parent a
// choice of UPI apps with amount and payee prefilled. No convenience charges,
// no intermediary: money goes straight to the school's VPA.

export function upiPayLink(params: {
  vpa: string;
  payee: string;
  amount: number;
  note: string;
}): string {
  const q = new URLSearchParams({
    pa: params.vpa,
    pn: params.payee,
    am: String(params.amount),
    cu: "INR",
    tn: params.note.slice(0, 80),
  });
  return `upi://pay?${q.toString()}`;
}
