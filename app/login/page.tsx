"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold tracking-tight">
            made<span className="text-emerald-600">.class</span>
          </div>
          <p className="mt-1 text-sm text-stone-500">School OS — sign in</p>
        </div>
        <form action={formAction} className="space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          <button
            disabled={pending}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-stone-400">
          Demo: admin@demo.school / admin123
        </p>
      </div>
    </div>
  );
}
