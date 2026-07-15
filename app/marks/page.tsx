import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell, Flash } from "@/components/shell";
import { MarksGrid } from "@/components/marks-grid";
import { saveMarks } from "@/app/actions";

export const metadata = { title: "Marks" };
export const dynamic = "force-dynamic";

export default async function MarksPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string; saved?: string }>;
}) {
  const user = await requireUser(["teacher"]);
  const sp = await searchParams;
  if (!user.classRoomId) {
    return (
      <Shell role={user.role} active="/marks" userName={user.name}>
        <h1>No class assigned yet</h1>
      </Shell>
    );
  }

  const [exams, subjects, classRoom, students] = await Promise.all([
    db.exam.findMany({ orderBy: { heldOn: "desc" } }),
    db.subject.findMany({ orderBy: { order: "asc" } }),
    db.classRoom.findUnique({ where: { id: user.classRoomId } }),
    db.student.findMany({ where: { classRoomId: user.classRoomId, active: true }, orderBy: { name: "asc" } }),
  ]);
  const exam = exams.find((e) => e.id === sp.exam) ?? exams[0] ?? null;
  const marks = exam
    ? await db.mark.findMany({ where: { examId: exam.id, studentId: { in: students.map((s) => s.id) } } })
    : [];
  const existing: Record<string, number> = {};
  for (const m of marks) existing[`${m.studentId}_${m.subjectId}`] = m.score;

  return (
    <Shell role={user.role} active="/marks" userName={user.name}>
      {sp.saved && <Flash>{sp.saved} marks saved</Flash>}
      <h1>
        Marks · {classRoom?.grade}-{classRoom?.section}
        <small>{exam ? `${exam.name} · max ${exam.maxMarks}` : "no exams yet"}</small>
      </h1>
      <div className="classpick" style={{ marginTop: 18 }}>
        {exams.map((e) => (
          <Link key={e.id} href={`/marks?exam=${e.id}`} aria-current={exam?.id === e.id ? "true" : undefined}>
            {e.name}
          </Link>
        ))}
        {exam && (
          <Link href={`/report-cards?exam=${exam.id}&class=${user.classRoomId}`} className="textbtn" style={{ marginLeft: "auto" }}>
            Report cards →
          </Link>
        )}
      </div>
      {exam && (
        <MarksGrid
          key={exam.id}
          students={students.map((s) => ({ id: s.id, name: s.name }))}
          subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
          existing={existing}
          examId={exam.id}
          classRoomId={user.classRoomId}
          maxMarks={exam.maxMarks}
          action={saveMarks}
        />
      )}
    </Shell>
  );
}
