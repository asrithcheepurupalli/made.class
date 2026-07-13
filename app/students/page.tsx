import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell, Avatar } from "@/components/shell";
import { createStudent, importStudentsCSV, createClass } from "@/app/actions";

export const metadata = { title: "Students" };
export const dynamic = "force-dynamic";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; q?: string }>;
}) {
  const user = await requireUser(["principal"]);
  const sp = await searchParams;
  const orderKey = (g: string) => (g === "LKG" ? -2 : g === "UKG" ? -1 : parseInt(g, 10) || 0);
  const classes = (await db.classRoom.findMany()).sort(
    (a, b) => orderKey(a.grade) - orderKey(b.grade) || a.section.localeCompare(b.section)
  );
  const selected = classes.find((c) => c.id === sp.class) ?? null;

  const students = await db.student.findMany({
    where: {
      active: true,
      ...(selected ? { classRoomId: selected.id } : {}),
      ...(sp.q ? { name: { contains: sp.q } } : {}),
    },
    include: { classRoom: true },
    orderBy: { name: "asc" },
    take: 100,
  });

  return (
    <Shell role={user.role} active="/students" userName={user.name}>
      <h1>Students<small>{students.length} shown</small></h1>

      <div className="classpick">
        <Link href="/students" aria-current={!selected ? "true" : undefined}>All</Link>
        {classes.map((c) => (
          <Link key={c.id} href={`/students?class=${c.id}`} aria-current={selected?.id === c.id ? "true" : undefined}>
            {c.grade}-{c.section}
          </Link>
        ))}
      </div>

      <div className="sect" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 34 }}>
        <div>
          <form method="get" className="fld" style={{ maxWidth: 320, marginBottom: 8 }}>
            {selected && <input type="hidden" name="class" value={selected.id} />}
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name…" />
          </form>
          {students.map((s) => (
            <div className="li" key={s.id}>
              <Avatar name={s.name} />
              <span className="who">
                <b>{s.name}</b>{" "}
                <span className="dim">
                  · {s.classRoom.grade}-{s.classRoom.section} · Adm {s.admissionNo}
                  {s.guardianName ? ` · ${s.guardianName}` : ""}
                </span>
              </span>
              <span className={`tag ${s.guardianPhone ? "g" : "a"}`}>{s.guardianPhone ? "WhatsApp ✓" : "no phone"}</span>
            </div>
          ))}
        </div>

        <div className="fld">
          <h2 style={{ font: "600 11.5px/1 var(--font-plex)", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", margin: "0 0 4px" }}>
            Add student
          </h2>
          <form action={createStudent}>
            <label htmlFor="cls">Class</label>
            <select id="cls" name="classRoomId" defaultValue={selected?.id ?? classes[0]?.id}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.grade}-{c.section}</option>
              ))}
            </select>
            <label htmlFor="adm">Admission no</label>
            <input id="adm" name="admissionNo" required />
            <label htmlFor="nm">Name</label>
            <input id="nm" name="name" required />
            <label htmlFor="gn">Guardian name</label>
            <input id="gn" name="guardianName" />
            <label htmlFor="gp">Guardian phone (WhatsApp)</label>
            <input id="gp" name="guardianPhone" placeholder="+91…" />
            <label htmlFor="lang">Message language</label>
            <select id="lang" name="language" defaultValue="en">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
            <div style={{ marginTop: 18 }}>
              <button className="btn quiet">Add student</button>
            </div>
          </form>

          <h2 style={{ font: "600 11.5px/1 var(--font-plex)", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", margin: "34px 0 4px" }}>
            Import CSV
          </h2>
          <form action={importStudentsCSV}>
            <input type="hidden" name="classRoomId" value={selected?.id ?? classes[0]?.id} />
            <textarea
              name="csv"
              rows={4}
              placeholder={"admissionNo,name,guardianName,guardianPhone,language\n2001,Aarav Kumar,Rajesh Kumar,+919812345678,hi"}
              style={{ fontFamily: "monospace", fontSize: 12 }}
            />
            <div style={{ marginTop: 12 }}>
              <button className="btn quiet">Import into {selected ? `${selected.grade}-${selected.section}` : `${classes[0]?.grade}-${classes[0]?.section}`}</button>
            </div>
          </form>

          <h2 style={{ font: "600 11.5px/1 var(--font-plex)", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", margin: "34px 0 4px" }}>
            Add class
          </h2>
          <form action={createClass} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="grade">Grade</label>
              <input id="grade" name="grade" placeholder="9" required />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="section">Section</label>
              <input id="section" name="section" placeholder="A" />
            </div>
            <button className="btn quiet">Add</button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
