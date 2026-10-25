# CLAUDE.md

Instructions for AI agents working in this repository. The README covers setup, commands, the booking
flow, verification rules, commission and the production checklist. Read it first.

## What this is

**GRace Car Rental** ("G+Race"; the code and folder are still named `downtime`): a Philippine car-rental marketplace. Verified owners list cars for the days they don't use
them; individuals and businesses rent them self-drive or with the owner as driver. The platform earns a
renter service fee plus a host commission on every booking. It is a standalone project, unrelated to any
other repository on this machine.

## Product decisions (from the owner)

- **Market:** Philippines first. Pesos (centavos in the DB), Manila calendar (`src/lib/dates.ts`).
- **Renters:** individuals and businesses. Booking **with a driver needs no ID**, only a mobile number.
  Self-drive needs a verified ID and a valid licence. Rule: `src/lib/eligibility.ts`. Hosts must be verified.
- **Owners:** a mix of the platform owner's own cars and partner owners. The owner applies with their car
  and themselves as its driver; admin reviews PH documents (`src/lib/requirements.ts`).
- **Launch fleet:** Toyota Vios black, Vios metallic blue, Avanza black, Veloz black, Mitsubishi L300.
- **Commission:** admin-set (`/admin/commission`): a base rate per vehicle category plus driver-rating
  tiers. Higher rating = lower commission (host keeps more). This direction is still to be confirmed by the owner.
- **Payments:** PayMongo hosted checkout; simulated in development when no key is set. Host payouts are
  manual (bank/GCash), recorded by admin.
- **Differentiator built first:** the photo handoff checklist at pick-up and return.
- **Photos:** real photos of the actual cars, uploaded through the fleet page. Never scrape Google Images or use
  unlicensed stock. Freely licensed (e.g. Wikimedia Commons CC BY-SA) photos only with attribution and a
  "representative photo" label, and only with the owner's go-ahead.
- **Logins:** Renter and Car owner on `/login`; admins only on the unlinked `/staff-login`; `/admin` 404s for others.
- **Admin CRUD:** accounts, users, vehicles. Bookings and payments are never hard-deleted (audit trail).
- **Earnings report (`/admin/reports`):** cash basis, counted when the renter pays (Manila day); earnings =
  service fee + commission, gross of PayMongo fees; not VAT-registered, so no VAT split (revisit if that changes).
  Refunded bookings excluded. Logic in `src/lib/reports.ts`.
- **Help center:** `/help`, AI answers grounded only in `src/lib/help-content.ts` (keep it in sync with policy).

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
8. Brand is GRace Car Rental. A small "Grace Car Rental" already operates in Quezon City (Facebook): confirm the name is free on DTI BNRS and IPOPHL before registering.
9. PayMongo test keys for live checkout testing.

## Brand

Logo files in `public/brand/`: `grace-logo.svg` (square, mark with CAR RENTAL below) and `grace-mark.svg` (icon); `GraceMark` and `Logo` in `src/components/ui.tsx`;
browser icon `src/app/icon.svg`. Black `#111111` with orange `#ff6a00`; white RACE and CAR RENTAL.

## Not built yet

Email/SMS notifications and password reset, live PayMongo testing, PostgreSQL run, S3 storage,
automatic host payouts.
