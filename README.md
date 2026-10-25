# Downtime

A Philippine car-rental marketplace. Verified owners list their cars for the days they don't use them;
individuals and businesses rent them **self-drive** or **with the owner as driver**. Downtime earns a
renter service fee plus a host commission on every booking, and the commission drops as the driver's
rating rises.

## Quick start

Needs Node 20+. Local development uses a SQLite file, so there is nothing else to install.

```bash
npm install
cp .env.example .env        # then set SESSION_SECRET (the file says how)
npm run setup               # creates the database and loads demo data
npm run dev                 # http://localhost:3000
```

Demo accounts and their shared password are in [`prisma/seed.ts`](prisma/seed.ts). Reset the demo data
any time with `npm run db:seed`.

| Try it as | Account |
| --- | --- |
| Renter with a licence (self-drive) | Ana Santos |
| Business renter | Mabilis Logistics Inc. |
| Your own fleet: Vios black, L300 | Downtime Fleet |
| Partner owner: Avanza, Veloz | Reyes Transport Services |
| Owner-driver: Vios metallic blue | Carlo Mendoza |
| Unverified renter: can book with driver, not self-drive | Paolo Garcia |
| Downtime staff | admin account → `/admin` |

Without PayMongo keys, payments are **simulated** in development: "Pay" confirms the booking at once.

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
| `npm run dev` | Dev server |
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
6. **Before launch.** Have counsel finish `/terms` and `/privacy` (both marked as drafts), register with the
   National Privacy Commission if required, and confirm whether rent-a-car with driver needs LTFRB/DOT accreditation.

## Built-in safeguards

- Passwords: bcrypt; login lockout after 5 failed attempts per email (20 per IP) in 15 minutes.
- Sessions: signed, HTTP-only cookies.
- Uploads: real file type checked from the bytes, size-limited, served only to the owner, the other booking party or admins.
- Bookings: a per-vehicle lock stops two approvals or payments for the same dates.
- Payments: webhook signatures verified (HMAC-SHA256); handling is idempotent.
- Admin: every admin decision and money action goes to an append-only audit log.
- Security headers: frame denial, nosniff, referrer and permissions policies, HSTS in production.

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
