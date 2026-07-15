import type { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes, randomUUID } from "crypto";

// Idempotent demo seed, fast enough to run inside a serverless request:
// everything is batched with createMany using pre-generated ids, so a fresh
// database is populated in a handful of round trips. Called by prisma/seed.ts
// and lazily by the demo login, so a brand-new deploy works with zero setup.

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const FIRST = ["Aarav","Ananya","Arjun","Ayaan","Diya","Farhan","Ishita","Kabir","Kavya","Meera","Priya","Riya","Rohan","Sanya","Vihaan","Zoya","Advait","Anika","Dev","Esha","Imran","Jhanvi","Karthik","Lakshmi","Mohan","Nandini","Om","Pooja","Raghav","Sneha","Tanvi","Uday","Varsha","Yash"];
const LAST = ["Sharma","Patel","Reddy","Gupta","Khan","Verma","Naidu","Iyer","Shaikh","Das","Rao","Mehta","Kulkarni","Bose","Nair"];

const SUBJECTS = ["English", "Hindi", "Mathematics", "Science", "Social Science"];

// Adds subjects + a Unit Test with marks for every student. Safe to call on
// databases seeded before the exams module existed.
export async function ensureExamData(db: PrismaClient): Promise<boolean> {
  const school = await db.school.findFirst();
  if (!school) return false;
  if (await db.subject.findFirst()) return false;

  let seedState = 137;
  const rnd = () => {
    seedState = (seedState * 1103515245 + 12345) % 2147483648;
    return seedState / 2147483648;
  };

  const subjects = SUBJECTS.map((name, i) => ({ id: randomUUID(), schoolId: school.id, name, order: i }));
  await db.subject.createMany({ data: subjects });

  const heldOn = new Date();
  heldOn.setDate(heldOn.getDate() - 9);
  const exam = await db.exam.create({
    data: { schoolId: school.id, name: "Unit Test 1", maxMarks: 100, heldOn },
  });

  const students = await db.student.findMany({ where: { active: true }, select: { id: true } });
  const marks: { examId: string; studentId: string; subjectId: string; score: number }[] = [];
  for (const s of students) {
    // per-student ability band so report cards look human, not uniform noise
    const base = 40 + Math.floor(rnd() * 45);
    for (const sub of subjects) {
      const score = Math.max(18, Math.min(99, base + Math.floor(rnd() * 21) - 10));
      marks.push({ examId: exam.id, studentId: s.id, subjectId: sub.id, score });
    }
  }
  for (let i = 0; i < marks.length; i += 1000) {
    await db.mark.createMany({ data: marks.slice(i, i + 1000) });
  }
  return true;
}

