import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId, roleHome } from "@/lib/auth";
import { db } from "@/lib/db";
import { LandingFx } from "@/components/landing-fx";

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

const MARQUEE = [
  "no parent app, ever",
  "₹0 convenience charges",
  "~98% of messages read",
  "one-tap register",
  "हिंदी + English",
  "UPI direct to the school",
  "absence alerts by 9:45 am",
  "receipts in the same chat",
];

export default async function LandingPage() {
  // Signed-in users go straight to their app. The landing page must render
  // even when the database is missing or empty (fresh deploy, no seed yet),
  // so a failed lookup falls through to the marketing page.
  const userId = await currentUserId();
  if (userId) {
    let user = null;
    try {
      user = await db.user.findUnique({ where: { id: userId } });
    } catch {
      // no database yet — render the landing page
    }
    if (user) redirect(roleHome(user.role));
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <LandingFx />

      {/* ---------- hero: the blackboard ---------- */}
      <div className="lhero">
        <header className="lhero-head">
          <span className="wordmark">made<i>.</i>class</span>
          <Link href="/login" className="btn" style={{ padding: "8px 18px" }}>
            Sign in
          </Link>
        </header>

        <div className="lhero-grid">
          <div className="copy">
            <div className="lkicker">
              <span className="pulse" aria-hidden="true"></span> India-first · WhatsApp-native · UPI-direct
            </div>
            <h1 className="mega">
              The school OS parents <em>never install</em>.
            </h1>
            <p className="land-sub">
              Teachers mark the register in <b>one tap</b>. Fees arrive by UPI <b>straight into the
              school&apos;s account</b> — no gateway, no convenience charges. And every notice, alert
              and receipt lands where parents already are: <b>WhatsApp</b>, in their own language.
            </p>
            <div className="land-cta">
              <Link href="/login" className="btn grn" style={{ padding: "13px 26px" }}>
                Try the live demo
              </Link>
              <a href="#jobs" className="btn line" style={{ padding: "13px 26px" }}>
                See how it works
              </a>
            </div>
            <p className="demo-note">
              A full demo school inside — enter as principal, teacher or front desk. No signup.
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
            <div className="wa-chat" style={{ minHeight: 400 }}>
              <span className="wa-day seq">Monday</span>
              <div className="bub seq">
                प्रिय अभिभावक, आरव शर्मा आज विद्यालय में अनुपस्थित रहे। – Sunrise Public School
                <span className="time">9:42 am</span>
              </div>
              <span className="wa-day seq">Wednesday</span>
              <div className="bub seq">
                &quot;Tuition Term 1&quot; — ₹5,500 for Aarav, due 20 Jul.
                <span className="upi">Pay ₹5,500 by UPI</span>
                <span className="time">8:00 am</span>
              </div>
              <span className="wa-day seq">Today</span>
              <div className="bub seq">
                Received ₹5,500 (Tuition Term 1, Aarav). Ref UPI2467812. Thank you! 🙏
                <span className="time">10:32 am</span>
              </div>
              <div className="bub seq">
                PTM this Saturday, 10 am – 1 pm. Report cards ready.
                <span className="time">11:05 am</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- marquee ---------- */}
      <div className="mq" aria-hidden="true">
        <div className="mq-in">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>

      {/* ---------- the three jobs ---------- */}
      <section className="jobs" id="jobs">
        <h2 className="lead rv">Not another ERP with forty modules.</h2>
        <p className="leadsub rv">
          The three things a school runs on every single day — made so light they disappear.
        </p>

        <div className="job rv">
          <div className="w">
            Register.
            <small>attendance, one tap</small>
          </div>
          <p>
            Everyone starts present — teachers tap only the exceptions, from their own phone.
            Absentees&apos; parents get a WhatsApp alert <b>by 9:45 am, not at dinner</b>. The
            principal watches every class&apos;s register land on one board, and the unmarked one
            glows amber until it&apos;s done.
          </p>
        </div>

        <div className="job rv">
          <div className="w">
            Fees.
            <small>UPI, zero friction</small>
          </div>
          <p>
            One button reminds every overdue family on WhatsApp — each message carries a UPI link
            with the exact balance, paying <b>the school&apos;s own account directly</b>. No
            gateway, no hidden charges, no fee-loans in disguise. The receipt lands in the same
            chat, seconds later.
          </p>
        </div>

        <div className="job rv">
          <div className="w">
            Reach.
            <small>every parent, WhatsApp</small>
          </div>
          <p>
            Notices, class diary, alerts and receipts — in each family&apos;s <b>own language</b>,
            Hindi or English, with read-tracking. Families install nothing, learn nothing new,
            miss nothing. That&apos;s the whole trick.
          </p>
        </div>
      </section>

      {/* ---------- stats ---------- */}
      <section className="statband">
        <div className="sstat rv">
          <div className="n"><em><span data-count="98" data-suffix="%">0%</span></em></div>
          <div className="l">of WhatsApp messages get read — circulars don&apos;t</div>
        </div>
        <div className="sstat rv">
          <div className="n">₹<span data-count="0">0</span></div>
          <div className="l">convenience charges on fee payments, forever</div>
        </div>
        <div className="sstat rv">
          <div className="n"><span data-count="1">0</span> tap</div>
          <div className="l">to mark a class and alert every absentee&apos;s parent</div>
        </div>
        <div className="sstat rv">
          <div className="n"><span data-count="2">0</span> min</div>
          <div className="l">to see the live demo with a full school inside</div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="ctaband">
        <div className="in">
          <div className="rv">
            <h2>
              See it with your <em>own school&apos;s</em> eyes.
            </h2>
            <p>
              The demo runs a real school — 447 students, live registers, dues, and the WhatsApp
              outbox. Enter as the principal, a teacher, or the front desk.
            </p>
          </div>
          <Link href="/login" className="btn grn rv">
            Open the demo
          </Link>
        </div>
      </section>

      <footer className="lfoot">
        <div className="in">
          <span>
            made<span style={{ color: "#48B389" }}>.</span>class — the school OS · Vijayawada, India
          </span>
          <span>Built India-first · WhatsApp-native · UPI-direct</span>
        </div>
      </footer>
    </>
  );
}
