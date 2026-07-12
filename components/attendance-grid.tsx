"use client";

import { useMemo, useState } from "react";

type Status = "present" | "absent" | "leave";
const ORDER: Status[] = ["present", "absent", "leave"];

export function AttendanceGrid({
  students,
  initial,
  classRoomId,
  date,
  action,
}: {
  students: { id: string; name: string }[];
  initial: Record<string, Status>;
  classRoomId: string;
  date: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [statuses, setStatuses] = useState<Record<string, Status>>(() => {
    const s: Record<string, Status> = {};
    for (const st of students) s[st.id] = initial[st.id] ?? "present";
    return s;
  });

  const counts = useMemo(() => {
    let p = 0, a = 0, l = 0;
    for (const st of students) {
      const s = statuses[st.id];
      if (s === "absent") a++;
      else if (s === "leave") l++;
      else p++;
    }
    return { p, a, l };
  }, [statuses, students]);

  function cycle(id: string) {
    setStatuses((prev) => ({
      ...prev,
      [id]: ORDER[(ORDER.indexOf(prev[id]) + 1) % ORDER.length],
    }));
  }

  return (
    <form action={action}>
      <input type="hidden" name="classRoomId" value={classRoomId} />
      <input type="hidden" name="date" value={date} />
      {students.map((s) => (
        <input key={s.id} type="hidden" name={`status_${s.id}`} value={statuses[s.id]} />
      ))}
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "16px 0 0" }}>
        {counts.p} present
        {counts.a > 0 && <span style={{ color: "var(--red)" }}> · {counts.a} absent</span>}
        {counts.l > 0 && <span style={{ color: "var(--amber)" }}> · {counts.l} leave</span>}
        <span style={{ color: "var(--faint)" }}> — tap a name to cycle present → absent → leave</span>
      </p>
      <div className="pillgrid">
        {students.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`spill ${statuses[s.id]}`}
            onClick={() => cycle(s.id)}
            aria-label={`${s.name}: ${statuses[s.id]}`}
          >
            <span className="d" />
            <span className="nm">{s.name}</span>
          </button>
        ))}
      </div>
      <div className="savebar">
        <button className="btn" type="submit">
          Save register{counts.a > 0 ? ` · alert ${counts.a} parent${counts.a > 1 ? "s" : ""}` : ""}
        </button>
      </div>
    </form>
  );
}
