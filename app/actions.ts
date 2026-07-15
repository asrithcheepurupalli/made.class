"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  requireUser,
  roleHome,
  verifyPassword,
} from "@/lib/auth";
import {
  queueMessage,
  queueMessages,
  templates,
  lang,
  drainOutboxDev,
} from "@/lib/messaging";
import { upiPayLink } from "@/lib/upi";
import { dateHuman, toUTCDate } from "@/lib/format";

// ---------- auth ----------

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email or password" };
  }
  await createSession(user.id);
  redirect(roleHome(user.role));
}

// Demo-only: one-click role login for showing the product. Remove for production.
// Self-healing: on a fresh database (new deploy, no seed run yet) the first
// click seeds the whole demo school before signing in.
export async function loginAsDemo(formData: FormData) {
  const role = String(formData.get("role") ?? "principal");
  const email =
    role === "teacher" ? "teacher@sunrise.school"
    : role === "desk" ? "desk@sunrise.school"
    : "principal@sunrise.school";
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    const { ensureDemoData } = await import("@/lib/demo-seed");
    await ensureDemoData(db);
    user = await db.user.findUnique({ where: { email } });
  }
  if (!user) redirect("/login");
  await createSession(user.id);
  redirect(roleHome(user.role));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ---------- school helpers ----------

async function getSchool() {
  const school = await db.school.findFirst();
  if (!school) throw new Error("No school configured — run the seed script");
  return school;
}

