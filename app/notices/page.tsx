import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { publishNotice } from "@/app/actions";

export const metadata = { title: "Notices" };
export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const user = await requireUser(["principal"]);
  const orderKey = (g: string) => (g === "LKG" ? -2 : g === "UKG" ? -1 : parseInt(g, 10) || 0);
  const [notices, classes, guardianCount] = await Promise.all([
    db.notice.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    db.classRoom.findMany(),
    db.student.count({ where: { active: true, guardianPhone: { not: null } } }),
  ]);
  classes.sort((a, b) => orderKey(a.grade) - orderKey(b.grade) || a.section.localeCompare(b.section));
  const classById = new Map(classes.map((c) => [c.id, `${c.grade}-${c.section}`]));

  return (
    <Shell role={user.role} active="/notices" userName={user.name}>
      <h1>
        Notices<small>every guardian gets it on WhatsApp — no app to install</small>
      </h1>
      <div className="sect fld" style={{ maxWidth: "52ch", marginTop: 10 }}>
        <form action={publishNotice}>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" required placeholder="PTM on Saturday" />
          <label htmlFor="body">Message</label>
          <textarea id="body" name="body" rows={3} required placeholder="Saturday, 10 am – 1 pm. Report cards will be given to parents." />
          <label htmlFor="aud">Audience</label>
          <select id="aud" name="classRoomId" defaultValue="all">
            <option value="all">Whole school · {guardianCount} guardians</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                Class {c.grade}-{c.section}
              </option>
            ))}
          </select>
          <div style={{ marginTop: 22 }}>
            <button className="btn">Publish to WhatsApp</button>
          </div>
        </form>
      </div>
      <div className="sect">
        <h2>Earlier</h2>
        <div>
          {notices.map((n) => (
            <div className="li" key={n.id}>
              <span className="av" style={{ background: "var(--av3)" }}>📢</span>
              <span className="who">
                <b>{n.title}</b>{" "}
                <span className="dim">
                  · {n.audience === "all" ? "whole school" : `class ${classById.get(n.audience.replace("class:", "")) ?? "?"}`}
                  {" · "}{n.body.slice(0, 60)}
                </span>
              </span>
              <span className="when">
                {n.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
