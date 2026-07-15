import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// UDISE+/SDMS-shaped student master export: the same columns a school clerk
// re-types into the government portal, generated from data entered once.
export async function GET() {
  const userId = await currentUserId();
  const user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;
  if (!user || user.role !== "principal") {
    return NextResponse.json({ error: "Sign in as principal to export" }, { status: 403 });
  }

  const students = await db.student.findMany({
    where: { active: true, ...(user.schoolId ? { schoolId: user.schoolId } : {}) },
    include: { classRoom: true },
    orderBy: [{ classRoomId: "asc" }, { name: "asc" }],
  });

  const esc = (v: string | null | undefined) => {
    const s = v ?? "";
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [
    "AdmissionNo", "PEN", "APAAR_ID", "StudentName", "Gender", "DOB",
    "Class", "Section", "GuardianName", "GuardianMobile", "MediumOfInstruction",
  ].join(",");
  const rows = students.map((s) =>
    [
      s.admissionNo, "", "", esc(s.name), s.gender ?? "",
      s.dateOfBirth ? s.dateOfBirth.toISOString().slice(0, 10) : "",
      s.classRoom.grade, s.classRoom.section,
      esc(s.guardianName), esc(s.guardianPhone),
      s.language === "hi" ? "Hindi" : "English",
    ].join(",")
  );

  return new NextResponse([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="student-master-udise.csv"`,
    },
  });
}
