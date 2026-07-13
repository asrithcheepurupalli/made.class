import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const FIRST = ["Aarav","Ananya","Arjun","Ayaan","Diya","Farhan","Ishita","Kabir","Kavya","Meera","Priya","Riya","Rohan","Sanya","Vihaan","Zoya","Advait","Anika","Dev","Esha","Imran","Jhanvi","Karthik","Lakshmi","Mohan","Nandini","Om","Pooja","Raghav","Sneha","Tanvi","Uday","Varsha","Yash"];
const LAST = ["Sharma","Patel","Reddy","Gupta","Khan","Verma","Naidu","Iyer","Shaikh","Das","Rao","Mehta","Kulkarni","Bose","Nair"];

// Deterministic pseudo-random (stable demo numbers)
let seedState = 42;
function rnd() {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
}

function daysAgo(n: number, hour = 10, min = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, min, 0, 0);
  return d;
}
function utcDay(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return new Date(d.toISOString().slice(0, 10) + "T00:00:00.000Z");
}

async function main() {
  if (await db.school.findFirst()) {
    console.log("Already seeded; skipping. (Delete prisma/dev.db to reseed.)");
    return;
  }

  const school = await db.school.create({
    data: {
      name: "Sunrise Public School",
      address: "MG Road, Vijayawada, Andhra Pradesh",
      phone: "+91 866 246 8100",
      upiVpa: "sunrise.school@icici",
      upiPayee: "Sunrise Public School",
    },
  });

  // ----- classes -----
  const classSpec: Array<[string, string, number]> = [
    ["LKG", "A", 24], ["UKG", "A", 27], ["1", "A", 33], ["2", "A", 36],
    ["3", "A", 41], ["4", "A", 38], ["5", "A", 42], ["6", "A", 38],
    ["6", "B", 40], ["7", "A", 43], ["8", "A", 44], ["8", "B", 41],
  ];
  const classes: { id: string; grade: string; section: string; size: number }[] = [];
  for (const [grade, section, size] of classSpec) {
    const c = await db.classRoom.create({ data: { schoolId: school.id, grade, section } });
    classes.push({ id: c.id, grade, section, size });
  }
  const class8B = classes[classes.length - 1];

  // ----- users -----
  await db.user.createMany({
    data: [
      { email: "principal@sunrise.school", name: "Principal Lakshmi", passwordHash: hashPassword("demo123"), role: "principal" },
      { email: "teacher@sunrise.school", name: "Suresh sir", passwordHash: hashPassword("demo123"), role: "teacher", classRoomId: class8B.id },
      { email: "desk@sunrise.school", name: "Anita (front desk)", passwordHash: hashPassword("demo123"), role: "desk" },
    ],
  });

  // ----- fee heads -----
  const tuition = await db.feeHead.create({ data: { schoolId: school.id, name: "Tuition Term 1" } });
  const transport = await db.feeHead.create({ data: { schoolId: school.id, name: "Transport Q2" } });

  // ----- students -----
  let admission = 1000;
  const students: { id: string; classRoomId: string; name: string; guardianName: string | null; guardianPhone: string | null; language: string; idx: number }[] = [];
  for (const c of classes) {
    const rows = [];
    for (let i = 0; i < c.size; i++) {
      admission++;
      const fn = FIRST[Math.floor(rnd() * FIRST.length)];
      const ln = LAST[Math.floor(rnd() * LAST.length)];
      rows.push({
        schoolId: school.id,
        classRoomId: c.id,
        admissionNo: String(admission),
        name: `${fn} ${ln}`,
        guardianName: `${FIRST[Math.floor(rnd() * FIRST.length)]} ${ln}`,
        guardianPhone: `+9198${String(10000000 + Math.floor(rnd() * 89999999)).slice(0, 8)}`,
        language: rnd() < 0.35 ? "hi" : "en",
      });
    }
    await db.student.createMany({ data: rows });
  }
  const allStudents = await db.student.findMany();
  allStudents.forEach((s, i) => students.push({ id: s.id, classRoomId: s.classRoomId, name: s.name, guardianName: s.guardianName, guardianPhone: s.guardianPhone, language: s.language, idx: i }));

  // ----- attendance: past 12 weekdays complete; today all except 8-B -----
  const attRows: { studentId: string; classRoomId: string; date: Date; status: string }[] = [];
  const pastDays: Date[] = [];
  for (let off = 1; pastDays.length < 12; off++) {
    const d = utcDay(-off);
    const dow = new Date(d).getUTCDay();
    if (dow !== 0 && dow !== 6) pastDays.push(d);
  }
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
  // batch insert
  for (let i = 0; i < attRows.length; i += 1000) {
    await db.attendanceRecord.createMany({ data: attRows.slice(i, i + 1000) });
  }

  // ----- invoices & payments -----
  // Tuition ₹5,500 for everyone, due 30 days ago → mix of paid / partial / overdue
  const receiptOutbox: { toPhone: string; toName: string | null; template: string; body: string; status: string; createdAt: Date; sentAt: Date }[] = [];
  let paidToday = 0;
  for (const s of students) {
    const roll = rnd();
    const status = roll < 0.62 ? "paid" : roll < 0.7 ? "partial" : "unpaid";
    const inv = await db.feeInvoice.create({
      data: {
        studentId: s.id,
        classRoomId: s.classRoomId,
        feeHeadId: tuition.id,
        amount: 5500,
        dueDate: utcDay(-30),
        status,
      },
    });
    if (status !== "unpaid") {
      const amount = status === "paid" ? 5500 : 2500;
      // a handful of payments land today for the live dashboard
      const today = paidToday < 5 && rnd() < 0.05;
      if (today) paidToday++;
      const paidAt = today ? daysAgo(0, 9 + Math.floor(rnd() * 3), Math.floor(rnd() * 59)) : daysAgo(1 + Math.floor(rnd() * 25), 10, Math.floor(rnd() * 59));
      await db.payment.create({
        data: { invoiceId: inv.id, amount, mode: rnd() < 0.78 ? "upi" : "cash", reference: `UPI${100000 + Math.floor(rnd() * 899999)}`, paidAt },
      });
      if (s.guardianPhone) {
        receiptOutbox.push({
          toPhone: s.guardianPhone, toName: s.guardianName, template: "receipt",
          body: `Received ₹${amount.toLocaleString("en-IN")} for "Tuition Term 1" (${s.name}). Thank you! - Sunrise Public School`,
          status: "sent", createdAt: paidAt, sentAt: paidAt,
        });
      }
    }
    // Transport for ~30%, due next week
    if (rnd() < 0.3) {
      await db.feeInvoice.create({
        data: { studentId: s.id, classRoomId: s.classRoomId, feeHeadId: transport.id, amount: 1800, dueDate: utcDay(7), status: "unpaid" },
      });
    }
  }
  for (let i = 0; i < receiptOutbox.length; i += 500) {
    await db.outboxMessage.createMany({ data: receiptOutbox.slice(i, i + 500) });
  }

  // ----- notices -----
  await db.notice.createMany({
    data: [
      { schoolId: school.id, title: "School reopens after Bakrid", body: "Classes resume Tuesday at the regular time. Transport runs as usual.", audience: "all", createdAt: daysAgo(3) },
      { schoolId: school.id, title: "Unit test timetable — Class 8", body: "Unit tests begin Monday. Timetable shared with class teachers.", audience: `class:${class8B.id}`, createdAt: daysAgo(7) },
      { schoolId: school.id, title: "Fee due date extended", body: "Term 1 tuition due date extended by ten days for all classes.", audience: "all", createdAt: daysAgo(30) },
    ],
  });

  const counts = {
    students: await db.student.count(),
    invoices: await db.feeInvoice.count(),
    payments: await db.payment.count(),
    attendance: await db.attendanceRecord.count(),
  };
  console.log("Seeded Sunrise Public School:", counts);
  console.log("Logins (password demo123): principal@sunrise.school · teacher@sunrise.school · desk@sunrise.school");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
