import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { inr } from "@/lib/format";
import { Shell, Avatar, Flash } from "@/components/shell";
import { recordPayment } from "@/app/actions";

export const metadata = { title: "Collect" };
export const dynamic = "force-dynamic";

export default async function CollectPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sid?: string; paid?: string }>;
}) {
  const user = await requireUser(["desk", "principal"]);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const matches = q
    ? await db.student.findMany({
        where: {
          active: true,
          OR: [{ name: { contains: q } }, { admissionNo: { contains: q } }],
        },
        include: { classRoom: true },
        orderBy: { name: "asc" },
        take: 8,
      })
    : [];

  const selected = sp.sid
    ? await db.student.findUnique({
        where: { id: sp.sid },
        include: {
          classRoom: true,
          invoices: { include: { payments: true, feeHead: true }, orderBy: { dueDate: "asc" } },
        },
      })
    : null;
  const openInvoices = selected
    ? selected.invoices
        .map((inv) => ({ ...inv, bal: inv.amount - inv.payments.reduce((s, p) => s + p.amount, 0) }))
        .filter((inv) => inv.bal > 0)
    : [];

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const paymentsToday = await db.payment.findMany({
    where: { paidAt: { gte: startOfDay } },
    orderBy: { paidAt: "desc" },
    include: { invoice: { include: { student: true, feeHead: true } } },
  });
  const totalToday = paymentsToday.reduce((s, p) => s + p.amount, 0);
  const now = new Date();

  return (
    <Shell role={user.role} active="/collect" userName={user.name}>
      {sp.paid && <Flash>{inr(Number(sp.paid))} recorded · receipt sent on WhatsApp</Flash>}
      <h1>Collect<small>find the student, tap the amount</small></h1>

      <div className="sect fld" style={{ maxWidth: 560, marginTop: 8 }}>
        <form method="get">
          <input
            className="searchbig"
            name="q"
            defaultValue={q}
            placeholder="Name or admission no…"
            autoComplete="off"
            autoFocus
          />
        </form>

        {q && !selected && (
          <div style={{ marginTop: 12 }}>
            {matches.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13.5 }}>No student matches “{q}”.</p>
            ) : (
              matches.map((m) => (
                <a
                  key={m.id}
                  href={`/collect?q=${encodeURIComponent(q)}&sid=${m.id}`}
                  className="li"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Avatar name={m.name} />
                  <span className="who">
                    <b>{m.name}</b>{" "}
                    <span className="dim">· {m.classRoom.grade}-{m.classRoom.section} · Adm {m.admissionNo}</span>
                  </span>
                  <span className="textbtn">Open</span>
                </a>
              ))
            )}
          </div>
        )}

        {selected && (
          <div className="paycard">
            <div className="li" style={{ border: 0, padding: "0 0 6px" }}>
              <Avatar name={selected.name} />
              <span className="who">
                <b>{selected.name}</b>{" "}
                <span className="dim">
                  · {selected.classRoom.grade}-{selected.classRoom.section} · Adm {selected.admissionNo}
                </span>
              </span>
            </div>
            {openInvoices.length === 0 ? (
              <p style={{ color: "var(--green)", fontSize: 13.5, margin: "8px 0 0" }}>
                Nothing due — all clear. ✓
              </p>
            ) : (
              openInvoices.map((inv) => {
                const daysLate = Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400_000);
                return (
                  <div className="duept" key={inv.id}>
                    <span className="who">
                      <b>{inv.feeHead.name}</b>{" "}
                      <span className="dim">
                        · {daysLate > 0 ? `${daysLate}d late` : `due ${inv.dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                      </span>
                    </span>
                    <span className="amt">{inr(inv.bal)}</span>
                    <form action={recordPayment} className="modebtns" style={{ margin: 0 }}>
                      <input type="hidden" name="invoiceId" value={inv.id} />
                      <input type="hidden" name="amount" value={inv.bal} />
                      <input type="hidden" name="back" value="/collect" />
                      <select name="mode" className="inline-sel" defaultValue="upi" aria-label="Mode">
                        <option value="upi">UPI</option>
                        <option value="cash">Cash</option>
                        <option value="bank">Bank</option>
                      </select>
                      <button className="btn" style={{ padding: "6px 14px" }}>Record {inr(inv.bal)}</button>
                    </form>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="sect">
        <h2>
          Received today · {inr(totalToday)}
          <span className="more">{paymentsToday.length} payments</span>
        </h2>
        <div>
          {paymentsToday.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nothing yet today.</p>
          ) : (
            paymentsToday.slice(0, 20).map((p) => (
              <div className="li" key={p.id}>
                <Avatar name={p.invoice.student.name} />
                <span className="who">
                  <b>{p.invoice.student.name}</b> <span className="dim">· {p.invoice.feeHead.name}</span>
                </span>
                <span className={`tag ${p.mode === "cash" ? "a" : "g"}`}>{p.mode}</span>
                <span className="amt">{inr(p.amount)}</span>
                <span className="when">
                  {p.paidAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </Shell>
  );
}
