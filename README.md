# made.class — School OS

**The school OS parents never install.** India-first: one-tap attendance, transparent UPI fee collection straight to the school's account, and every parent reached on WhatsApp in their own language.

Built on [our market research](research/school-os-market-research.md): every existing school ERP adds work — the winner removes it.

## What's here

- **Marketing landing page** at `/` with SEO (metadata, OG image, sitemap, robots, JSON-LD).
- **Role-based app** — each role gets a different product:
  - **Principal** — Today board (attendance ring, collections, class-register tiles, live feed, needs-you), attendance for any class, fees with reminder broadcast, students, notices, outbox, settings.
  - **Teacher** — their class register (tap-to-mark pill grid) + class diary to their parents.
  - **Front desk** — search-first fee collection with instant WhatsApp receipts + dues ladder.
  - **Parent** — no login, no app: WhatsApp messages (alerts, reminders with UPI links, receipts, notices), Hindi/English per family.
- **Messaging outbox** — provider-agnostic queue; dev provider included, WhatsApp Business API drops in behind the same interface.
- **Docs** in [`docs/`](docs/): product & features guide, market case study, technical guide, school one-pager (PDFs).

## Run it locally (zero setup — SQLite)

```bash
npm install
echo 'DATABASE_URL="file:./dev.db"' > .env
npx prisma db push
npm run seed      # Sunrise Public School: 12 classes, 447 students, invoices, history
npm run dev
```

Open http://localhost:3000 — the landing page — then **Try the live demo**, or sign in:

| Login | Role | Password |
|---|---|---|
| principal@sunrise.school | Principal | demo123 |
| teacher@sunrise.school | Teacher (8-B) | demo123 |
| desk@sunrise.school | Front desk | demo123 |

The login page also has one-click demo-role buttons (`loginAsDemo` — remove for production).

## Deploy to Vercel

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"` and commit.
2. Import the repo at [vercel.com/new](https://vercel.com/new), attach a **Neon Postgres** database (sets `DATABASE_URL`), add `AUTH_SECRET` (e.g. `openssl rand -hex 32`) and optionally `NEXT_PUBLIC_SITE_URL`.
3. Deploy, then from your machine:

```bash
DATABASE_URL="<neon url>" npx prisma db push
DATABASE_URL="<neon url>" npm run seed
```

## Stack

Next.js 16 (App Router, server actions) · Prisma (SQLite dev / Postgres deploy) · Tailwind v4 + hand-rolled design system · self-hosted Fraunces + IBM Plex Sans.

## Before real production

Real session store + MFA, rate limiting, password reset, payments audit log, DPDP consent records, multi-school tenancy, WABA provider — sequenced in [`docs/madeclass-technical-guide.pdf`](docs/madeclass-technical-guide.pdf).
