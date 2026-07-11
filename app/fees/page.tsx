import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell, PageTitle, Card, Stat, inputCls, btnCls, btnGhostCls } from "@/components/shell";
import {
  createFeeHead,
  generateInvoices,
  recordPayment,
  sendFeeReminders,
} from "@/app/actions";
import { inr, dateHuman, todayISO } from "@/lib/format";

export default async function FeesPage() {
  const user = await requireUser();
  const school = await db.school.findFirst();
  if (!school) return null;

  const [feeHeads, classes, openInvoices, paidThisMonth] = await Promise.all([
    db.feeHead.findMany({ orderBy: { name: "asc" } }),
    db.classRoom.findMany({ orderBy: [{ grade: "asc" }, { section: "asc" }] }),
    db.feeInvoice.findMany({
      where: { status: { in: ["unpaid", "partial"] } },
      include: { student: { include: { classRoom: true } }, feeHead: true, payments: true },
      orderBy: { dueDate: "asc" },
      take: 100,
    }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: {
        paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ]);

  const now = new Date();
  const outstanding = openInvoices.reduce(
    (sum, inv) => sum + inv.amount - inv.payments.reduce((s, p) => s + p.amount, 0),
    0
  );
  const overdueCount = openInvoices.filter((i) => i.dueDate < now).length;

  return (
    <Shell schoolName={school.name} userName={user.name}>
      <PageTitle
        title="Fees"
        subtitle="Transparent collection: UPI direct to the school, no convenience charges"
        action={
          <form action={sendFeeReminders}>
            <input type="hidden" name="scope" value="overdue" />
            <button className={btnCls}>WhatsApp overdue reminders</button>
          </form>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Outstanding" value={inr(outstanding)} hint={`${openInvoices.length} open invoices`} />
        <Stat label="Overdue" value={String(overdueCount)} hint="invoices past due date" />
        <Stat label="Collected this month" value={inr(paidThisMonth._sum.amount ?? 0)} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-700">New fee head</h2>
            <form action={createFeeHead} className="flex gap-2">
              <input name="name" placeholder='e.g. "Tuition Term 2"' className={inputCls} required />
              <button className={btnGhostCls}>Add</button>
            </form>
          </Card>
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-700">Generate invoices</h2>
            <form action={generateInvoices} className="space-y-2">
              <select name="feeHeadId" className={inputCls} required>
                <option value="">Fee head…</option>
                {feeHeads.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <select name="classRoomId" className={inputCls} defaultValue="all">
                <option value="all">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.grade}-{c.section}</option>
                ))}
              </select>
              <input name="amount" type="number" min="1" placeholder="Amount (₹ per student)" className={inputCls} required />
              <input name="dueDate" type="date" defaultValue={todayISO()} className={inputCls} required />
              <button className={btnCls}>Generate</button>
              <p className="text-xs text-stone-400">
                One invoice per student; already-billed students are skipped.
              </p>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-700">Open invoices</h2>
            {openInvoices.length === 0 ? (
              <p className="text-sm text-stone-500">Nothing outstanding. 🎉</p>
            ) : (
              <div className="space-y-3">
                {openInvoices.map((inv) => {
                  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
                  const balance = inv.amount - paid;
                  const overdue = inv.dueDate < now;
                  return (
                    <div key={inv.id} className="rounded-md border border-stone-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-medium">{inv.student.name}</span>{" "}
                          <span className="text-xs text-stone-500">
                            {inv.student.classRoom.grade}-{inv.student.classRoom.section} · {inv.feeHead.name}
                          </span>
                          <div className={`text-xs ${overdue ? "text-red-600" : "text-stone-500"}`}>
                            Due {dateHuman(inv.dueDate)}
                            {overdue && " · overdue"}
                            {paid > 0 && ` · ${inr(paid)} paid`}
                          </div>
                        </div>
                        <div className="text-right font-semibold">{inr(balance)}</div>
                      </div>
                      <form action={recordPayment} className="mt-2 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="invoiceId" value={inv.id} />
                        <input
                          name="amount"
                          type="number"
                          min="1"
                          max={balance}
                          defaultValue={balance}
                          className="w-28 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                          required
                        />
                        <select name="mode" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" defaultValue="upi">
                          <option value="upi">UPI</option>
                          <option value="cash">Cash</option>
                          <option value="bank">Bank</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          name="reference"
                          placeholder="Ref no (optional)"
                          className="w-36 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                        />
                        <button className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700">
                          Record payment
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Shell>
  );
}
