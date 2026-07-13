import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell, Flash } from "@/components/shell";
import { publishDiary } from "@/app/actions";

export const metadata = { title: "Class diary" };
export const dynamic = "force-dynamic";

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const user = await requireUser(["teacher"]);
  const sp = await searchParams;
  const classRoom = user.classRoomId
    ? await db.classRoom.findUnique({ where: { id: user.classRoomId } })
    : null;
  const parentCount = user.classRoomId
    ? await db.student.count({ where: { classRoomId: user.classRoomId, active: true, guardianPhone: { not: null } } })
    : 0;
  const entries = user.classRoomId
    ? await db.notice.findMany({
        where: { audience: `class:${user.classRoomId}`, title: "Class diary" },
        orderBy: { createdAt: "desc" },
        take: 15,
      })
    : [];

  return (
    <Shell role={user.role} active="/diary" userName={user.name}>
      {sp.sent && <Flash>Sent to {sp.sent} parents on WhatsApp</Flash>}
      <h1>
        Class diary
        <small>goes to {classRoom ? `${classRoom.grade}-${classRoom.section}` : "your class"} parents only</small>
      </h1>
      <div className="sect fld" style={{ maxWidth: "52ch", marginTop: 10 }}>
        <form action={publishDiary}>
          <label htmlFor="body">Today&apos;s entry</label>
          <textarea id="body" name="body" rows={2} required placeholder="Maths: exercise 4.2, Q1–Q10. Science test on Monday." />
          <div style={{ marginTop: 18 }}>
            <button className="btn">Send to {parentCount} parents</button>
          </div>
        </form>
      </div>
      <div className="sect">
        <h2>Earlier</h2>
        <div>
          {entries.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13.5 }}>No entries yet — the first one takes ten seconds.</p>
          ) : (
            entries.map((e) => (
              <div className="li" key={e.id}>
                <span className="av" style={{ background: "var(--av5)" }}>📖</span>
                <span className="who"><b>{e.body.slice(0, 80)}</b></span>
                <span className="when">
                  {e.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </Shell>
  );
}
