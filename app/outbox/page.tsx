import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell, PageTitle, Card, btnCls } from "@/components/shell";
import { sendQueuedMessages } from "@/app/actions";

const templateLabels: Record<string, string> = {
  fee_reminder: "Fee reminder",
  absence_alert: "Absence alert",
  notice: "Notice",
  receipt: "Receipt",
};

export default async function OutboxPage({
  searchParams,
}: {
  searchParams: Promise<{ queued?: string }>;
}) {
  const user = await requireUser();
  const school = await db.school.findFirst();
  if (!school) return null;
  const sp = await searchParams;

  const [queued, recent] = await Promise.all([
    db.outboxMessage.count({ where: { status: "queued" } }),
    db.outboxMessage.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <Shell schoolName={school.name} userName={user.name}>
      <PageTitle
        title="Message outbox"
        subtitle="WhatsApp/SMS queue — in production a Business API provider drains this automatically"
        action={
          queued > 0 ? (
            <form action={sendQueuedMessages}>
              <button className={btnCls}>Send {queued} queued (dev)</button>
            </form>
          ) : undefined
        }
      />

      {sp.queued && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {sp.queued} reminder{Number(sp.queued) === 1 ? "" : "s"} queued for WhatsApp delivery.
        </div>
      )}

      <Card>
        {recent.length === 0 ? (
          <p className="text-sm text-stone-500">No messages yet. Absence alerts, fee reminders, receipts and notices appear here.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {recent.map((m) => (
              <li key={m.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium">{m.toName ?? m.toPhone}</span>{" "}
                    <span className="text-xs text-stone-400">{m.toPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-stone-600">
                      {templateLabels[m.template] ?? m.template}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-medium ${
                        m.status === "sent"
                          ? "bg-emerald-100 text-emerald-700"
                          : m.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Shell>
  );
}
