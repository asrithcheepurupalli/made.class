import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toUTCDate, todayISO } from "@/lib/format";
import { Shell, Flash, Ring } from "@/components/shell";
import { AttendanceGrid } from "@/components/attendance-grid";
import { saveAttendance } from "@/app/actions";

export const metadata = { title: "My class" };
export const dynamic = "force-dynamic";

export default async function MyClassPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser(["teacher"]);
  const sp = await searchParams;
  if (!user.classRoomId) {
    return (
      <Shell role={user.role} active="/my-class" userName={user.name}>
        <h1>No class assigned yet</h1>
        <p style={{ color: "var(--muted)" }}>Ask the principal to assign you a class in settings.</p>
      </Shell>
    );
  }

  const day = todayISO();
  const [classRoom, students, existing] = await Promise.all([
    db.classRoom.findUnique({ where: { id: user.classRoomId } }),
    db.student.findMany({ where: { classRoomId: user.classRoomId, active: true }, orderBy: { name: "asc" } }),
    db.attendanceRecord.findMany({ where: { classRoomId: user.classRoomId, date: toUTCDate(day) } }),
  ]);
  const initial: Record<string, "present" | "absent" | "leave"> = {};
  for (const r of existing) initial[r.studentId] = r.status as "present" | "absent" | "leave";
  const saved = existing.length > 0;
  const presentNow = existing.filter((r) => r.status === "present").length;

  return (
    <Shell role={user.role} active="/my-class" userName={user.name}>
      {sp.saved !== undefined && (
        <Flash>
          Register saved{Number(sp.saved) > 0 ? ` · ${sp.saved} parent${Number(sp.saved) > 1 ? "s" : ""} alerted on WhatsApp` : " · full house"}
        </Flash>
      )}
      <h1>
        {classRoom?.grade}-{classRoom?.section} · your register
        <small>{students.length} students</small>
      </h1>

      <div className="hero3" style={{ gridTemplateColumns: "repeat(2, 1fr)", maxWidth: 640 }}>
        <div className="inst">
          {saved ? (
            <Ring pct={students.length ? (presentNow / students.length) * 100 : 0} />
          ) : (
            <div className="roundbadge" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>⏳</div>
          )}
          <div>
            <div className="big">{saved ? `${presentNow}/${students.length}` : "Not saved"}</div>
            <div className="cap">{saved ? "you can still correct it" : "the office can see it's pending"}</div>
          </div>
        </div>
        <div className="inst">
          <div className="roundbadge ok">{students.length}</div>
          <div>
            <div className="big">One tap away</div>
            <div className="cap">absentees&apos; parents alerted on save</div>
          </div>
        </div>
      </div>

      <AttendanceGrid
        key={day}
        students={students.map((s) => ({ id: s.id, name: s.name }))}
        initial={initial}
        classRoomId={user.classRoomId}
        date={day}
        action={saveAttendance}
      />
    </Shell>
  );
}
