import Link from "next/link";
import { db } from "@/lib/db";
import { requireUserWithSchool } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { Shell, Flash } from "@/components/shell";
import { MarksGrid } from "@/components/marks-grid";
import { createExam, saveMarks } from "@/app/actions";

export const metadata = { title: "Exams" };
export const dynamic = "force-dynamic";

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string; class?: string; saved?: string }>;
}) {
  const { user, school } = await requireUserWithSchool(["principal"]);
  const sp = await searchParams;

  const orderKey = (g: string) => (g === "LKG" ? -2 : g === "UKG" ? -1 : parseInt(g, 10) || 0);
  const [exams, classes, subjects] = await Promise.all([
    db.exam.findMany({ where: { schoolId: school.id }, orderBy: { heldOn: "desc" } }),
    db.classRoom.findMany({ where: { schoolId: school.id } }),
    db.subject.findMany({ where: { schoolId: school.id }, orderBy: { order: "asc" } }),
  ]);
  classes.sort((a, b) => orderKey(a.grade) - orderKey(b.grade) || a.section.localeCompare(b.section));

  const exam = exams.find((e) => e.id === sp.exam) ?? exams[0] ?? null;
  const selected = classes.find((c) => c.id === sp.class) ?? null;

  const students = selected
    ? await db.student.findMany({ where: { classRoomId: selected.id, active: true }, orderBy: { name: "asc" } })
    : [];
  const marks = exam && selected
    ? await db.mark.findMany({ where: { examId: exam.id, studentId: { in: students.map((s) => s.id) } } })
    : [];
  const existing: Record<string, number> = {};
  for (const m of marks) existing[`${m.studentId}_${m.subjectId}`] = m.score;

  return (
    <Shell role={user.role} active="/exams" userName={user.name}>
      {sp.saved && <Flash>{sp.saved} marks saved</Flash>}
      <h1>
        Exams
        <small>{exam ? `${exam.name} · max ${exam.maxMarks}` : "create the first exam"}</small>
      </h1>

      <div className="classpick" style={{ marginTop: 18 }}>
        {exams.map((e) => (
          <Link key={e.id} href={`/exams?exam=${e.id}${selected ? `&class=${selected.id}` : ""}`} aria-current={exam?.id === e.id ? "true" : undefined}>
            {e.name}
          </Link>
        ))}
      </div>

      <div className="sect fld" style={{ maxWidth: 560, marginTop: 6 }}>
        <details>
          <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: 13 }}>+ New exam</summary>
          <form action={createExam} style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: 160 }}>
              <label htmlFor="ename">Name</label>
              <input id="ename" name="name" placeholder="Half Yearly" required />
            </div>
            <div style={{ flex: 1, minWidth: 90 }}>
              <label htmlFor="emax">Max marks</label>
              <input id="emax" name="maxMarks" type="number" defaultValue={100} />
            </div>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label htmlFor="eheld">Held on</label>
              <input id="eheld" name="heldOn" type="date" defaultValue={todayISO()} />
            </div>
            <button className="btn quiet">Create</button>
          </form>
        </details>
      </div>

      {exam && (
        <>
          <div className="sect">
            <h2>
              Class
              {exam && selected && (
                <span className="more">
                  <Link href={`/report-cards?exam=${exam.id}&class=${selected.id}`} className="textbtn">
                    Report cards for {selected.grade}-{selected.section} →
                  </Link>
                </span>
              )}
            </h2>
            <div className="classpick" style={{ margin: 0 }}>
              {classes.map((c) => (
                <Link key={c.id} href={`/exams?exam=${exam.id}&class=${c.id}`} aria-current={selected?.id === c.id ? "true" : undefined}>
                  {c.grade}-{c.section}
                </Link>
              ))}
            </div>
          </div>

          {selected ? (
            <MarksGrid
              key={`${exam.id}-${selected.id}`}
              students={students.map((s) => ({ id: s.id, name: s.name }))}
              subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
              existing={existing}
              examId={exam.id}
              classRoomId={selected.id}
              maxMarks={exam.maxMarks}
              action={saveMarks}
            />
          ) : (
            <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 20 }}>Pick a class to enter or review marks.</p>
          )}
        </>
      )}
    </Shell>
  );
}
