import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell, PageTitle, Card, inputCls, btnCls } from "@/components/shell";
import { createStudent, importStudentsCSV } from "@/app/actions";

export default async function ClassDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const school = await db.school.findFirst();
  if (!school) return null;
  const { id } = await params;

  const classRoom = await db.classRoom.findUnique({
    where: { id },
    include: {
      students: { where: { active: true }, orderBy: { name: "asc" } },
    },
  });
  if (!classRoom) notFound();

  return (
    <Shell schoolName={school.name} userName={user.name}>
      <PageTitle
        title={`Class ${classRoom.grade}-${classRoom.section}`}
        subtitle={`${classRoom.students.length} students`}
        action={
          <Link
            href={`/attendance?class=${classRoom.id}`}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Mark attendance
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            {classRoom.students.length === 0 ? (
              <p className="text-sm text-stone-500">No students yet — add or import.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                      <th className="py-2 pr-3">Adm. No</th>
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Guardian</th>
                      <th className="py-2">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classRoom.students.map((s) => (
                      <tr key={s.id} className="border-b border-stone-100">
                        <td className="py-2 pr-3 text-stone-500">{s.admissionNo}</td>
                        <td className="py-2 pr-3 font-medium">{s.name}</td>
                        <td className="py-2 pr-3">{s.guardianName ?? "—"}</td>
                        <td className="py-2">{s.guardianPhone ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-700">Add student</h2>
            <form action={createStudent} className="space-y-2">
              <input type="hidden" name="classRoomId" value={classRoom.id} />
              <input name="admissionNo" placeholder="Admission no" className={inputCls} required />
              <input name="name" placeholder="Student name" className={inputCls} required />
              <input name="guardianName" placeholder="Guardian name" className={inputCls} />
              <input name="guardianPhone" placeholder="Guardian phone (WhatsApp)" className={inputCls} />
              <select name="language" className={inputCls} defaultValue="en">
                <option value="en">Messages in English</option>
                <option value="hi">Messages in Hindi</option>
              </select>
              <button className={btnCls}>Add student</button>
            </form>
          </Card>
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-stone-700">Import CSV</h2>
            <p className="mb-2 text-xs text-stone-500">
              One per line: admissionNo, name, guardianName, guardianPhone, language(en/hi)
            </p>
            <form action={importStudentsCSV} className="space-y-2">
              <input type="hidden" name="classRoomId" value={classRoom.id} />
              <textarea
                name="csv"
                rows={5}
                placeholder={"101,Aarav Sharma,Rakesh Sharma,+919812345678,hi\n102,Diya Patel,Meena Patel,+919876543210,en"}
                className={inputCls + " font-mono text-xs"}
              />
              <button className={btnCls}>Import</button>
            </form>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
