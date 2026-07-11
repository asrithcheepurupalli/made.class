import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell, PageTitle, Card, inputCls } from "@/components/shell";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const school = await db.school.findFirst();
  if (!school) return null;
  const { q } = await searchParams;

  const students = await db.student.findMany({
    where: {
      active: true,
      ...(q ? { name: { contains: q } } : {}),
    },
    include: { classRoom: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  return (
    <Shell schoolName={school.name} userName={user.name}>
      <PageTitle title="Students" subtitle={`${students.length} shown`} />
      <form className="mb-4">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name…"
          className={inputCls + " max-w-sm"}
        />
      </form>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="py-2 pr-3">Adm. No</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Class</th>
                <th className="py-2 pr-3">Guardian</th>
                <th className="py-2">Phone</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3 text-stone-500">{s.admissionNo}</td>
                  <td className="py-2 pr-3 font-medium">{s.name}</td>
                  <td className="py-2 pr-3">
                    <Link href={`/classes/${s.classRoomId}`} className="text-emerald-700 hover:underline">
                      {s.classRoom.grade}-{s.classRoom.section}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">{s.guardianName ?? "—"}</td>
                  <td className="py-2">{s.guardianPhone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Shell>
  );
}
