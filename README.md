# GRace Car Rental

A Philippine car-rental marketplace. Verified owners list their cars for the days they don't use them;
individuals and businesses rent them **self-drive** or **with the owner as driver**. GRace earns a
renter service fee plus a host commission on every booking, and the commission drops as the driver's
rating rises.

## Quick start

Needs Node 20+. Local development uses a SQLite file, so there is nothing else to install.

```bash
npm install
cp .env.example .env        # then set SESSION_SECRET (the file says how)
npm run setup               # creates the database and loads demo data
npm run dev                 # http://localhost:3100 (Turbopack)
```

Demo accounts and their shared password are in [`prisma/seed.ts`](prisma/seed.ts). Reset the demo data
any time with `npm run db:seed`.

| Try it as | Account |
| --- | --- |
| Renter with a licence (self-drive) | Ana Santos |
| Business renter | Mabilis Logistics Inc. |
| Your own fleet: Vios black, L300 | GRace Fleet |
| Partner owner: Avanza, Veloz | Reyes Transport Services |
| Owner-driver: Vios metallic blue | Carlo Mendoza |
| Unverified renter: can book with driver, not self-drive | Paolo Garcia |
| GRace staff | admin account → sign in at `/staff-login` (not linked anywhere) |

Without PayMongo keys, payments are **simulated** in development: "Pay" confirms the booking at once.

## Logins

- **Renter** and **Car owner** sign in on `/login` (two tabs) and land on their own home and menu. Sign-up asks
  "Rent a car" or "List my car"; a renter can switch to owner any time.
- **Admin** signs in only at `/staff-login`, which nothing links to. `/admin` returns 404 to everyone else.
- Change email or password: menu → Email & password (admins: Admin → My sign-in). A new password signs out other devices.
- Forgot password: **Forgot password?** on either log-in page sends a one-time link (30 minutes) by email or SMS.
- Admin → **Messages**: email and/or text any user; every message, including password resets, is logged there.
- Email goes through Resend and SMS through Semaphore (`RESEND_API_KEY`, `SEMAPHORE_API_KEY` in `.env`). Without keys,
  development simulates sending (logged to the console, shown as Simulated, and the reset page shows the link);
  production marks the message Failed instead, so set both keys before going live.
- Production admin: `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run admin:create` (creates or resets one).

## Help center

`/help` lists the help articles in [`src/lib/help-content.ts`](src/lib/help-content.ts) and has an AI assistant
(Claude Opus 5.5, prompt-cached, answers only from those articles). Set `ANTHROPIC_API_KEY` to turn on AI; without
it the assistant replies with the closest articles.

## Load test

`npm run load-test` against a production build (`npm run build`, then `npx next start -p 3200`). Results on the
development laptop (one Node process, SQLite, 30 s per scenario):

| Scenario | Throughput | Median | p95 | Errors |
| --- | --- | --- | --- | --- |
| 100 visitors browsing at once | 38 req/s | 2.6 s | 4.3 s | 0 |
| 50 signed-in users | 42 req/s | 1.1 s | 2.1 s | 0 |
| 30 logins at the same moment | — | 2.5 s | 2.6 s | 0 |
| 20 conflicting approvals for one car | — | 0.18 s | 0.23 s | 0 (exactly 1 approved) |

One process tops out around 40 pages/s (≈ 2,400 page views a minute); latency above is queueing at that cap. To
serve more, run several instances behind a load balancer on PostgreSQL. In-memory caches and the help-chat rate limit
are per instance.

## Earnings report

Admin → Earnings report (`/admin/reports`): your earnings (renter service fees + owner commission) for a chosen
period, with the change vs the period before, take rate, a chart over time, breakdowns by car, owner, category and
self-drive vs with driver, the all-time money position (collected, refunded, paid out, owed, held) and a CSV export.
Bookings count on the day the renter paid (Manila time); refunded bookings are excluded and listed separately. Logic
and tests: `src/lib/reports.ts`. The demo seed includes about five months of history (marked "demo history").

## Car photos

