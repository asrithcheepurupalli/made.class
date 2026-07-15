"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
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

// Per-instance login throttle: 10 attempts / 10 min per email. A shared store
// (Redis) replaces this at scale; it still blunts naive brute force here.
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
function throttled(email: string): boolean {
  const now = Date.now();
  const cur = loginAttempts.get(email);
  if (!cur || cur.resetAt < now) {
    loginAttempts.set(email, { count: 1, resetAt: now + 10 * 60_000 });
    return false;
  }
  cur.count++;
  return cur.count > 10;
}

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (throttled(email)) {
    return { error: "Too many attempts — try again in a few minutes" };
  }
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email or password" };
  }
  loginAttempts.delete(email);
  await createSession(user.id);
  redirect(roleHome(user.role));
}

// Self-serve school signup: creates the school, its principal account and the
// default subject list, then signs in.
export async function signup(_prev: { error?: string } | undefined, formData: FormData) {
  const schoolName = String(formData.get("schoolName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!schoolName || !name || !email || password.length < 8) {
    return { error: "Fill everything in — password needs 8+ characters" };
  }
  if (await db.user.findUnique({ where: { email } })) {
    return { error: "An account with this email already exists" };
  }
  const school = await db.school.create({ data: { name: schoolName } });
  await db.subject.createMany({
    data: ["English", "Hindi", "Mathematics", "Science", "Social Science"].map((n, i) => ({
      schoolId: school.id, name: n, order: i,
    })),
  });
  const user = await db.user.create({
    data: { email, name, passwordHash: hashPassword(password), role: "principal", schoolId: school.id },
  });
  await createSession(user.id);
  redirect("/today");
}

export async function changePassword(formData: FormData) {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 8) return;
  if (!verifyPassword(current, user.passwordHash)) return;
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(next) },
  });
  revalidatePath("/settings");
  redirect("/settings?pw=1");
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

async function getSchool(user?: { schoolId?: string | null }) {
  const school = user?.schoolId
    ? await db.school.findUnique({ where: { id: user.schoolId } })
    : await db.school.findFirst();
  if (!school) throw new Error("No school configured");
  return school;
}

export async function updateSchoolSettings(formData: FormData) {
  const user = await requireUser(["principal"]);
  const school = await getSchool(user);
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
  const user = await requireUser(["principal"]);
  const school = await getSchool(user);
  const grade = String(formData.get("grade") ?? "").trim();
  const section = String(formData.get("section") ?? "").trim().toUpperCase() || "A";
  if (!grade) return;
  await db.classRoom.upsert({
    where: { schoolId_grade_section: { schoolId: school.id, grade, section } },
    create: { schoolId: school.id, grade, section },
    update: {},
  });
  revalidatePath("/students");
  revalidatePath("/attendance");
}

export async function createStudent(formData: FormData) {
  const user = await requireUser(["principal"]);
  const school = await getSchool(user);
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
  revalidatePath("/students");
}

// CSV columns: admissionNo,name,guardianName,guardianPhone,language
export async function importStudentsCSV(formData: FormData) {
  const user = await requireUser(["principal"]);
  const school = await getSchool(user);
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
  revalidatePath("/students");
  console.log(`Imported ${imported} students into class ${classRoomId}`);
}

// ---------- attendance ----------

export async function saveAttendance(formData: FormData) {
  const user = await requireUser();
  const school = await getSchool(user);
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
          schoolId: school.id,
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
  const school = await getSchool(user);
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
      schoolId: school.id,
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
  const user = await requireUser(["principal"]);
  const school = await getSchool(user);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.feeHead.create({ data: { schoolId: school.id, name } });
  revalidatePath("/fees");
}

// Generate one invoice per active student of a class (or all classes).
export async function generateInvoices(formData: FormData) {
  const user = await requireUser(["principal"]);
  const school = await getSchool(user);
  const feeHeadId = String(formData.get("feeHeadId") ?? "");
  const classRoomId = String(formData.get("classRoomId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const dueDate = String(formData.get("dueDate") ?? "");
  if (!feeHeadId || !amount || !dueDate) return;

  const students = await db.student.findMany({
    where: {
      active: true,
      schoolId: school.id,
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
  const user = await requireUser(["principal", "desk"]);
  const school = await getSchool(user);
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
      schoolId: school.id,
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
  const user = await requireUser(["principal", "desk"]);
  const school = await getSchool(user);
  const scope = String(formData.get("scope") ?? "overdue"); // overdue | all-unpaid

  const invoices = await db.feeInvoice.findMany({
    where: {
      status: { in: ["unpaid", "partial"] },
      student: { schoolId: school.id },
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
        schoolId: school.id,
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
  const user = await requireUser(["principal"]);
  const school = await getSchool(user);
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
      schoolId: school.id,
      guardianPhone: { not: null },
      ...(classRoomId !== "all" ? { classRoomId } : {}),
    },
  });
  await queueMessages(
    students.map((s) => ({
      schoolId: school.id,
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

// ---------- exams ----------

export async function createExam(formData: FormData) {
  const user = await requireUser(["principal"]);
  const school = await getSchool(user);
  const name = String(formData.get("name") ?? "").trim();
  const maxMarks = Number(formData.get("maxMarks") ?? 100) || 100;
  const heldOn = String(formData.get("heldOn") ?? "");
  if (!name || !heldOn) return;
  await db.exam.create({
    data: { schoolId: school.id, name, maxMarks, heldOn: toUTCDate(heldOn) },
  });
  revalidatePath("/exams");
}

export async function saveMarks(formData: FormData) {
  const user = await requireUser(["principal", "teacher"]);
  const examId = String(formData.get("examId") ?? "");
  const classRoomId = String(formData.get("classRoomId") ?? "");
  if (!examId || !classRoomId) return;
  if (user.role === "teacher" && user.classRoomId !== classRoomId) return;

  const school = await getSchool(user);
  const [students, subjects, exam] = await Promise.all([
    db.student.findMany({ where: { classRoomId, active: true, schoolId: school.id }, select: { id: true } }),
    db.subject.findMany({ where: { schoolId: school.id }, select: { id: true } }),
    db.exam.findUnique({ where: { id: examId } }),
  ]);
  if (!exam) return;

  const rows: { examId: string; studentId: string; subjectId: string; score: number }[] = [];
  for (const s of students) {
    for (const sub of subjects) {
      const raw = formData.get(`mark_${s.id}_${sub.id}`);
      if (raw === null || String(raw).trim() === "") continue;
      const score = Math.max(0, Math.min(exam.maxMarks, Number(raw) || 0));
      rows.push({ examId, studentId: s.id, subjectId: sub.id, score });
    }
  }
  // replace this class's marks for the exam in one shot
  await db.mark.deleteMany({ where: { examId, studentId: { in: students.map((s) => s.id) } } });
  for (let i = 0; i < rows.length; i += 500) {
    await db.mark.createMany({ data: rows.slice(i, i + 500) });
  }

  const dest = user.role === "teacher" ? "/marks" : "/exams";
  revalidatePath(dest);
  redirect(`${dest}?exam=${examId}${user.role === "teacher" ? "" : `&class=${classRoomId}`}&saved=${rows.length}`);
}

// ---------- outbox ----------

export async function sendQueuedMessages() {
  await requireUser();
  await drainOutboxDev();
  revalidatePath("/outbox");
}
