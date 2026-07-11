import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell, PageTitle, Stat, Card } from "@/components/shell";
import { inr, dateHuman, toUTCDate, todayISO } from "@/lib/format";

export default async function Dashboard() {
  const user = await requireUser();
  const school = await db.school.findFirst();
  if (!school) return <p className="p-6">No school configured. Run the seed script.</p>;

  const today = toUTCDate(todayISO());
  const [studentCount, presentToday, absentToday, unpaidAgg, recentPayments, queuedMsgs] =
    await Promise.all([
      db.student.count({ where: { active: true } }),
      db.attendanceRecord.count({ where: { date: today, status: "present" } }),
      db.attendanceRecord.count({ where: { date: today, status: "absent" } }),
      db.feeInvoice.findMany({
        where: { status: { in: ["unpaid", "partial"] } },
        include: { payments: true },
      }),
      db.payment.findMany({
        orderBy: { paidAt: "desc" },
        take: 5,
        include: { invoice: { include: { student: true, feeHead: true } } },
      }),
      db.outboxMessage.count({ where: { status: "queued" } }),
    ]);

  const outstanding = unpaidAgg.reduce(
    (sum, inv) => sum + inv.amount - inv.payments.reduce((s, p) => s + p.amount, 0),
    0
  );
  const marked = presentToday + absentToday;

  return (
    <Shell schoolName={school.name} userName={user.name}>
      <PageTitle
        title="Dashboard"
        subtitle={`${school.name} · ${dateHuman(new Date())}`}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active students" value={String(studentCount)} />
        <Stat
          label="Attendance today"
          value={marked === 0 ? "—" : `${Math.round((presentToday / marked) * 100)}%`}
          hint={marked === 0 ? "Not marked yet" : `${presentToday} present · ${absentToday} absent`}
        />
        <Stat label="Fees outstanding" value={inr(outstanding)} hint={`${unpaidAgg.length} open invoices`} />
        <Stat label="Messages queued" value={String(queuedMsgs)} hint="WhatsApp outbox" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-700">Quick actions</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/attendance" className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              Mark today&apos;s attendance
            </Link>
            <Link href="/fees" className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-50">
              Collect fees
            </Link>
            <Link href="/notices" className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-50">
              Send a notice
            </Link>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-700">Recent payments</h2>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-stone-500">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{p.invoice.student.name}</div>
                    <div className="text-xs text-stone-500">
                      {p.invoice.feeHead.name} · {p.mode.toUpperCase()}
                    </div>
                  </div>
                  <div className="font-semibold text-emerald-700">{inr(p.amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}
