import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const firstNames = [
  "Aarav", "Diya", "Vihaan", "Ananya", "Arjun", "Ishita", "Kabir", "Meera",
  "Rohan", "Sanya", "Aditya", "Priya", "Dev", "Kavya", "Ayaan", "Riya",
];
const lastNames = ["Sharma", "Patel", "Reddy", "Gupta", "Khan", "Verma", "Naidu", "Iyer"];

async function main() {
  const existing = await db.school.findFirst();
  if (existing) {
    console.log("Already seeded; skipping.");
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

  await db.user.create({
    data: {
      email: "admin@demo.school",
      name: "Principal Lakshmi",
      passwordHash: hashPassword("admin123"),
      role: "admin",
    },
  });

  const tuition = await db.feeHead.create({
    data: { schoolId: school.id, name: "Tuition Fee Term 1" },
  });
  const transport = await db.feeHead.create({
    data: { schoolId: school.id, name: "Transport Q2" },
  });

  let admission = 1000;
  for (const grade of ["6", "7", "8"]) {
    const classRoom = await db.classRoom.create({
      data: { schoolId: school.id, grade, section: "A" },
    });
    for (let i = 0; i < 12; i++) {
      admission++;
      const name = `${firstNames[(admission + i) % firstNames.length]} ${lastNames[(admission * 3 + i) % lastNames.length]}`;
      const guardian = `${firstNames[(admission + i + 5) % firstNames.length]} ${name.split(" ")[1]}`;
      const student = await db.student.create({
        data: {
          schoolId: school.id,
          classRoomId: classRoom.id,
          admissionNo: String(admission),
          name,
          guardianName: guardian,
          guardianPhone: `+9198${String(10000000 + admission * 137).slice(0, 8)}`,
          language: i % 3 === 0 ? "hi" : "en",
        },
      });

      // Term 1 tuition for everyone; some already paid, some overdue
      const invoice = await db.feeInvoice.create({
        data: {
          studentId: student.id,
          classRoomId: classRoom.id,
          feeHeadId: tuition.id,
          amount: 5500,
          dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
          status: i % 3 === 0 ? "paid" : "unpaid",
        },
      });
      if (i % 3 === 0) {
        await db.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: 5500,
            mode: i % 2 === 0 ? "upi" : "cash",
            reference: `SEED${admission}`,
          },
        });
      }

      // Transport for a third of students, due next week
      if (i % 3 === 1) {
        await db.feeInvoice.create({
          data: {
            studentId: student.id,
            classRoomId: classRoom.id,
            feeHeadId: transport.id,
            amount: 1800,
            dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          },
        });
      }
    }
  }

  console.log("Seeded: Sunrise Public School, 3 classes, 36 students, invoices.");
  console.log("Login: admin@demo.school / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
