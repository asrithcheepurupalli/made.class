import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell, PageTitle, Card, inputCls, btnCls } from "@/components/shell";
import { createClass } from "@/app/actions";

export default async function ClassesPage() {
  const user = await requireUser();
  const school = await db.school.findFirst();
  if (!school) return null;

  const classes = await db.classRoom.findMany({
    orderBy: [{ grade: "asc" }, { section: "asc" }],
    include: { _count: { select: { students: { where: { active: true } } } } },
  });

  return (
    <Shell schoolName={school.name} userName={user.name}>
      <PageTitle title="Classes" subtitle="Grades and sections" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {classes.length === 0 ? (
            <Card><p className="text-sm text-stone-500">No classes yet — add one.</p></Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {classes.map((c) => (
                <Link
                  key={c.id}
                  href={`/classes/${c.id}`}
                  className="rounded-lg border border-stone-200 bg-white p-4 hover:border-emerald-400"
                >
                  <div className="text-lg font-bold">
                    {c.grade}-{c.section}
                  </div>
                  <div className="text-xs text-stone-500">{c._count.students} students</div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-700">Add class</h2>
          <form action={createClass} className="space-y-2">
            <input name="grade" placeholder="Grade (e.g. 6, LKG)" className={inputCls} required />
            <input name="section" placeholder="Section (e.g. A)" className={inputCls} />
            <button className={btnCls}>Add class</button>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
