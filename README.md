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

## Run it locally (zero setup — SQLite)

```bash
npm install
echo 'DATABASE_URL="file:./dev.db"' > .env
npx prisma db push        # create tables in a local dev.db file
npm run seed              # demo school + 36 students + invoices
npm run dev
```

Open http://localhost:3000 and log in with `admin@demo.school` / `admin123`.

## Deploy to Vercel

Vercel's serverless filesystem is ephemeral, so the SQLite file won't work there — switch to Postgres first:

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"` and commit.
2. Import the repo at [vercel.com/new](https://vercel.com/new) (auto-detects Next.js).
3. In the Vercel project → **Storage** → create a **Neon Postgres** database (sets `DATABASE_URL` automatically), and add an `AUTH_SECRET` env var (e.g. `openssl rand -hex 32`).
4. Deploy, then create tables and demo data against the production database from your machine:

```bash
DATABASE_URL="<the vercel/neon url>" npx prisma db push
DATABASE_URL="<the vercel/neon url>" npm run seed
```

5. Open the deployment URL and sign in with `admin@demo.school` / `admin123`.

## Stack

Next.js (App Router, server actions) · Prisma (SQLite for local dev, Postgres for deploys) · Tailwind CSS.

## Not yet (deliberately)

Report-card generation (board-compliant templates), UDISE+/APAAR-shaped exports, offline-first sync, real WABA provider, multi-school/multi-role auth, Postgres. See the research doc for the roadmap rationale.
