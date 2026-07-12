import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId, roleHome } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "made.class",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "India-first school operating system: one-tap attendance, transparent UPI fee collection, and every parent reached on WhatsApp — no app for families to install.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR", description: "Pilot program for schools" },
  audience: { "@type": "Audience", audienceType: "K-12 schools in India" },
};

export default async function LandingPage() {
  // signed-in users go straight to their app
  const userId = await currentUserId();
  if (userId) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user) redirect(roleHome(user.role));
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <header className="top">
        <div className="top-in">
          <span className="wordmark">made<i>.</i>class</span>
          <nav className="tabs" aria-label="Main">
            <a href="#features">Features</a>
            <a href="#why">Why schools switch</a>
          </nav>
          <Link href="/login" className="btn quiet" style={{ padding: "7px 16px" }}>
            Sign in
          </Link>
        </div>
      </header>

      <section className="land-hero">
        <div className="copy">
          <h1 className="land-h1">
            The school OS parents <em>never install</em>.
          </h1>
          <p className="land-sub">
            Attendance in one tap. Fees paid by UPI straight to the school — no gateway, no
            convenience charges. And every notice, alert and receipt lands where parents already
            are: WhatsApp.
          </p>
          <div className="land-cta">
            <Link href="/login" className="btn grn" style={{ padding: "12px 22px", fontSize: 15 }}>
              Try the live demo
            </Link>
            <a href="#features" className="btn quiet" style={{ padding: "12px 22px", fontSize: 15 }}>
              See how it works
            </a>
          </div>
          <p style={{ color: "var(--faint)", fontSize: 12.5, marginTop: 14 }}>
            Demo school included — enter as principal, teacher or front desk.
          </p>
        </div>

        <div className="phone" aria-label="What a parent sees on WhatsApp">
          <div className="wa-top">
            <div className="wa-av">SP</div>
            <div>
              <div className="t">Sunrise Public School</div>
              <div className="s">official account</div>
            </div>
          </div>
          <div className="wa-chat">
            <span className="wa-day">Monday</span>
            <div className="bub">
              प्रिय अभिभावक, आरव शर्मा आज विद्यालय में अनुपस्थित रहे। – Sunrise Public School
              <span className="time">9:42 am</span>
            </div>
            <span className="wa-day">Wednesday</span>
            <div className="bub">
              &quot;Tuition Term 1&quot; — ₹5,500 for Aarav, due 20 Jul.
              <span className="upi">Pay ₹5,500 by UPI</span>
              <span className="time">8:00 am</span>
            </div>
            <span className="wa-day">Today</span>
            <div className="bub">
              Received ₹5,500 (Tuition Term 1, Aarav). Ref UPI2467812. Thank you! 🙏
              <span className="time">10:32 am</span>
            </div>
          </div>
        </div>
      </section>

      <section className="land-sect" id="features">
        <h2>Three jobs, done properly.</h2>
        <p className="sub">
          Not another ERP with forty modules. The three things a school runs on every single day —
          made effortless.
        </p>
        <div className="land-feats">
          <div className="feat">
            <div className="ic">✓</div>
            <h3>The register, in one tap</h3>
            <p>
              Everyone starts present — teachers tap only the exceptions, from their own phone.
              Absentees&apos; parents get a WhatsApp alert by 9:45 am, not at dinner. The principal
              sees every class&apos;s register status live.
            </p>
          </div>
          <div className="feat">
            <div className="ic">₹</div>
            <h3>Fees without friction</h3>
            <p>
              Reminders carry a UPI link that pays the school&apos;s own account directly — zero
              gateway fees, zero hidden charges, receipt in the same chat. Dues dashboard shows
              who to call, oldest first.
            </p>
          </div>
          <div className="feat">
            <div className="ic">◉</div>
            <h3>Parents on WhatsApp, always</h3>
            <p>
              Notices, diary entries, alerts and receipts in each family&apos;s own language —
              Hindi or English. Read-tracking included. Families install nothing, ever.
            </p>
          </div>
        </div>
      </section>

      <section className="land-sect" id="why">
        <h2>Why schools switch.</h2>
        <p className="sub">
          Most Indian schools still run on paper registers, Excel and unstructured WhatsApp groups —
          because school software has meant desktop-first ERPs that add work instead of removing it.
        </p>
        <div className="land-stats">
          <div className="lstat">
            <div className="n">~98%</div>
            <div className="l">of parent messages read on WhatsApp — vs unopened circulars</div>
          </div>
          <div className="lstat">
            <div className="n">0</div>
            <div className="l">convenience charges on fee payments — UPI goes direct to the school</div>
          </div>
          <div className="lstat">
            <div className="n">1 tap</div>
            <div className="l">to mark a full class present and alert every absentee&apos;s parent</div>
          </div>
          <div className="lstat">
            <div className="n">2 roles</div>
            <div className="l">teachers see their class, the front desk sees money — everyone sees less, does more</div>
          </div>
        </div>
      </section>

      <section className="land-sect">
        <div
          style={{
            background: "var(--green-soft)",
            borderRadius: 20,
            padding: "36px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>See it with your own school&apos;s eyes.</h2>
            <p className="sub" style={{ margin: "8px 0 0" }}>
              The demo runs a real school — 447 students, live registers, dues, and the WhatsApp
              outbox. Two minutes, no signup.
            </p>
          </div>
          <Link href="/login" className="btn grn" style={{ padding: "13px 24px", fontSize: 15 }}>
            Open the demo
          </Link>
        </div>
      </section>

      <footer className="land-foot">
        <div className="in">
          <span>
            made<span style={{ color: "var(--green)" }}>.</span>class — the school OS · Vijayawada, India
          </span>
          <span>Built India-first · WhatsApp-native · UPI-direct</span>
        </div>
      </footer>
    </>
  );
}
