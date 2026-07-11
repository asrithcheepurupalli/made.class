import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell, PageTitle, Card, inputCls, btnCls } from "@/components/shell";
import { publishNotice } from "@/app/actions";
import { dateHuman } from "@/lib/format";

export default async function NoticesPage() {
  const user = await requireUser();
  const school = await db.school.findFirst();
  if (!school) return null;

  const [notices, classes] = await Promise.all([
    db.notice.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    db.classRoom.findMany({ orderBy: [{ grade: "asc" }, { section: "asc" }] }),
  ]);
  const classById = new Map(classes.map((c) => [c.id, `${c.grade}-${c.section}`]));

  return (
    <Shell schoolName={school.name} userName={user.name}>
      <PageTitle
        title="Notices"
        subtitle="Published notices go straight to guardians on WhatsApp — no app for parents to install"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-700">New notice</h2>
          <form action={publishNotice} className="space-y-2">
            <input name="title" placeholder="Title" className={inputCls} required />
            <textarea name="body" rows={4} placeholder="Message to parents…" className={inputCls} required />
            <select name="classRoomId" className={inputCls} defaultValue="all">
              <option value="all">Whole school</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>Class {c.grade}-{c.section}</option>
              ))}
            </select>
            <button className={btnCls}>Publish &amp; queue WhatsApp</button>
          </form>
        </Card>
        <div className="space-y-3 lg:col-span-2">
          {notices.length === 0 ? (
            <Card><p className="text-sm text-stone-500">No notices yet.</p></Card>
          ) : (
            notices.map((n) => (
              <Card key={n.id}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{n.title}</h3>
                  <span className="shrink-0 text-xs text-stone-400">{dateHuman(n.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{n.body}</p>
                <div className="mt-2 text-xs text-stone-400">
                  Audience:{" "}
                  {n.audience === "all"
                    ? "Whole school"
                    : `Class ${classById.get(n.audience.replace("class:", "")) ?? "?"}`}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Shell>
  );
}
