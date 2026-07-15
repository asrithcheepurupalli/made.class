import Link from "next/link";
import { db } from "@/lib/db";
import { requireUserWithSchool } from "@/lib/auth";
import { toUTCDate, todayISO } from "@/lib/format";
import { Shell, Flash } from "@/components/shell";
import { AttendanceGrid } from "@/components/attendance-grid";
import { saveAttendance } from "@/app/actions";

export const metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; date?: string; saved?: string }>;
}) {
  const { user, school } = await requireUserWithSchool(["principal"]);
  const sp = await searchParams;
  const day = sp.date ?? todayISO();

  const orderKey = (g: string) => (g === "LKG" ? -2 : g === "UKG" ? -1 : parseInt(g, 10) || 0);
  const classes = (await db.classRoom.findMany({ where: { schoolId: school.id } })).sort(
    (a, b) => orderKey(a.grade) - orderKey(b.grade) || a.section.localeCompare(b.section)
  );
  const selected = classes.find((c) => c.id === sp.class) ?? classes[0];

  const [students, existing] = await Promise.all([
    db.student.findMany({ where: { classRoomId: selected.id, active: true }, orderBy: { name: "asc" } }),
    db.attendanceRecord.findMany({ where: { classRoomId: selected.id, date: toUTCDate(day) } }),
  ]);
  const initial: Record<string, "present" | "absent" | "leave"> = {};
  for (const r of existing) initial[r.studentId] = r.status as "present" | "absent" | "leave";

  const dateLine = new Date(day + "T12:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });

  return (
    <Shell role={user.role} active="/attendance" userName={user.name}>
      {sp.saved !== undefined && (
        <Flash>
          Register saved{Number(sp.saved) > 0 ? ` · ${sp.saved} parent${Number(sp.saved) > 1 ? "s" : ""} alerted on WhatsApp` : " · full house"}
        </Flash>
      )}
      <h1>
        Register<small>{dateLine}{existing.length > 0 ? " · editing saved register" : ""}</small>
      </h1>
      <div className="classpick">
        {classes.map((c) => (
          <Link
            key={c.id}
            href={`/attendance?class=${c.id}&date=${day}`}
            aria-current={selected.id === c.id ? "true" : undefined}
          >
            {c.grade}-{c.section}
          </Link>
        ))}
      </div>
      <AttendanceGrid
        key={`${selected.id}-${day}`}
        students={students.map((s) => ({ id: s.id, name: s.name }))}
        initial={initial}
        classRoomId={selected.id}
        date={day}
        action={saveAttendance}
      />
    </Shell>
  );
}
