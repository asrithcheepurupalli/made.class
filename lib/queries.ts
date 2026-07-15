import { db } from "./db";
import { toUTCDate, todayISO } from "./format";

export async function classBoard(schoolId: string) {
  const classes = await db.classRoom.findMany({
    where: { schoolId },
    orderBy: [{ grade: "asc" }, { section: "asc" }],
    include: { _count: { select: { students: { where: { active: true } } } } },
  });
  const today = toUTCDate(todayISO());
  const marks = await db.attendanceRecord.groupBy({
    by: ["classRoomId", "status"],
    where: { date: today },
    _count: true,
  });
  const byClass = new Map<string, { present: number; total: number }>();
  for (const m of marks) {
    const cur = byClass.get(m.classRoomId) ?? { present: 0, total: 0 };
    cur.total += m._count;
    if (m.status === "present") cur.present += m._count;
    byClass.set(m.classRoomId, cur);
  }
  // natural class order: LKG, UKG, then numeric
  const orderKey = (g: string) => (g === "LKG" ? -2 : g === "UKG" ? -1 : parseInt(g, 10) || 0);
  return classes
    .map((c) => ({
      id: c.id,
      name: `${c.grade}-${c.section}`,
      grade: c.grade,
      size: c._count.students,
      marked: byClass.has(c.id),
      present: byClass.get(c.id)?.present ?? 0,
      markedCount: byClass.get(c.id)?.total ?? 0,
    }))
    .sort((a, b) => orderKey(a.grade) - orderKey(b.grade) || a.name.localeCompare(b.name));
}

export async function todayStats(schoolId: string) {
  const today = toUTCDate(todayISO());
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [studentCount, att, paymentsToday, openInvoices, reachable] = await Promise.all([
    db.student.count({ where: { active: true, schoolId } }),
    db.attendanceRecord.groupBy({ by: ["status"], where: { date: today, classRoom: { schoolId } }, _count: true }),
    db.payment.findMany({ where: { paidAt: { gte: startOfDay }, invoice: { student: { schoolId } } } }),
    db.feeInvoice.findMany({
      where: { status: { in: ["unpaid", "partial"] }, student: { schoolId } },
      include: { payments: true },
    }),
    db.student.count({ where: { active: true, schoolId, guardianPhone: { not: null } } }),
  ]);

  const present = att.find((a) => a.status === "present")?._count ?? 0;
  const absent = att.find((a) => a.status === "absent")?._count ?? 0;
  const marked = att.reduce((s, a) => s + a._count, 0);

  const collectedToday = paymentsToday.reduce((s, p) => s + p.amount, 0);
  const upiToday = paymentsToday.filter((p) => p.mode === "upi").reduce((s, p) => s + p.amount, 0);

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 86400_000);
  let outstanding = 0, overdueCount = 0, over30 = 0, over30Families = 0;
  for (const inv of openInvoices) {
    const bal = inv.amount - inv.payments.reduce((s, p) => s + p.amount, 0);
    outstanding += bal;
    if (inv.dueDate < now) overdueCount++;
    if (inv.dueDate < monthAgo) { over30 += bal; over30Families++; }
  }

  return {
    studentCount, present, absent, marked,
    collectedToday, upiShare: collectedToday ? Math.round((upiToday / collectedToday) * 100) : 0,
    outstanding, overdueCount, over30, over30Families, reachable,
  };
}

// Recent activity: merge payments + sent messages into a feed
export async function recentActivity(schoolId: string, limit = 6) {
  const [payments, messages] = await Promise.all([
    db.payment.findMany({
      where: { invoice: { student: { schoolId } } },
      orderBy: { paidAt: "desc" },
      take: limit,
      include: { invoice: { include: { student: true, feeHead: true } } },
    }),
    db.outboxMessage.findMany({
      where: { template: { in: ["absence_alert", "notice"] }, OR: [{ schoolId }, { schoolId: null }] },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);
  const items = [
    ...payments.map((p) => ({
      at: p.paidAt,
      name: p.invoice.student.name,
      text: `₹${p.amount.toLocaleString("en-IN")} received`,
      dim: `${p.invoice.feeHead.name} · ${p.mode.toUpperCase()}`,
      tag: ["g", "paid"] as [string, string],
    })),
    ...messages.map((m) => ({
      at: m.createdAt,
      name: m.toName ?? m.toPhone,
      text: m.template === "absence_alert" ? "absence alert sent" : "notice delivered",
      dim: m.toName ? `to ${m.toName}` : m.toPhone,
      tag: (m.template === "absence_alert" ? ["a", "alert"] : ["g", "notice"]) as [string, string],
    })),
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

// Streak: consecutive past weekdays where every class had attendance marked
export async function registerStreak(schoolId: string): Promise<number> {
  const classCount = await db.classRoom.count({ where: { schoolId } });
  let streak = 0;
  for (let off = 1; off <= 30 && streak < 30; off++) {
    const d = new Date();
    d.setDate(d.getDate() - off);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const day = toUTCDate(d.toISOString().slice(0, 10));
    const markedClasses = await db.attendanceRecord.groupBy({ by: ["classRoomId"], where: { date: day, classRoom: { schoolId } } });
    if (markedClasses.length >= classCount) streak++;
    else break;
  }
  return streak;
}

export async function absentStreaks(schoolId: string, minDays = 3) {
  // students absent on the last N marked school days
  const recent = await db.attendanceRecord.findMany({
    where: { status: "absent", classRoom: { schoolId } },
    orderBy: { date: "desc" },
    take: 2000,
    include: { student: true },
  });
  const byStudent = new Map<string, { name: string; days: Set<string> }>();
  for (const r of recent) {
    const cur = byStudent.get(r.studentId) ?? { name: r.student.name, days: new Set<string>() };
    cur.days.add(r.date.toISOString().slice(0, 10));
    byStudent.set(r.studentId, cur);
  }
  return [...byStudent.values()]
    .filter((s) => s.days.size >= minDays)
    .slice(0, 3)
    .map((s) => s.name.split(" ")[0]);
}
