"use client";

// Marks entry grid: students × subjects, keyboard-friendly number inputs.
export function MarksGrid({
  students,
  subjects,
  existing,
  examId,
  classRoomId,
  maxMarks,
  action,
}: {
  students: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  existing: Record<string, number>; // `${studentId}_${subjectId}` -> score
  examId: string;
  classRoomId: string;
  maxMarks: number;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="classRoomId" value={classRoomId} />
      <div style={{ overflowX: "auto", marginTop: 14 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13.5 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 10px 8px 0", color: "var(--faint)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid var(--line2)" }}>
                Student
              </th>
              {subjects.map((s) => (
                <th key={s.id} style={{ textAlign: "center", padding: 8, color: "var(--faint)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid var(--line2)", whiteSpace: "nowrap" }}>
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((st) => (
              <tr key={st.id}>
                <td style={{ padding: "7px 10px 7px 0", borderBottom: "1px solid var(--line)", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {st.name}
                </td>
                {subjects.map((sub) => (
                  <td key={sub.id} style={{ padding: 4, borderBottom: "1px solid var(--line)", textAlign: "center" }}>
                    <input
                      name={`mark_${st.id}_${sub.id}`}
                      type="number"
                      min={0}
                      max={maxMarks}
                      defaultValue={existing[`${st.id}_${sub.id}`] ?? ""}
                      aria-label={`${st.name} — ${sub.name}`}
                      style={{
                        width: 64, textAlign: "center", border: "1px solid var(--line2)",
                        borderRadius: 8, background: "var(--surface, transparent)", color: "var(--ink)",
                        padding: "6px 4px", font: "inherit", fontVariantNumeric: "tabular-nums",
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="savebar">
        <button className="btn" type="submit">Save marks · {students.length} students</button>
      </div>
    </form>
  );
}
