import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { inr } from "@/lib/format";
import { Shell, Avatar, Flash } from "@/components/shell";
import { sendFeeReminders } from "@/app/actions";

export const metadata = { title: "Dues" };
export const dynamic = "force-dynamic";

export default async function DuesPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const user = await requireUser(["desk"]);
  const sp = await searchParams;

  const invoices = await db.feeInvoice.findMany({
    where: { status: { in: ["unpaid", "partial"] } },
    include: { payments: true, student: { include: { classRoom: true } }, feeHead: true },
    orderBy: { dueDate: "asc" },
  });
  const now = new Date();
  const rows = invoices
    .map((inv) => ({ ...inv, bal: inv.amount - inv.payments.reduce((s, p) => s + p.amount, 0) }))
    .filter((r) => r.bal > 0);
  const overdue = rows.filter((r) => r.dueDate < now);
  const total = rows.reduce((s, r) => s + r.bal, 0);

  return (
    <Shell role={user.role} active="/dues" userName={user.name}>
      {sp.paid && <Flash>{inr(Number(sp.paid))} recorded · receipt sent on WhatsApp</Flash>}
      <h1>
        Dues<small>{rows.length} open · {inr(total)} out there</small>
      </h1>
      <div className="sect" style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <form action={sendFeeReminders}>
          <input type="hidden" name="scope" value="overdue" />
          <button className="btn">Remind {overdue.length} overdue on WhatsApp</button>
        </form>
      </div>
      <div className="sect">
        <h2>Oldest first</h2>
        <div>
          {rows.slice(0, 60).map((r) => {
            const daysLate = Math.floor((now.getTime() - r.dueDate.getTime()) / 86400_000);
            const tag = daysLate > 30 ? ["r", "step 3"] : daysLate > 0 ? ["r", `${daysLate}d late`] : ["a", "upcoming"];
            return (
              <div className="li" key={r.id}>
                <Avatar name={r.student.name} />
                <span className="who">
                  <b>{r.student.name}</b>{" "}
                  <span className="dim">
                    · {r.student.classRoom.grade}-{r.student.classRoom.section} · {r.feeHead.name}
                  </span>
                </span>
                <span className={`tag ${tag[0]}`}>{tag[1]}</span>
                <span className="amt">{inr(r.bal)}</span>
                <a className="textbtn" href={`/collect?q=${encodeURIComponent(r.student.name)}&sid=${r.student.id}`}>
                  Collect
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