export async function updateSchoolSettings(formData: FormData) {
  await requireUser();
  const school = await getSchool();
  await db.school.update({
    where: { id: school.id },
    data: {
      name: String(formData.get("name") ?? school.name),
      address: String(formData.get("address") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      upiVpa: String(formData.get("upiVpa") ?? "") || null,
      upiPayee: String(formData.get("upiPayee") ?? "") || null,
    },
  });
  revalidatePath("/settings");
}

// ---------- classes & students ----------

export async function createClass(formData: FormData) {
  await requireUser();
  const school = await getSchool();
  const grade = String(formData.get("grade") ?? "").trim();
  const section = String(formData.get("section") ?? "").trim().toUpperCase() || "A";
  if (!grade) return;
  await db.classRoom.upsert({
    where: { schoolId_grade_section: { schoolId: school.id, grade, section } },
    create: { schoolId: school.id, grade, section },
    update: {},
  });
  revalidatePath("/classes");
}

export async function createStudent(formData: FormData) {
  await requireUser();
  const school = await getSchool();
  const classRoomId = String(formData.get("classRoomId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const admissionNo = String(formData.get("admissionNo") ?? "").trim();
  if (!name || !admissionNo || !classRoomId) return;
  await db.student.create({
    data: {
      schoolId: school.id,
      classRoomId,
      name,
      admissionNo,
      gender: String(formData.get("gender") ?? "") || null,
      guardianName: String(formData.get("guardianName") ?? "") || null,
      guardianPhone: String(formData.get("guardianPhone") ?? "") || null,
      language: String(formData.get("language") ?? "en"),
    },
  });
  revalidatePath(`/classes/${classRoomId}`);
  revalidatePath("/students");
}

// CSV columns: admissionNo,name,guardianName,guardianPhone,language
export async function importStudentsCSV(formData: FormData) {
  await requireUser();
  const school = await getSchool();
  const classRoomId = String(formData.get("classRoomId") ?? "");
  const csv = String(formData.get("csv") ?? "").trim();
  if (!classRoomId || !csv) return;
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  let imported = 0;
  for (const line of lines) {
    const [admissionNo, name, guardianName, guardianPhone, language] = line
      .split(",")
      .map((s) => s?.trim() ?? "");
    if (!admissionNo || !name || admissionNo.toLowerCase() === "admissionno") continue;
    await db.student.upsert({
      where: { schoolId_admissionNo: { schoolId: school.id, admissionNo } },
      create: {
        schoolId: school.id,
        classRoomId,
        admissionNo,
        name,
        guardianName: guardianName || null,
        guardianPhone: guardianPhone || null,
        language: language === "hi" ? "hi" : "en",
      },
      update: { classRoomId, name },
    });
    imported++;
  }
  revalidatePath(`/classes/${classRoomId}`);
  revalidatePath("/students");
  console.log(`Imported ${imported} students into class ${classRoomId}`);
}

// ---------- attendance ----------

export async function saveAttendance(formData: FormData) {
  const user = await requireUser();
  const school = await getSchool();
  const classRoomId = String(formData.get("classRoomId") ?? "");
  const day = String(formData.get("date") ?? "");
  const alertAbsent = formData.get("alertAbsent") !== "off";
  if (!classRoomId || !day) return;
  // teachers may only mark their own class
  if (user.role === "teacher" && user.classRoomId !== classRoomId) return;
  const date = toUTCDate(day);

  const students = await db.student.findMany({
    where: { classRoomId, active: true },
  });

  const absentees: typeof students = [];
  for (const s of students) {
    const status = String(formData.get(`status_${s.id}`) ?? "present");
    await db.attendanceRecord.upsert({
      where: { studentId_date: { studentId: s.id, date } },
      create: { studentId: s.id, classRoomId, date, status },
      update: { status },
    });
    if (status === "absent") absentees.push(s);
  }

  if (alertAbsent) {
    await queueMessages(
      absentees
        .filter((s) => s.guardianPhone)
        .map((s) => ({
          toPhone: s.guardianPhone!,
          toName: s.guardianName ?? undefined,
          template: "absence_alert" as const,
          body: templates.absence_alert[lang(s.language)]({
            student: s.name,
            date: dateHuman(date),
            school: school.name,
          }),
        }))
    );
  }

  const dest = user.role === "teacher" ? "/my-class" : "/attendance";
  revalidatePath(dest);
  redirect(`${dest}?class=${classRoomId}&date=${day}&saved=${absentees.length}`);
}

// Teacher: class diary entry → WhatsApp to their class's guardians
export async function publishDiary(formData: FormData) {
  const user = await requireUser(["teacher"]);
  const school = await getSchool();
  const body = String(formData.get("body") ?? "").trim();
  if (!body || !user.classRoomId) return;

  await db.notice.create({
    data: {
      schoolId: school.id,
      title: "Class diary",
      body,
      audience: `class:${user.classRoomId}`,
    },
  });
  const students = await db.student.findMany({
    where: { active: true, classRoomId: user.classRoomId, guardianPhone: { not: null } },
  });
  await queueMessages(
    students.map((s) => ({
      toPhone: s.guardianPhone!,
      toName: s.guardianName ?? undefined,
      template: "notice" as const,
      body: templates.notice[lang(s.language)]({ title: "Class diary", body, school: school.name }),
    }))
  );
  revalidatePath("/diary");
  redirect(`/diary?sent=${students.length}`);
}

// ---------- fees ----------

export async function createFeeHead(formData: FormData) {
  await requireUser();
  const school = await getSchool();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.feeHead.create({ data: { schoolId: school.id, name } });
  revalidatePath("/fees");
}

// Generate one invoice per active student of a class (or all classes).
export async function generateInvoices(formData: FormData) {
  await requireUser();
  const feeHeadId = String(formData.get("feeHeadId") ?? "");
  const classRoomId = String(formData.get("classRoomId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const dueDate = String(formData.get("dueDate") ?? "");
  if (!feeHeadId || !amount || !dueDate) return;

  const students = await db.student.findMany({
    where: {
      active: true,
      ...(classRoomId && classRoomId !== "all" ? { classRoomId } : {}),
    },
  });
  for (const s of students) {
    const existing = await db.feeInvoice.findFirst({
      where: { studentId: s.id, feeHeadId },
    });
    if (existing) continue; // idempotent: don't double-bill a head
    await db.feeInvoice.create({
      data: {
        studentId: s.id,
        classRoomId: s.classRoomId,
        feeHeadId,
        amount,
        dueDate: toUTCDate(dueDate),
      },
    });
  }
  revalidatePath("/fees");
}

export async function recordPayment(formData: FormData) {
  await requireUser(["principal", "desk"]);
  const school = await getSchool();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const mode = String(formData.get("mode") ?? "cash");
  const reference = String(formData.get("reference") ?? "") || null;
  const back = String(formData.get("back") ?? "/fees");
  if (!invoiceId || amount <= 0) return;

  const invoice = await db.feeInvoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true, student: true, feeHead: true },
  });
  if (!invoice) return;

  const payment = await db.payment.create({
    data: { invoiceId, amount, mode, reference },
  });
  const paidTotal =
    invoice.payments.reduce((sum, p) => sum + p.amount, 0) + amount;
  await db.feeInvoice.update({
    where: { id: invoiceId },
    data: { status: paidTotal >= invoice.amount ? "paid" : "partial" },
  });

  // WhatsApp receipt — transparency is the product
  if (invoice.student.guardianPhone) {
    await queueMessage({
      toPhone: invoice.student.guardianPhone,
      toName: invoice.student.guardianName ?? undefined,
      template: "receipt",
      body: templates.receipt[lang(invoice.student.language)]({
        student: invoice.student.name,
        head: invoice.feeHead.name,
        amount,
        ref: reference ?? payment.id.slice(-8),
        school: school.name,
      }),
    });
  }

  revalidatePath("/fees");
  revalidatePath("/collect");
  redirect(`${back.startsWith("/") ? back : "/fees"}${back.includes("?") ? "&" : "?"}paid=${amount}`);
}

// Queue WhatsApp fee reminders (with UPI deep link) for all overdue/unpaid invoices.
export async function sendFeeReminders(formData: FormData) {
  await requireUser(["principal", "desk"]);
  const school = await getSchool();
  const scope = String(formData.get("scope") ?? "overdue"); // overdue | all-unpaid

  const invoices = await db.feeInvoice.findMany({
    where: {
      status: { in: ["unpaid", "partial"] },
      ...(scope === "overdue" ? { dueDate: { lt: new Date() } } : {}),
    },
    include: { student: true, feeHead: true, payments: true },
  });

  const msgs = invoices
    .filter((inv) => inv.student.guardianPhone)
    .map((inv) => {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const balance = inv.amount - paid;
      const upiLink =
        school.upiVpa && school.upiPayee
          ? upiPayLink({
              vpa: school.upiVpa,
              payee: school.upiPayee,
              amount: balance,
              note: `${inv.feeHead.name} ${inv.student.admissionNo}`,
            })
          : undefined;
      return {
        toPhone: inv.student.guardianPhone!,
        toName: inv.student.guardianName ?? undefined,
        template: "fee_reminder" as const,
        body: templates.fee_reminder[lang(inv.student.language)]({
          student: inv.student.name,
          head: inv.feeHead.name,
          amount: balance,
          due: dateHuman(inv.dueDate),
          school: school.name,
          upiLink,
        }),
      };
    });

  const res = await queueMessages(msgs);
  revalidatePath("/fees");
  revalidatePath("/outbox");
  redirect(`/outbox?queued=${res.count}`);
}

// ---------- notices ----------

export async function publishNotice(formData: FormData) {
  await requireUser(["principal"]);
  const school = await getSchool();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const classRoomId = String(formData.get("classRoomId") ?? "all");
  if (!title || !body) return;

  await db.notice.create({
    data: {
      schoolId: school.id,
      title,
      body,
      audience: classRoomId === "all" ? "all" : `class:${classRoomId}`,
    },
  });

  const students = await db.student.findMany({
    where: {
      active: true,
      guardianPhone: { not: null },
      ...(classRoomId !== "all" ? { classRoomId } : {}),
    },
  });
  await queueMessages(
    students.map((s) => ({
      toPhone: s.guardianPhone!,
      toName: s.guardianName ?? undefined,
      template: "notice" as const,
      body: templates.notice[lang(s.language)]({
        title,
        body,
        school: school.name,
      }),
    }))
  );

  revalidatePath("/notices");
  revalidatePath("/outbox");
}

// ---------- outbox ----------

export async function sendQueuedMessages() {
  await requireUser();
  await drainOutboxDev();
  revalidatePath("/outbox");
}
