"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/app/actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined);
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div className="wordmark" style={{ fontSize: 26 }}>
            made<i>.</i>class
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6 }}>
            Start your school — two minutes, no card
          </p>
        </div>

        <form action={formAction} className="fld" style={{ display: "grid", gap: 2 }}>
          <label htmlFor="schoolName">School name</label>
          <input id="schoolName" name="schoolName" required placeholder="Sunrise Public School" />
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" required placeholder="Principal Lakshmi" />
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required placeholder="you@yourschool.in" />
          <label htmlFor="password">Password (8+ characters)</label>
          <input id="password" name="password" type="password" minLength={8} required />
          {state?.error && (
            <p style={{ color: "var(--red)", fontSize: 13, margin: "10px 0 0" }}>{state.error}</p>
          )}
          <div style={{ marginTop: 22 }}>
            <button className="btn" disabled={pending} style={{ width: "100%", justifyContent: "center", padding: "12px 18px" }}>
              {pending ? "Creating your school…" : "Create school & sign in"}
            </button>
          </div>
        </form>

        <p style={{ textAlign: "center", color: "var(--faint)", fontSize: 12.5, marginTop: 18 }}>
          After signing in: add classes and students (CSV import supported), set your UPI ID, done.
          <br />
          Already have an account? <Link href="/login" style={{ color: "var(--brand-ink)" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