export async function ensureDemoData(db: PrismaClient): Promise<boolean> {
  if (await db.school.findFirst()) {
    await ensureExamData(db); // upgrade older seeds in place
    return false;
  }

  let seedState = 42;
  const rnd = () => {
    seedState = (seedState * 1103515245 + 12345) % 2147483648;
    return seedState / 2147483648;
  };
  const daysAgo = (n: number, hour = 10, min = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(hour, min, 0, 0);
    return d;
  };
  const utcDay = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return new Date(d.toISOString().slice(0, 10) + "T00:00:00.000Z");
  };

  const school = await db.school.create({
    data: {
      name: "Sunrise Public School",
      address: "MG Road, Vijayawada, Andhra Pradesh",
      phone: "+91 866 246 8100",
      upiVpa: "sunrise.school@icici",
      upiPayee: "Sunrise Public School",
    },
  });

  const classSpec: Array<[string, string, number]> = [
    ["LKG", "A", 24], ["UKG", "A", 27], ["1", "A", 33], ["2", "A", 36],
    ["3", "A", 41], ["4", "A", 38], ["5", "A", 42], ["6", "A", 38],
    ["6", "B", 40], ["7", "A", 43], ["8", "A", 44], ["8", "B", 41],
  ];
  const classes = classSpec.map(([grade, section, size]) => ({
    id: randomUUID(), schoolId: school.id, grade, section, size,
  }));
  await db.classRoom.createMany({
    data: classes.map(({ id, schoolId, grade, section }) => ({ id, schoolId, grade, section })),
  });
  const class8B = classes[classes.length - 1];

  await db.user.createMany({
    data: [
      { email: "principal@sunrise.school", name: "Principal Lakshmi", passwordHash: hashPassword("demo123"), role: "principal" },
      { email: "teacher@sunrise.school", name: "Suresh sir", passwordHash: hashPassword("demo123"), role: "teacher", classRoomId: class8B.id },
      { email: "desk@sunrise.school", name: "Anita (front desk)", passwordHash: hashPassword("demo123"), role: "desk" },
    ],
  });

  const tuitionId = randomUUID();
  const transportId = randomUUID();
  await db.feeHead.createMany({
    data: [
      { id: tuitionId, schoolId: school.id, name: "Tuition Term 1" },
      { id: transportId, schoolId: school.id, name: "Transport Q2" },
    ],
  });

  // students
  let admission = 1000;
  const students: { id: string; classRoomId: string; name: string; guardianName: string; guardianPhone: string; language: string }[] = [];
  for (const c of classes) {
    for (let i = 0; i < c.size; i++) {
      admission++;
      const ln = LAST[Math.floor(rnd() * LAST.length)];
      students.push({
        id: randomUUID(),
        classRoomId: c.id,
        name: `${FIRST[Math.floor(rnd() * FIRST.length)]} ${ln}`,
        guardianName: `${FIRST[Math.floor(rnd() * FIRST.length)]} ${ln}`,
        guardianPhone: `+9198${String(10000000 + Math.floor(rnd() * 89999999)).slice(0, 8)}`,
        language: rnd() < 0.35 ? "hi" : "en",
      });
    }
  }
  {
    let adm = 1000;
    const rows = students.map((s) => ({
      id: s.id, schoolId: school.id, classRoomId: s.classRoomId, admissionNo: String(++adm),
      name: s.name, guardianName: s.guardianName, guardianPhone: s.guardianPhone, language: s.language,
    }));
    for (let i = 0; i < rows.length; i += 250) await db.student.createMany({ data: rows.slice(i, i + 250) });
  }

  // attendance: past 12 weekdays for all; today for all except 8-B
  const pastDays: Date[] = [];
  for (let off = 1; pastDays.length < 12; off++) {
    const d = utcDay(-off);
    const dow = new Date(d).getUTCDay();
    if (dow !== 0 && dow !== 6) pastDays.push(d);
  }
  const attRows: { studentId: string; classRoomId: string; date: Date; status: string }[] = [];
  for (const s of students) {
    for (const d of pastDays) {
      const r = rnd();
      attRows.push({ studentId: s.id, classRoomId: s.classRoomId, date: d, status: r < 0.92 ? "present" : r < 0.985 ? "absent" : "leave" });
    }
    if (s.classRoomId !== class8B.id) {
      const r = rnd();
      attRows.push({ studentId: s.id, classRoomId: s.classRoomId, date: utcDay(0), status: r < 0.91 ? "present" : r < 0.98 ? "absent" : "leave" });
    }
  }
  for (let i = 0; i < attRows.length; i += 1000) {
    await db.attendanceRecord.createMany({ data: attRows.slice(i, i + 1000) });
  }

  // invoices + payments + receipts (batched with pre-generated ids)
  const invoices: { id: string; studentId: string; classRoomId: string; feeHeadId: string; amount: number; dueDate: Date; status: string }[] = [];
  const payments: { invoiceId: string; amount: number; mode: string; reference: string; paidAt: Date }[] = [];
  const receipts: { toPhone: string; toName: string; template: string; body: string; status: string; createdAt: Date; sentAt: Date }[] = [];
  let paidToday = 0;
  for (const s of students) {
    const roll = rnd();
    const status = roll < 0.62 ? "paid" : roll < 0.7 ? "partial" : "unpaid";
    const invId = randomUUID();
    invoices.push({ id: invId, studentId: s.id, classRoomId: s.classRoomId, feeHeadId: tuitionId, amount: 5500, dueDate: utcDay(-30), status });
    if (status !== "unpaid") {
      const amount = status === "paid" ? 5500 : 2500;
      const today = paidToday < 5 && rnd() < 0.05;
      if (today) paidToday++;
      const paidAt = today
        ? daysAgo(0, 9 + Math.floor(rnd() * 3), Math.floor(rnd() * 59))
        : daysAgo(1 + Math.floor(rnd() * 25), 10, Math.floor(rnd() * 59));
      payments.push({ invoiceId: invId, amount, mode: rnd() < 0.78 ? "upi" : "cash", reference: `UPI${100000 + Math.floor(rnd() * 899999)}`, paidAt });
      receipts.push({
        toPhone: s.guardianPhone, toName: s.guardianName, template: "receipt",
        body: `Received ₹${amount.toLocaleString("en-IN")} for "Tuition Term 1" (${s.name}). Thank you! - Sunrise Public School`,
        status: "sent", createdAt: paidAt, sentAt: paidAt,
      });
    }
    if (rnd() < 0.3) {
      invoices.push({ id: randomUUID(), studentId: s.id, classRoomId: s.classRoomId, feeHeadId: transportId, amount: 1800, dueDate: utcDay(7), status: "unpaid" });
    }
  }
  for (let i = 0; i < invoices.length; i += 250) await db.feeInvoice.createMany({ data: invoices.slice(i, i + 250) });
  for (let i = 0; i < payments.length; i += 250) await db.payment.createMany({ data: payments.slice(i, i + 250) });
  for (let i = 0; i < receipts.length; i += 250) await db.outboxMessage.createMany({ data: receipts.slice(i, i + 250) });

  await db.notice.createMany({
    data: [
      { schoolId: school.id, title: "School reopens after Bakrid", body: "Classes resume Tuesday at the regular time. Transport runs as usual.", audience: "all", createdAt: daysAgo(3) },
      { schoolId: school.id, title: "Unit test timetable — Class 8", body: "Unit tests begin Monday. Timetable shared with class teachers.", audience: `class:${class8B.id}`, createdAt: daysAgo(7) },
      { schoolId: school.id, title: "Fee due date extended", body: "Term 1 tuition due date extended by ten days for all classes.", audience: "all", createdAt: daysAgo(30) },
    ],
  });

  await ensureExamData(db);
  return true;
}
