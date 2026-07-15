import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { inr, dateHuman } from "@/lib/format";
import { Shell, Avatar, Ring } from "@/components/shell";
import { cbseGrade } from "@/lib/grades";

export const metadata = { title: "Student" };
export const dynamic = "force-dynamic";

export default async function StudentProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser(["principal", "desk"]);
  const { id } = await params;
  const s = await db.student.findUnique({
    where: { id, ...(user.schoolId ? { schoolId: user.schoolId } : {}) },
    include: {
      classRoom: true,
      invoices: { include: { payments: true, feeHead: true }, orderBy: { dueDate: "asc" } },
      attendance: { orderBy: { date: "desc" }, take: 30 },
      marks: { include: { exam: true, subject: true } },
    },
  });
  if (!s) notFound();

  const attTotal = s.attendance.length;
  const attPresent = s.attendance.filter((a) => a.status === "present").length;
  const balance = s.invoices.reduce(
    (sum, inv) => sum + Math.max(0, inv.amount - inv.payments.reduce((x, p) => x + p.amount, 0)),
    0
  );
  const msgs = s.guardianPhone
    ? await db.outboxMessage.count({ where: { toPhone: s.guardianPhone } })
    : 0;

  const examIds = [...new Set(s.marks.map((m) => m.exam.id))];

  return (
    <Shell role={user.role} active="/students" userName={user.name}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <Avatar name={s.name} />
        <h1 style={{ flex: 1 }}>
          {s.name}
          <small>
            {s.classRoom.grade}-{s.classRoom.section} · Adm {s.admissionNo} · {s.guardianName ?? "guardian n/a"} · {s.guardianPhone ?? "no phone"}
          </small>
        </h1>
        {user.role !== "desk" ? null : (
          <Link href={`/collect?q=${encodeURIComponent(s.name)}&sid=${s.id}`} className="btn">
            Collect fees
          </Link>
        )}
      </div>

      <div className="hero3" style={{ marginTop: 24 }}>
        <div className="inst">
          <Ring pct={attTotal ? (attPresent / attTotal) * 100 : 0} />
          <div>
            <div className="big">{attPresent}<small>/{attTotal}</small></div>
            <div className="cap">present, last {attTotal} marked days</div>
          </div>
        </div>
        <div className={`inst ${balance > 0 ? "bad" : ""}`}>
          <div className={`roundbadge ${balance > 0 ? "" : "ok"}`}>₹</div>
          <div>
            <div className="big">{inr(balance)}</div>
            <div className="cap">{balance > 0 ? "fees outstanding" : "all fees clear"}</div>
          </div>
        </div>
        <div className="inst">
          <div className="roundbadge ok">{msgs}</div>
          <div>
            <div className="big">{s.language === "hi" ? "हिंदी" : "English"}</div>
            <div className="cap">{msgs} WhatsApp messages sent home</div>
          </div>
        </div>
      </div>

      <div className="sect">
        <h2>Fees</h2>
        <div>
          {s.invoices.map((inv) => {
            const paid = inv.payments.reduce((x, p) => x + p.amount, 0);
            const bal = inv.amount - paid;
            return (
              <div className="li" key={inv.id}>
                <span className="who">
                  <b>{inv.feeHead.name}</b>{" "}
                  <span className="dim">· due {dateHuman(inv.dueDate)}{paid > 0 ? ` · ${inr(paid)} paid` : ""}</span>
                </span>
                <span className={`tag ${bal <= 0 ? "g" : inv.dueDate < new Date() ? "r" : "a"}`}>
                  {bal <= 0 ? "paid" : inv.dueDate < new Date() ? "overdue" : "open"}
                </span>
                <span className="amt">{inr(inv.amount)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {examIds.length > 0 && (
        <div className="sect">
          <h2>Exams</h2>
          {examIds.map((eid) => {
            const rows = s.marks.filter((m) => m.exam.id === eid).sort((a, b) => a.subject.order - b.subject.order);
            const exam = rows[0].exam;
            const total = rows.reduce((x, m) => x + m.score, 0);
            const pct = Math.round((total / (rows.length * exam.maxMarks)) * 100);
            return (
              <div className="li" key={eid}>
                <span className="who">
                  <b>{exam.name}</b>{" "}
                  <span className="dim">· {rows.map((m) => `${m.subject.name.slice(0, 3)} ${m.score}`).join(" · ")}</span>
                </span>
                <span className={`tag ${pct >= 60 ? "g" : pct >= 33 ? "a" : "r"}`}>{cbseGrade(pct)} · {pct}%</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="sect">
        <h2>Recent attendance</h2>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {s.attendance.slice(0, 24).map((a) => (
            <span
              key={a.id}
              title={`${dateHuman(a.date)}: ${a.status}`}
              className="dot"
              style={{
                width: 14, height: 14, borderRadius: 4, display: "inline-block",
                background: a.status === "present" ? "var(--green)" : a.status === "absent" ? "var(--red)" : "var(--amber)",
                opacity: 0.85,
              }}
            />
          ))}
        </div>
        <p style={{ color: "var(--faint)", fontSize: 12, marginTop: 8 }}>Most recent first · green present, red absent, amber leave</p>
      </div>
    </Shell>
  );
}
