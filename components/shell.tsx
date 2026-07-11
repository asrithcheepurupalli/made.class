import Link from "next/link";
import { logout } from "@/app/actions";

const nav = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/attendance", label: "Attendance", icon: "✓" },
  { href: "/fees", label: "Fees", icon: "₹" },
  { href: "/classes", label: "Classes", icon: "▤" },
  { href: "/students", label: "Students", icon: "☺" },
  { href: "/notices", label: "Notices", icon: "◈" },
  { href: "/outbox", label: "Outbox", icon: "➤" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Shell({
  children,
  schoolName,
  userName,
}: {
  children: React.ReactNode;
  schoolName: string;
  userName: string;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-stone-200 bg-white sm:flex">
        <div className="border-b border-stone-200 px-4 py-4">
          <div className="text-lg font-bold tracking-tight">
            made<span className="text-emerald-600">.class</span>
          </div>
          <div className="mt-0.5 truncate text-xs text-stone-500">{schoolName}</div>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <span className="w-4 text-center text-stone-400">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-stone-200 p-3 text-xs text-stone-500">
          <div className="mb-2 truncate">{userName}</div>
          <form action={logout}>
            <button className="text-stone-500 underline hover:text-stone-800">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {/* mobile top bar */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 sm:hidden">
          <div className="font-bold">
            made<span className="text-emerald-600">.class</span>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/attendance" className="text-stone-600">Attendance</Link>
            <Link href="/fees" className="text-stone-600">Fees</Link>
            <Link href="/" className="text-stone-600">More</Link>
          </div>
        </div>
        <main className="mx-auto max-w-5xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-stone-200 bg-white p-4 ${className}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-stone-500">{hint}</div>}
    </Card>
  );
}

export const inputCls =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none";
export const btnCls =
  "inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50";
export const btnGhostCls =
  "inline-flex items-center justify-center rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50";
