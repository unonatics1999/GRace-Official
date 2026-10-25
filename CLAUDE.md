# CLAUDE.md

Instructions for AI agents working in this repository. The README covers setup, commands, the booking
flow, verification rules, commission and the production checklist. Read it first.

## What this is

**Downtime**: a Philippine car-rental marketplace. Verified owners list cars for the days they don't use
them; individuals and businesses rent them self-drive or with the owner as driver. The platform earns a
renter service fee plus a host commission on every booking. It is a standalone project, unrelated to any
other repository on this machine.

## Product decisions (from the owner)

- **Market:** Philippines first. Pesos (centavos in the DB), Manila calendar (`src/lib/dates.ts`).
- **Renters:** individuals and businesses, both verified before booking.
- **Owners:** a mix of the platform owner's own cars and partner owners. The owner applies with their car
  and themselves as its driver; admin reviews PH documents (`src/lib/requirements.ts`).
- **Launch fleet:** Toyota Vios black, Vios metallic blue, Avanza black, Veloz black, Mitsubishi L300.
- **Commission:** admin-set (`/admin/commission`): a base rate per vehicle category plus driver-rating
  tiers. Higher rating = lower commission (host keeps more). This direction is still to be confirmed by the owner.
- **Payments:** PayMongo hosted checkout; simulated in development when no key is set. Host payouts are
  manual (bank/GCash), recorded by admin.
- **Differentiator built first:** the photo handoff checklist at pick-up and return.
- **Photos:** the owner wants real photos of the actual cars, uploaded through the fleet page. Never use
  stock or scraped images.

## Conventions

- Next.js 15 App Router with server actions; Prisma; Tailwind 4. Pure business rules live in `src/lib`
  (availability, commission, lifecycle) with Vitest tests. Keep them pure and tested.
- Every money or admin action writes an audit log entry (`src/lib/audit.ts`).
- Booking prices and commission are snapshotted on the booking; never recompute old bookings.
- Uploaded files are checked by magic bytes and served only through `/api/files/[kind]/[id]`.
- Local dev uses SQLite; production is PostgreSQL (switch steps in the README). Docker Desktop doesn't
  start on the owner's PC yet.
- Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` before committing.
- Commits: Conventional Commits, under the user's git identity, with no `Co-Authored-By` or
  "Generated with" lines.
- On Windows PowerShell 5.1, give the user commands one per line: `&&` doesn't work there.

## Open questions for the owner

1. Commission direction (above).
2. Cancellation and refund policy.
3. Who pays fuel, tolls, parking, driver meals and lodging.
4. Damage cover: deposit, insurance partner, or owner's comprehensive.
5. Email and/or SMS provider (also needed for password reset).
6. Payment window after approval (currently 24 h).
7. LTFRB/DOT accreditation for rent-a-car with driver; NPC registration.
8. Keep the brand name "Downtime"?
9. PayMongo test keys for live checkout testing.

## Not built yet

Email/SMS notifications and password reset, live PayMongo testing, PostgreSQL run, S3 storage,
automatic host payouts.