The five launch listings use representative photos of each model from Wikimedia Commons (CC BY-SA 4.0), stored in
`prisma/seed-photos/` with credits in `credits.json` and `ATTRIBUTION.md`; the seed attaches them. Every listing shows
"Representative photo", the photographer and the licence link. Replace them by uploading real photos of the actual
cars on each car's page (My cars → the car → Photos; the first photo is the cover). To re-fetch:
`node scripts/import-commons-photos.mjs`.

## How a booking works

1. **Request.** The renter picks dates and self-drive or with driver. Price and commission are snapshotted.
2. **Approve.** The owner approves; the dates are held for 24 hours (never past midnight before pick-up).
3. **Pay.** PayMongo hosted checkout (GCash, Maya, cards, QR Ph). The webhook confirms the booking.
4. **Pick-up checklist.** One side photographs five angles and records odometer and fuel; the other confirms.
5. **Return checklist.** Same again. Confirming it completes the booking and creates the owner's payout.
6. **Rate.** The renter rates the car and the driver. Ratings set the driver's commission tier.

Either side can report an issue at any point; it holds the payout until an admin resolves it.

## Who gets verified, with what

Defined in [`src/lib/requirements.ts`](src/lib/requirements.ts) and reviewed under **Admin → Applications**.

| | Documents | Rules |
| --- | --- | --- |
| Vehicle | LTO OR and CR, CTPL (comprehensive optional), 3+ photos | 10 years old or newer; listing pauses when registration or CTPL lapses |
| Driver | LTO Professional licence (front/back), NBI clearance (drug test optional) | 2+ years' experience |
| Individual | Government ID, selfie with ID, licence | Only for self-drive or listing; with-driver bookings need no ID |
| Business | DTI/SEC/CDA registration, mayor's permit (BIR 2303 optional) | Same: only for self-drive or listing |

## Commission

Set under **Admin → Commission**, saved in the database, and applied to new requests only.

- Renter service fee, default **10%**.
- Host commission per vehicle category, default **15%** (vans and pickups **18%**).
- Rating discounts, defaults: **−2 pts** at 4.0★ with 3+ trips, **−4** at 4.5★ with 5+, **−6** at 4.8★ with 10+; floor **5%**.

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack, port 3100) |
| `npm test` | Unit tests: availability, commission, booking lifecycle, webhook signatures |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm run build` | Production build (standalone output) |
| `npm run db:migrate` | Create a migration after editing `prisma/schema.prisma` |

## Going to production

1. **Database: PostgreSQL.** In `prisma/schema.prisma` set `provider = "postgresql"`, point `DATABASE_URL` at
   Postgres, delete `prisma/migrations`, and run `npx prisma migrate dev --name init` once to create a
   Postgres baseline. (`docker compose up -d` starts a local Postgres on port 5433.) The booking lock in
   `src/lib/locks.ts` switches to a Postgres advisory lock automatically.
2. **Environment.** `APP_URL`, `SESSION_SECRET`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET` are required.
   The app refuses to start without them ([`src/lib/env.ts`](src/lib/env.ts)).
3. **PayMongo webhook.** Create one for `<APP_URL>/api/webhooks/paymongo`, event `checkout_session.payment.paid`.
4. **File storage.** Photos and documents are written to `STORAGE_DIR`. Use a persistent volume, or replace
   the two functions in [`src/lib/storage.ts`](src/lib/storage.ts) with S3-compatible storage.
5. **Run.** `docker build -t downtime .` then run with your env file; migrations run on start. Health check:
   `GET /api/health`.
6. **Reverse proxy.** Run behind a proxy or host (Vercel, Nginx, a load balancer) that sets `X-Real-IP` or
   appends the client address to `X-Forwarded-For`. Rate limits read the address the proxy sets, never the
   one the visitor sends. Never expose `npm run dev` to the internet; production runs `next start` / Docker.
7. **Email and SMS.** Set `RESEND_API_KEY`, `EMAIL_FROM` and `SEMAPHORE_API_KEY`; without them, production marks
   messages Failed (password resets included).
8. **Before launch.** Have counsel finish `/terms` and `/privacy` (both marked as drafts), register with the
   National Privacy Commission if required, and confirm whether rent-a-car with driver needs LTFRB/DOT accreditation.

