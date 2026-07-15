"use client";

import { useActionState } from "react";
import { login, loginAsDemo } from "@/app/actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div className="wordmark" style={{ fontSize: 26 }}>
            made<i>.</i>class
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6 }}>
            Sunrise Public School
          </p>
        </div>

        <form action={loginAsDemo} style={{ display: "grid", gap: 8 }}>
          <button className="btn" name="role" value="principal" style={{ justifyContent: "center", padding: "12px 18px" }}>
            Enter as Principal
          </button>
          <button className="btn quiet" name="role" value="teacher" style={{ justifyContent: "center", padding: "12px 18px" }}>
            Enter as Teacher · 8-B
          </button>
          <button className="btn quiet" name="role" value="desk" style={{ justifyContent: "center", padding: "12px 18px" }}>
            Enter as Front desk
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "26px 0 14px", color: "var(--faint)", fontSize: 12 }}>
          <span style={{ flex: 1, borderTop: "1px solid var(--line)" }} />
          or sign in with email
          <span style={{ flex: 1, borderTop: "1px solid var(--line)" }} />
        </div>

        <form action={formAction} className="fld" style={{ display: "grid", gap: 2 }}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required placeholder="principal@sunrise.school" />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required placeholder="demo123" />
          {state?.error && (
            <p style={{ color: "var(--red)", fontSize: 13, margin: "10px 0 0" }}>{state.error}</p>
          )}
          <div style={{ marginTop: 22 }}>
            <button className="btn" disabled={pending} style={{ width: "100%", justifyContent: "center", padding: "12px 18px" }}>
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
        <p style={{ textAlign: "center", color: "var(--faint)", fontSize: 12.5, marginTop: 18 }}>
          New school? <a href="/signup" style={{ color: "var(--brand-ink)" }}>Create your account</a>
        </p>
      </div>
    </div>
  );
}
