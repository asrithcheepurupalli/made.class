import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell, Avatar } from "@/components/shell";
import { sendQueuedMessages } from "@/app/actions";

export const metadata = { title: "Outbox" };
export const dynamic = "force-dynamic";

const TAGS: Record<string, [string, string]> = {
  fee_reminder: ["a", "reminder"],
  absence_alert: ["r", "alert"],
  notice: ["g", "notice"],
  receipt: ["g", "receipt"],
};

export default async function OutboxPage({
  searchParams,
}: {
  searchParams: Promise<{ queued?: string }>;
}) {
  const user = await requireUser(["principal", "desk"]);
  const sp = await searchParams;
  const [queued, recent] = await Promise.all([
    db.outboxMessage.count({ where: { status: "queued" } }),
    db.outboxMessage.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
  ]);

  return (
    <Shell role={user.role} active="/outbox" userName={user.name}>
      <h1>
        Outbox
        <small>
          {queued > 0 ? `${queued} queued for WhatsApp` : "all delivered"}
          {sp.queued ? ` · ${sp.queued} just added` : ""}
        </small>
      </h1>
      {queued > 0 && (
        <div className="sect" style={{ marginTop: 14 }}>
          <form action={sendQueuedMessages}>
            <button className="btn">Send {queued} queued now (dev provider)</button>
          </form>
          <p style={{ color: "var(--faint)", fontSize: 12.5, marginTop: 8 }}>
            In production a WhatsApp Business API provider drains this queue automatically.
          </p>
        </div>
      )}
      <div className="sect">
        <h2>Recent messages</h2>
        <div>
          {recent.map((m) => {
            const tag = TAGS[m.template] ?? ["g", m.template];
            return (
              <div className="li" key={m.id}>
                <Avatar name={m.toName ?? m.toPhone} />
                <span className="who">
                  <b>{m.toName ?? m.toPhone}</b> <span className="dim">· {m.body.slice(0, 70)}</span>
                </span>
                <span className={`tag ${tag[0]}`}>{tag[1]}</span>
                <span className={`tag ${m.status === "sent" ? "g" : m.status === "failed" ? "r" : "a"}`}>{m.status}</span>
                <span className="when">
                  {m.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
