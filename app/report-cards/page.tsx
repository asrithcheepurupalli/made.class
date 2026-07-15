import { db } from "@/lib/db";
import { requireUserWithSchool } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { PrintButton } from "@/components/print-button";
import { cbseGrade, gradeRemark } from "@/lib/grades";

export const metadata = { title: "Report cards" };
export const dynamic = "force-dynamic";

export default async function ReportCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string; class?: string }>;
}) {
  const { user, school: userSchool } = await requireUserWithSchool(["principal", "teacher"]);
  const sp = await searchParams;

  const classRoomId = user.role === "teacher" ? user.classRoomId : sp.class;
  if (!classRoomId) {
    return (
      <Shell role={user.role} active={user.role === "teacher" ? "/marks" : "/exams"} userName={user.name}>
        <h1>Report cards</h1>
        <p style={{ color: "var(--muted)" }}>Pick an exam and class from the Exams screen first.</p>
      </Shell>
    );
  }

  const school = userSchool;
  const [exams, classRoom, subjects, students] = await Promise.all([
    db.exam.findMany({ where: { schoolId: school.id }, orderBy: { heldOn: "desc" } }),
    db.classRoom.findUnique({ where: { id: classRoomId } }),
    db.subject.findMany({ where: { schoolId: school.id }, orderBy: { order: "asc" } }),
    db.student.findMany({ where: { classRoomId, active: true }, orderBy: { name: "asc" } }),
  ]);
  const exam = exams.find((e) => e.id === sp.exam) ?? exams[0];
  if (!school || !exam || !classRoom) return null;

  const [marks, attendance] = await Promise.all([
    db.mark.findMany({ where: { examId: exam.id, studentId: { in: students.map((s) => s.id) } } }),
    db.attendanceRecord.groupBy({
      by: ["studentId", "status"],
      where: { studentId: { in: students.map((s) => s.id) } },
      _count: true,
    }),
  ]);
  const scoreBy = new Map<string, number>();
  for (const m of marks) scoreBy.set(`${m.studentId}_${m.subjectId}`, m.score);
  const attBy = new Map<string, { present: number; total: number }>();
  for (const a of attendance) {
    const cur = attBy.get(a.studentId) ?? { present: 0, total: 0 };
    cur.total += a._count;
    if (a.status === "present") cur.present += a._count;
    attBy.set(a.studentId, cur);
  }

  const withMarks = students.filter((s) => subjects.some((sub) => scoreBy.has(`${s.id}_${sub.id}`)));

  return (
    <Shell role={user.role} active={user.role === "teacher" ? "/marks" : "/exams"} userName={user.name}>
      <div className="noprint" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
        <h1>
          Report cards
          <small>
            {exam.name} · Class {classRoom.grade}-{classRoom.section} · {withMarks.length} students
          </small>
        </h1>
        <PrintButton label={`Print ${withMarks.length} report cards`} />
      </div>

      {withMarks.length === 0 && (
        <p className="noprint" style={{ color: "var(--muted)" }}>
          No marks entered for this exam and class yet.
        </p>
      )}

      {withMarks.map((s) => {
        const rows = subjects.map((sub) => ({
          name: sub.name,
          score: scoreBy.get(`${s.id}_${sub.id}`),
        }));
        const scored = rows.filter((r) => r.score !== undefined) as { name: string; score: number }[];
        const total = scored.reduce((sum, r) => sum + r.score, 0);
        const pct = scored.length ? Math.round((total / (scored.length * exam.maxMarks)) * 100) : 0;
        const att = attBy.get(s.id);
        return (
          <div className="rc" key={s.id}>
            <div className="rc-head">
              <div className="rc-school">
                {school.name}
              </div>
              <div className="rc-sub">{school.address}</div>
              <div className="rc-title">Progress report · {exam.name} · Academic year 2026–27</div>
            </div>
            <div className="rc-meta">
              <span><b>Name:</b> {s.name}</span>
              <span><b>Class:</b> {classRoom.grade}-{classRoom.section}</span>
              <span><b>Adm. no:</b> {s.admissionNo}</span>
              <span><b>Guardian:</b> {s.guardianName ?? "—"}</span>
              {att && att.total > 0 && (
                <span><b>Attendance:</b> {att.present}/{att.total} days ({Math.round((att.present / att.total) * 100)}%)</span>
              )}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th style={{ textAlign: "right" }}>Max</th>
                  <th style={{ textAlign: "right" }}>Marks</th>
                  <th style={{ textAlign: "right" }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td style={{ textAlign: "right" }}>{exam.maxMarks}</td>
                    <td style={{ textAlign: "right" }}>{r.score ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      {r.score !== undefined ? cbseGrade((r.score / exam.maxMarks) * 100) : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="tot">
                  <td>Total</td>
                  <td style={{ textAlign: "right" }}>{scored.length * exam.maxMarks}</td>
                  <td style={{ textAlign: "right" }}>{total}</td>
                  <td style={{ textAlign: "right" }}>{cbseGrade(pct)} · {pct}%</td>
                </tr>
              </tbody>
            </table>
            <p className="rc-remark">
              <b>Remark:</b> {gradeRemark(pct)}
            </p>
            <div className="rc-foot">
              <div className="sig">Class teacher</div>
              <div className="sig">Principal</div>
              <div className="sig">Parent / Guardian</div>
            </div>
          </div>
        );
      })}
    </Shell>
  );
}
