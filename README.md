# Downtime

Businesses rent their idle vans, trucks and pickups to other **verified businesses** — only on the
days those vehicles would otherwise sit parked. One business's downtime is another business's peak.

Product spec: [Downtime — B2B Idle Fleet Rental MVP](https://claude.ai/artifact/P6wdjxDNk2YiQZgwaGN8FA)

## Quick start

Needs Node 20+. No Docker: local development uses a SQLite file.

```bash
npm install
cp .env.example .env        # then set SESSION_SECRET (the file says how)
npm run setup               # creates the database and loads demo data
npm run dev                 # http://localhost:3000
```

Demo accounts and their shared password are listed in [`prisma/seed.ts`](prisma/seed.ts). Reset the
demo data any time with `npm run db:seed`.

| Try this as | Account |
| --- | --- |
| A renter | Frost Snow Removal |
| A host | Green Thumb Landscaping (pickups idle all winter) or Fresh Plate Catering (van idle Mon–Wed) |
| A company waiting for verification | Bloom Florist |
| Downtime staff | the admin account (admin console at `/admin`) |

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm test` | Unit tests (the availability rule and pricing) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `npm run db:migrate` | Create a migration after editing `prisma/schema.prisma` |

## Stack

Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS 4 · Prisma 6 · SQLite in development
(PostgreSQL in production) · `jose` signed session cookies · bcrypt · Zod · Vitest.

## How it's organised

```
prisma/              schema, migrations, demo seed
src/lib/             availability.ts (the core rule), session, dates, constants
src/app/actions/     server actions: auth, team, vehicles, bookings, admin
src/app/(public)/    landing page, /explore marketplace, /listing/[id] with the booking box
src/app/(auth)/      log in, sign up
src/app/(app)/       signed-in company app: dashboard, fleet, bookings, team
src/app/admin/       admin console: overview, companies, vehicles, bookings, users
src/components/      shared UI
```

**The core rule** (`src/lib/availability.ts`): a vehicle can be booked for a period only if every
day falls inside one of the host's downtime windows **and** no confirmed booking overlaps it. Confirming
a booking re-checks this inside a transaction.

## What's built (MVP sprints 1–3)

- [x] Company sign-up, log in, log out; roles: Owner, Fleet manager, Driver
- [x] Team management (owner adds members with a temporary password)
- [x] Admin verification queue; only verified companies list publicly or book
- [x] Vehicles with equipment tags and daily rate; pause / resume a listing
- [x] Downtime windows: weekly patterns and date ranges; 28-day availability calendar
- [x] Search by type, city and dates, showing only vehicles idle for every requested day
- [x] Booking request with a price quote (10% renter fee, 15% host fee); approve, decline, cancel
- [x] Dashboard: earnings from idle days, open requests, recent activity
- [x] Public marketplace: browse without an account, listing pages with an availability calendar and live quote
- [x] Admin console: marketplace metrics; verify, reject, suspend and reinstate companies; hide listings; cancel bookings; search users

## Next

- [ ] Payments and weekly payouts (Stripe Connect)
- [ ] Photo check-out / check-in checklist, signed by both sides
- [ ] Reviews; instant-book for trusted renters
- [ ] Net-30 invoices with PO numbers
- [ ] Email notifications for booking events
- [ ] Insurance quote attached to each booking
- [ ] Switch to PostgreSQL and deploy
