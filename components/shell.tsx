import Link from "next/link";
import { logout } from "@/app/actions";

const NAV: Record<string, { href: string; label: string }[]> = {
  principal: [
    { href: "/today", label: "Today" },
    { href: "/attendance", label: "Attendance" },
    { href: "/fees", label: "Fees" },
    { href: "/students", label: "Students" },
    { href: "/notices", label: "Notices" },
    { href: "/outbox", label: "Outbox" },
    { href: "/settings", label: "Settings" },
  ],
  teacher: [
    { href: "/my-class", label: "My class" },
    { href: "/diary", label: "Class diary" },
  ],
  desk: [
    { href: "/collect", label: "Collect" },
    { href: "/dues", label: "Dues" },
    { href: "/outbox", label: "Outbox" },
  ],
};

export function Shell({
  children,
  role,
  active,
  userName,
}: {
  children: React.ReactNode;
  role: string;
  active: string;
  userName: string;
}) {
  const nav = NAV[role] ?? NAV.principal;
  return (
    <>
      <header className="top">
        <div className="top-in">
          <Link href="/" className="wordmark">
            made<i>.</i>class
          </Link>
          <nav className="tabs" aria-label="Main">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active === n.href ? "page" : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="topuser">
            <span>{userName}</span>
            <form action={logout}>
              <button>Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}

const AV_TOKENS = ["--av1", "--av2", "--av3", "--av4", "--av5"];
export function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % AV_TOKENS.length;
  return (
    <span className="av" style={{ background: `var(${AV_TOKENS[h]})` }}>
      {initials}
    </span>
  );
}

export function Flash({ children }: { children: React.ReactNode }) {
  return (
    <div className="flash" role="status">
      {children}
    </div>
  );
}

export function Ring({ pct, label, color = "var(--green)" }: { pct: number; label?: string; color?: string }) {
  const C = 2 * Math.PI * 24;
  const filled = Math.round((Math.min(100, Math.max(0, pct)) / 100) * C);
  return (
    <svg className="ring" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r="24" stroke="var(--line2)" />
      <circle cx="28" cy="28" r="24" stroke={color} strokeDasharray={`${filled} ${C}`} transform="rotate(-90 28 28)" />
      <text x="28" y="32" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--ink)">
        {label ?? `${Math.round(pct)}%`}
      </text>
    </svg>
  );
}
