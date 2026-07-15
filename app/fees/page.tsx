import { db } from "@/lib/db";
import { requireUserWithSchool } from "@/lib/auth";
import { inr } from "@/lib/format";
import { Shell, Avatar, Flash } from "@/components/shell";
import { recordPayment, sendFeeReminders } from "@/app/actions";

export const metadata = { title: "Fees" };
export const dynamic = "force-dynamic";

function lakh(n: number): string {
  return n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : inr(n);
}

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; reminded?: string }>;
}) {
  const { user, school } = await requireUserWithSchool(["principal"]);
  const sp = await searchParams;

  const invoices = await db.feeInvoice.findMany({
    where: { student: { schoolId: school.id } },
    include: { payments: true, student: { include: { classRoom: true } }, feeHead: true },
  });

  const now = new Date();
  const soon = new Date(now.getTime() + 14 * 86400_000);
  let billed = 0, collected = 0, overdueBal = 0, dueSoonBal = 0, overdueCount = 0;
  const open: typeof invoices = [];
  for (const inv of invoices) {
    billed += inv.amount;
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    collected += Math.min(paid, inv.amount);
    const bal = inv.amount - paid;
    if (bal > 0) {
      open.push(inv);
      if (inv.dueDate < now) { overdueBal += bal; overdueCount++; }
      else if (inv.dueDate < soon) dueSoonBal += bal;
    }
  }
  const paidPct = billed ? Math.round((collected / billed) * 100) : 0;
  const overduePct = billed ? Math.round((overdueBal / billed) * 100) : 0;
  const dueSoonPct = billed ? Math.round((dueSoonBal / billed) * 100) : 0;
  open.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  return (
    <Shell role={user.role} active="/fees" userName={user.name}>
      {sp.paid && <Flash>{inr(Number(sp.paid))} recorded · receipt sent on WhatsApp</Flash>}
      <h1>Fees<small>Term 1</small></h1>

      <div className="feehero">
        <div>
          <div className="big">{lakh(collected)}</div>
          <div className="cap">collected of {lakh(billed)}</div>
        </div>
        <div className="feebar">
          <div className="bar">
            <i style={{ width: `${paidPct}%`, background: "var(--green)" }} />
            <i style={{ width: `${dueSoonPct}%`, background: "var(--amber)" }} />
            <i style={{ width: `${overduePct}%`, background: "var(--red-soft)" }} />
          </div>
          <div className="leg">
            <span><span className="sw" style={{ background: "var(--green)" }} />{paidPct}% paid</span>
            <span><span className="sw" style={{ background: "var(--amber)" }} />{dueSoonPct}% due soon</span>
            <span><span className="sw" style={{ background: "var(--red)" }} />{overduePct}% overdue</span>
          </div>
        </div>
        <form action={sendFeeReminders}>
          <input type="hidden" name="scope" value="overdue" />
          <button className="btn">Remind {overdueCount} on WhatsApp</button>
        </form>
      </div>

      <div className="sect">
        <h2>
          Oldest first <span className="more">{open.length} open invoices</span>
        </h2>
        <div>
          {open.slice(0, 40).map((inv) => {
            const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
            const bal = inv.amount - paid;
            const daysLate = Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400_000);
            const tag =
              daysLate > 30 ? ["r", "step 3"] : daysLate > 0 ? ["r", `${daysLate}d late`] : ["a", "upcoming"];
            return (
              <div className="li" key={inv.id}>
                <Avatar name={inv.student.name} />
                <span className="who">
                  <b>{inv.student.name}</b>{" "}
                  <span className="dim">
                    · {inv.student.classRoom.grade}-{inv.student.classRoom.section} · {inv.feeHead.name}
                    {paid > 0 ? ` · ${inr(paid)} paid` : ""}
                  </span>
                </span>
                <span className={`tag ${tag[0]}`}>{tag[1]}</span>
                <span className="amt">{inr(bal)}</span>
                <form action={recordPayment} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <input type="hidden" name="amount" value={bal} />
                  <input type="hidden" name="back" value="/fees" />
                  <select name="mode" className="inline-sel" defaultValue="upi" aria-label="Payment mode">
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                  </select>
                  <button className="textbtn">Record</button>
                </form>
              </div>
            );
          })}
          {open.length > 40 && (
            <p style={{ color: "var(--faint)", fontSize: 12.5, marginTop: 10 }}>
              Showing the 40 oldest — {open.length - 40} more open.
            </p>
          )}
        </div>
      </div>
    </Shell>
  );
}
