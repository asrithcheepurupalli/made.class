import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId, roleHome } from "@/lib/auth";
import { db } from "@/lib/db";
import { LandingFx } from "@/components/landing-fx";
import { Story } from "@/components/story";

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

      {/* ---------- hero: the statement ---------- */}
      <div className="lhero">
        <header className="lhero-head">
          <span className="wordmark">made<i>.</i>class</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/signup" className="btn line" style={{ padding: "8px 18px" }}>
              Start your school
            </Link>
            <Link href="/login" className="btn" style={{ padding: "8px 18px" }}>
              Sign in
            </Link>
          </div>
        </header>

        <div className="lhero-grid" style={{ paddingBottom: 40 }}>
          <div className="copy" style={{ maxWidth: 880 }}>
            <div className="lkicker">
              <span className="pulse" aria-hidden="true"></span> India-first · WhatsApp-native · UPI-direct
            </div>
            <h1 className="mega">
              The school OS parents <em>never install</em>.
            </h1>
            <p className="land-sub">
              Indian schools don&apos;t have a software problem — they have a <b>too-much-software</b>
              {" "}problem. Registers copied three times, fees chased family by family, notices
              drowning in WhatsApp groups. We fixed it by removing things.
            </p>
            <div className="land-cta">
              <Link href="/login" className="btn grn" style={{ padding: "13px 26px" }}>
                Try the live demo
              </Link>
              <a href="#story" className="btn line" style={{ padding: "13px 26px" }}>
                Read one Tuesday morning
              </a>
            </div>
            <p className="demo-note">
              A full demo school inside — enter as principal, teacher or front desk. No signup.
            </p>
          </div>
        </div>
        <div className="scrollhint">
          scroll — the story is one morning <i>↓</i>
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

      {/* ---------- the story: one Tuesday morning ---------- */}
      <Story />

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
              Now read it with <em>your school&apos;s</em> names in it.
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
            made<span style={{ color: "#F0AC3B" }}>.</span>class — the school OS · Vijayawada, India
          </span>
          <span>Built India-first · WhatsApp-native · UPI-direct</span>
        </div>
      </footer>
    </>
  );
}
