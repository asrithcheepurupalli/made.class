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

## Run it locally

You need a Postgres URL — a free [Neon](https://neon.tech) database works (or any local Postgres).

```bash
npm install
echo 'DATABASE_URL="postgres://…"' > .env
npx prisma db push        # create tables
npm run seed              # demo school + 36 students + invoices
npm run dev
```

Login: `admin@demo.school` / `admin123`

## Deploy to Vercel

1. Import this repo at [vercel.com/new](https://vercel.com/new) (framework auto-detects as Next.js).
2. Add a database: in the Vercel project → **Storage** → create a **Neon Postgres** database (or bring any Postgres URL). This sets `DATABASE_URL` automatically.
3. Add an env var `AUTH_SECRET` set to a long random string (e.g. output of `openssl rand -hex 32`).
4. Deploy. Then create the tables and demo data from your machine against the production database:

```bash
DATABASE_URL="<the vercel/neon url>" npx prisma db push
DATABASE_URL="<the vercel/neon url>" npm run seed
```

5. Open the deployment URL and sign in with `admin@demo.school` / `admin123`.

## Stack

Next.js (App Router, server actions) · Prisma + Postgres · Tailwind CSS.

## Not yet (deliberately)

Report-card generation (board-compliant templates), UDISE+/APAAR-shaped exports, offline-first sync, real WABA provider, multi-school/multi-role auth, Postgres. See the research doc for the roadmap rationale.