## Free test site (Vercel + Supabase)

A free demo deployment. Vercel's free plan is **non-commercial**: use it to test and show the site, and move to
Vercel Pro (or a VPS) before taking real paid bookings. Local development keeps using SQLite; the build on Vercel
switches to PostgreSQL automatically (`scripts/postgres-schema.mjs`, run by `npm run vercel-build`).

1. **Supabase** (https://supabase.com, sign in with GitHub): New project, region **Singapore**, save the database
   password. Then Storage → New bucket `grace-files`, **Private** (leave "Public bucket" off).
2. **Fill `.env.production.local`** (already created locally with a generated `SESSION_SECRET`; never committed):
   the Supabase pooler and direct connection strings, project URL and service_role key, and PayMongo **test** key.
3. **Vercel** (https://vercel.com, sign in with GitHub): Add New → Project → import the GitHub repo. Before
   deploying, Environment Variables → paste the whole `.env.production.local`. Deploy. Then set `APP_URL` to the
   address Vercel gives you and redeploy.
4. **First admin on the live database**: put your email and password in PowerShell, then `npm run live:admin`:
   `$env:ADMIN_EMAIL="you@gmail.com"`, `$env:ADMIN_PASSWORD="a-long-password"`, `npm run live:admin`.
5. **PayMongo webhook**: Developers → Webhooks → `<APP_URL>/api/webhooks/paymongo`, event
   `checkout_session.payment.paid`; put its secret in Vercel as `PAYMONGO_WEBHOOK_SECRET` and redeploy.

The live site starts empty (no demo accounts). List the launch cars through the site as a car owner.

## Built-in safeguards

- **Passwords:** bcrypt. Login limits per 15 minutes: 5 failures per email from one address, 20 per address,
  50 per email from everywhere. Logins take the same time whether or not the email exists.
- **Password reset:** one-time link, 30 minutes, only its hash stored, never written to the message log; claimed
  atomically. The reply is identical whether or not the account exists. A reset or password change signs out
  every other session.
- **Sessions:** signed (HS256), HTTP-only, SameSite=Lax, Secure in production; suspended accounts are locked out
  of every action (`/suspended`).
- **Rate limits:** sign-up (5 per hour per address), reset requests, and the help chat (20 per 10 minutes per
  address, plus a global hourly cap on AI answers so the API bill can't be run up).
- **Uploads:** real file type checked from the bytes (JPEG, PNG, WebP, PDF), size-limited, served only to the owner,
  the other booking party or admins, under a sandboxed no-script policy.
- **Re-review:** changing a car's plate, model, year, category or OR/CR/CTPL expiry, or an account's ID or licence
  details, sends it back to GRace review. Payout-detail changes are audited and the owner is emailed.
- **Bookings:** prices and commission computed on the server and snapshotted; a per-vehicle lock stops double
  bookings; status changes follow `src/lib/lifecycle.ts`.
- **Payments:** webhook signatures verified (HMAC-SHA256, timing-safe), events older than 5 minutes refused, test
  events ignored with live keys; handling is idempotent.
- **Dev shortcuts** (simulated payments, email/SMS, on-screen reset links) only work when the app runs on localhost.
- **Admin:** hidden sign-in, 404 for everyone else, every decision and money action in an append-only audit log.
- **Browser:** Content-Security-Policy (own scripts only, no framing, forms post only to us or PayMongo),
  nosniff, frame denial, COOP, referrer and permissions policies, HSTS in production.
- **Seed:** refuses to run against anything but a local SQLite file.

## Project layout

```
prisma/              schema, migrations, demo seed
src/lib/             availability, commission, lifecycle, payments/PayMongo, requirements, storage, session
src/app/actions/     server actions: auth, account, vehicles, driver, bookings, inspections, reviews, admin
src/app/(public)/    home, /explore, /listing/[id], terms, privacy
src/app/(app)/       dashboard, bookings (+ detail with handoff), fleet, driver, account, team
src/app/admin/       overview, applications, bookings & issues, payouts & refunds, commission, audit
src/app/api/         files (access-checked), PayMongo webhook, health
```
