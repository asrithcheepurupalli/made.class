# made.class — School OS

India-first School OS. Built on three findings from [our market research](research/school-os-market-research.md):

1. **Teachers drown in duplicate data entry** → enter once, export everywhere.
2. **Parents live on WhatsApp, not apps** → all parent communication (notices, absence alerts, fee reminders, receipts) goes out as WhatsApp/SMS messages; parents never install anything.
3. **Fee collection is the school's #1 anxiety** → dues dashboard, one-tap reminder ladders, UPI deep links straight to the school's own VPA — no intermediary, no convenience charges.

## v0 scope

- **Students & classes** — student records with guardian contacts, per-class rosters, CSV import.
- **Attendance** — fast tap marking (defaults to present), edit any date, optional WhatsApp absence alerts.
- **Fees** — fee heads, bulk invoice generation per class, payment recording (UPI/cash/bank), automatic WhatsApp receipts, overdue reminder broadcast with UPI pay links, Hindi/English templates per family.
- **Notices** — school-wide or per-class, broadcast to guardians.
- **Outbox** — provider-agnostic message queue (dev provider included; a WhatsApp Business API provider drops in behind the same interface).

## Run it

```bash
npm install
npx prisma migrate dev   # creates SQLite dev.db
npm run seed             # demo school + 36 students + invoices
npm run dev
```

Login: `admin@demo.school` / `admin123`

## Stack

Next.js (App Router, server actions) · Prisma + SQLite (dev) · Tailwind CSS.

## Not yet (deliberately)

Report-card generation (board-compliant templates), UDISE+/APAAR-shaped exports, offline-first sync, real WABA provider, multi-school/multi-role auth, Postgres. See the research doc for the roadmap rationale.
