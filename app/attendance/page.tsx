import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell, PageTitle, Card, btnCls } from "@/components/shell";
import { saveAttendance } from "@/app/actions";
import { toUTCDate, todayISO } from "@/lib/format";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; date?: string; saved?: string }>;
}) {
  const user = await requireUser();
  const school = await db.school.findFirst();
  if (!school) return null;
  const sp = await searchParams;
  const day = sp.date ?? todayISO();

  const classes = await db.classRoom.findMany({
    orderBy: [{ grade: "asc" }, { section: "asc" }],
  });
  const selected = sp.class
    ? classes.find((c) => c.id === sp.class) ?? null
    : null;

  const students = selected
    ? await db.student.findMany({
        where: { classRoomId: selected.id, active: true },
        orderBy: { name: "asc" },
      })
    : [];

  const existing = selected
    ? await db.attendanceRecord.findMany({
        where: { classRoomId: selected.id, date: toUTCDate(day) },
      })
    : [];
  const statusByStudent = new Map(existing.map((r) => [r.studentId, r.status]));

  return (
    <Shell schoolName={school.name} userName={user.name}>
      <PageTitle title="Attendance" subtitle="Mark once — register, alerts and reports follow" />

      {sp.saved && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          Attendance saved. Absence alerts queued to the outbox for guardians of absent students.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {classes.map((c) => (
          <Link
            key={c.id}
            href={`/attendance?class=${c.id}&date=${day}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              selected?.id === c.id
                ? "bg-emerald-600 text-white"
                : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            {c.grade}-{c.section}
          </Link>
        ))}
      </div>

      {!selected ? (
        <Card>
          <p className="text-sm text-stone-500">Pick a class to mark attendance.</p>
        </Card>
      ) : (
        <Card>
          <form action={saveAttendance}>
            <input type="hidden" name="classRoomId" value={selected.id} />
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <input
                type="date"
                name="date"
                defaultValue={day}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              />
              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input type="checkbox" name="alertAbsent" defaultChecked className="accent-emerald-600" />
                WhatsApp guardians of absentees
              </label>
            </div>
            <div className="divide-y divide-stone-100">
              {students.map((s) => {
                const current = statusByStudent.get(s.id) ?? "present";
                return (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.name}</div>
                      <div className="text-xs text-stone-400">{s.admissionNo}</div>
                    </div>
                    <div className="flex gap-1">
                      {(
                        [
                          ["present", "has-checked:bg-emerald-600"],
                          ["absent", "has-checked:bg-red-500"],
                          ["leave", "has-checked:bg-amber-500"],
                        ] as const
                      ).map(([st, activeCls]) => (
                        <label
                          key={st}
                          className={`cursor-pointer rounded-md border border-stone-200 px-3 py-1.5 text-xs font-medium capitalize text-stone-600 has-checked:border-transparent has-checked:text-white ${activeCls}`}
                        >
                          <input
                            type="radio"
                            name={`status_${s.id}`}
                            value={st}
                            defaultChecked={current === st}
                            className="sr-only"
                          />
                          {st}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {students.length > 0 ? (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-stone-400">
                  {existing.length > 0 ? "Editing existing records for this date." : "Defaults to present — tap only the exceptions."}
                </p>
                <button className={btnCls}>Save attendance</button>
              </div>
            ) : (
              <p className="text-sm text-stone-500">No students in this class.</p>
            )}
          </form>
        </Card>
      )}
    </Shell>
  );
}
