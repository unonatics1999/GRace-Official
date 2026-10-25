// Demo data for local development: the five launch vehicles, their owners and drivers, two
// renters and an applicant waiting for review. Every demo account uses the password below.
// Never run this against production.

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_COMMISSION, hostCommissionBps, priceBooking } from "../src/lib/commission";

const db = new PrismaClient();
const DEMO_PASSWORD = "downtime-demo";

function day(offset: number): Date {
  const now = new Date();
  const manila = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now);
  const d = new Date(`${manila}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

const peso = (n: number) => n * 100;

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Children before parents.
  await db.review.deleteMany();
  await db.photo.deleteMany();
  await db.inspection.deleteMany();
  await db.payout.deleteMany();
  await db.payment.deleteMany();
  await db.booking.deleteMany();
  await db.document.deleteMany();
  await db.vehiclePhoto.deleteMany();
  await db.downtimeWindow.deleteMany();
  await db.vehicle.deleteMany();
  await db.driver.deleteMany();
  await db.auditLog.deleteMany();
  await db.loginAttempt.deleteMany();
  await db.user.deleteMany();
  await db.company.deleteMany();
  await db.setting.deleteMany();

  await db.user.create({ data: { email: "admin@downtime.test", name: "GRace Admin", passwordHash, isAdmin: true } });

  /** A verified host account whose owner is also an approved driver. */
  async function host(opts: {
    kind: "INDIVIDUAL" | "BUSINESS";
    name: string;
    city: string;
    email: string;
    person: string;
    ratingSum: number;
    ratingCount: number;
    years: number;
  }) {
    const company = await db.company.create({
      data: {
        kind: opts.kind,
        accountType: "OWNER",
        name: opts.name,
        city: opts.city,
        status: "VERIFIED",
        phone: "09171234567",
        address: `${opts.city}, Metro Manila`,
        registrationNo: opts.kind === "BUSINESS" ? "SEC-2019-004512" : "",
        tin: opts.kind === "BUSINESS" ? "123-456-789-000" : "",
        govIdType: opts.kind === "INDIVIDUAL" ? "PhilSys National ID" : "",
        govIdNumber: opts.kind === "INDIVIDUAL" ? "1234-5678-9012-3456" : "",
        payoutDetails: "GCash 0917 123 4567",
        users: { create: { email: opts.email, name: opts.person, passwordHash, role: "OWNER" } },
      },
      include: { users: true },
    });
    const driver = await db.driver.create({
      data: {
        userId: company.users[0].id,
        licenceNo: "N01-23-456789",
        licenceType: "PROFESSIONAL",
        licenceExpiry: day(700),
        yearsExperience: opts.years,
        status: "APPROVED",
        ratingSum: opts.ratingSum,
        ratingCount: opts.ratingCount,
      },
    });
    return { company, driver };
  }

  // Your own fleet (the platform owner hosting too) plus two partner owners.
  const own = await host({ kind: "BUSINESS", name: "GRace Fleet", city: "Quezon City", email: "fleet@downtime.test", person: "Fleet Manager", ratingSum: 147, ratingCount: 30, years: 8 });
  const reyes = await host({ kind: "BUSINESS", name: "Reyes Transport Services", city: "Pasig", email: "mark@reyestransport.test", person: "Mark Reyes", ratingSum: 46, ratingCount: 10, years: 6 });
  const carlo = await host({ kind: "INDIVIDUAL", name: "Carlo Mendoza", city: "Makati", email: "carlo@mendoza.test", person: "Carlo Mendoza", ratingSum: 13, ratingCount: 3, years: 3 });

  const base = { reviewStatus: "APPROVED", registrationExpiry: day(240), insuranceExpiry: day(200), transmission: "AT", fuelType: "GASOLINE" };

  await db.vehicle.create({
    data: {
      ...base,
      companyId: own.company.id,
      driverId: own.driver.id,
      type: "SEDAN",
      make: "Toyota",
      model: "Vios",
      year: 2023,
      color: "Black",
      colorHex: "#15171b",
      plateNumber: "NDT 1023",
      seats: 5,
      equipment: "dashcam,phone mount,USB charging",
      description: "Clean, fuel-efficient sedan for city errands, client meetings and airport runs. Smoke-free.",
      city: "Quezon City",
      dailyRateCents: peso(1800),
      driverDailyRateCents: peso(1000),
      windows: { create: { kind: "WEEKLY", weekdays: "0,1,2,3,4,5,6" } },
    },
  });
  await db.vehicle.create({
    data: {
      ...base,
      companyId: carlo.company.id,
      driverId: carlo.driver.id,
      type: "SEDAN",
      make: "Toyota",
      model: "Vios",
      year: 2022,
      color: "Metallic Blue",
      colorHex: "#1f4b8f",
      plateNumber: "NCM 4471",
      seats: 5,
      equipment: "dashcam,Bluetooth audio",
      description: "Metallic blue Vios, owner-driven. Free on weekdays while I work from home.",
      city: "Makati",
      dailyRateCents: peso(1700),
      driverDailyRateCents: peso(900),
      windows: { create: { kind: "WEEKLY", weekdays: "1,2,3,4,5" } },
    },
  });
  await db.vehicle.create({
    data: {
      ...base,
      companyId: reyes.company.id,
      driverId: reyes.driver.id,
      type: "MPV",
      make: "Toyota",
      model: "Avanza",
      year: 2022,
      color: "Black",
      colorHex: "#16181c",
      plateNumber: "NRT 2290",
      seats: 7,
      equipment: "roof rack,dashcam,rear AC",
      description: "Seven-seater for family trips and team transport. Roof rack for luggage.",
      city: "Pasig",
      dailyRateCents: peso(2500),
      driverDailyRateCents: peso(1100),
      windows: { create: { kind: "RANGE", startDate: day(0), endDate: day(120) } },
    },
  });
  await db.vehicle.create({
    data: {
      ...base,
      companyId: reyes.company.id,
      driverId: reyes.driver.id,
      type: "MPV",
      make: "Toyota",
      model: "Veloz",
      year: 2024,
      color: "Black",
      colorHex: "#121418",
      plateNumber: "NRT 3105",
      seats: 7,
      equipment: "360 camera,Apple CarPlay,rear AC",
      description: "Newest Veloz with a 360° camera and CarPlay. Great for out-of-town trips.",
      city: "Pasig",
      dailyRateCents: peso(3000),
      driverDailyRateCents: peso(1200),
      windows: { create: { kind: "WEEKLY", weekdays: "0,5,6" } },
    },
  });
  await db.vehicle.create({
    data: {
      ...base,
      companyId: own.company.id,
      driverId: own.driver.id,
      type: "VAN",
      make: "Mitsubishi",
      model: "L300",
      year: 2021,
      color: "White",
      colorHex: "#e9ebee",
      plateNumber: "NDT 7788",
      seats: 3,
      transmission: "MT",
      fuelType: "DIESEL",
      equipment: "cargo area,tie-downs",
      description: "Workhorse cargo van for deliveries and moving. Driver available on request.",
      city: "Quezon City",
      dailyRateCents: peso(3500),
      driverDailyRateCents: peso(1200),
      windows: { create: { kind: "WEEKLY", weekdays: "1,2,3,4,5,6" } },
    },
  });

  // Renters: a verified individual with a licence on file, and a verified business.
  await db.company.create({
    data: {
      kind: "INDIVIDUAL",
      name: "Ana Santos",
      city: "Quezon City",
      status: "VERIFIED",
      phone: "09181234567",
      govIdType: "Passport",
      govIdNumber: "P1234567A",
      licenceNo: "N02-19-123456",
      licenceExpiry: day(400),
      users: { create: { email: "ana@santos.test", name: "Ana Santos", passwordHash, role: "OWNER" } },
    },
  });
  await db.company.create({
    data: {
      kind: "BUSINESS",
      name: "Mabilis Logistics Inc.",
      city: "Taguig",
      status: "VERIFIED",
      phone: "0288881234",
      registrationNo: "SEC-2020-118877",
      tin: "987-654-321-000",
      users: { create: { email: "ops@mabilis.test", name: "Joy Villanueva", passwordHash, role: "OWNER" } },
    },
  });

  // An owner who applied and is waiting for review.
  await db.company.create({
    data: {
      kind: "INDIVIDUAL",
      name: "Paolo Garcia",
      city: "Mandaluyong",
      status: "PENDING",
      phone: "09191234567",
      govIdType: "UMID",
      govIdNumber: "0111-2345678-9",
      users: { create: { email: "paolo@garcia.test", name: "Paolo Garcia", passwordHash, role: "OWNER" } },
    },
  });

  await attachSeedPhotos();
  await seedBookingHistory();

  console.log(`Seeded demo data. Every demo account's password is "${DEMO_PASSWORD}".`);
}

// Representative photos (Wikimedia Commons, CC BY-SA 4.0) from prisma/seed-photos, fetched with
// `node scripts/import-commons-photos.mjs`. Cover first; credits shown on every listing.
const SEED_PHOTOS: Record<string, { key: string; order: number[] }> = {
  "NDT 1023": { key: "vios-black", order: [1, 2, 3, 5, 4] },
  "NCM 4471": { key: "vios-blue", order: [1, 2, 3, 4, 5] },
  "NRT 2290": { key: "avanza-black", order: [1, 2, 4, 3, 5] },
  "NRT 3105": { key: "veloz-black", order: [3, 1, 2, 4, 5] },
  "NDT 7788": { key: "l300-white", order: [4, 3, 2, 1, 5] },
};

type Credit = { file: string; author: string; licence: string; source: string };

async function attachSeedPhotos() {
  const creditsFile = path.resolve("prisma/seed-photos/credits.json");
  if (!existsSync(creditsFile)) {
    console.log("No seed photos found; listings will use artwork. Run: node scripts/import-commons-photos.mjs");
    return;
  }
  const credits: Credit[] = JSON.parse(await readFile(creditsFile, "utf8"));
  const storage = path.resolve(process.env.STORAGE_DIR ?? "./storage");
  await rm(path.join(storage, "vehicles"), { recursive: true, force: true });

  for (const [plate, { key, order }] of Object.entries(SEED_PHOTOS)) {
    const vehicle = await db.vehicle.findFirst({ where: { plateNumber: plate } });
    if (!vehicle) continue;
    for (const [position, n] of order.entries()) {
      const file = `${key}/${String(n).padStart(2, "0")}.jpg`;
      const credit = credits.find((c) => c.file === file);
      if (!credit) continue;
      const storageKey = `vehicles/${vehicle.id}/${randomUUID()}.jpg`;
      await mkdir(path.join(storage, path.dirname(storageKey)), { recursive: true });
      await copyFile(path.resolve("prisma/seed-photos", file), path.join(storage, storageKey));
      const { size } = await stat(path.join(storage, storageKey));
      await db.vehiclePhoto.create({
        data: {
          vehicleId: vehicle.id,
          storageKey,
          contentType: "image/jpeg",
          sizeBytes: size,
          position,
          representative: true,
          credit: `${credit.author}, ${credit.licence}`,
          sourceUrl: credit.source,
        },
      });
    }
  }
}

// DEMO DATA ONLY: sample review text for the seeded history, never used in production.
const DEMO_REVIEWS = [
  "Car was spotless and the pick-up photos made the handover quick. Will book again.",
  "Our driver knew every shortcut to NAIA. On time both ways, very professional.",
  "Booked for a family trip to Tagaytay. Clean, cold aircon, smooth ride.",
  "Used it for client visits all day. Easy booking, paid with GCash in a minute.",
  "Owner was friendly and the car was exactly as listed. Return was hassle-free.",
  "The L300 was perfect for moving our office things. Fair price.",
  "First time renting self-drive. ID check was fast and the Vios drove like new.",
  "We needed a 7-seater for a wedding in Batangas. The Veloz was comfortable and our driver was courteous.",
  "Transparent pricing, no surprise charges at return. That alone makes me come back.",
  "Booked a car with driver for my parents' check-up in the city. Patient driver and very safe.",
  "The photo checklist gave me peace of mind. Both of us agreed on the car's condition in two minutes.",
  "Rented the Avanza for a weekend in Pampanga. Fuel-efficient and roomy for the barkada.",
];

/** Picks sample text that fits the trip: driver comments only on trips with a driver, self-drive ones only without. */
function demoReview(withDriver: boolean, n: number) {
  const fits = DEMO_REVIEWS.filter((t) => (/driver/i.test(t) ? withDriver : /self-drive/i.test(t) ? !withDriver : true));
  return fits[n % fits.length];
}

/**
 * About five months of finished, paid trips so the earnings report has something to show.
 * DEMO DATA ONLY: deterministic pseudo-random, marked "demo history" in each booking note.
 */
async function seedBookingHistory() {
  let seed = 20261025;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const renters = await db.company.findMany({ where: { accountType: "RENTER" }, include: { users: true } });
  const vehicles = await db.vehicle.findMany({ include: { driver: true } });
  const manilaTen = (d: Date, offsetDays: number) => new Date(d.getTime() + offsetDays * 86_400_000 + 2 * 3_600_000);
  const today = day(0);
  let created = 0;
  let reviews = 0;

  for (const v of vehicles) {
    // Busier cars get booked more often.
    const chance = v.type === "MPV" ? 0.16 : v.type === "VAN" ? 0.1 : 0.13;
    for (let offset = -150; offset <= -4; offset++) {
      if (rand() > chance) continue;
      const days = 1 + Math.floor(rand() * 3);
      const start = day(offset);
      const end = day(offset + days - 1);
      if (end >= today) break;
      const withDriver = v.withDriverAllowed && v.driver !== null && (!v.selfDriveAllowed || rand() < 0.45);
      const price = priceBooking({
        days,
        dailyRateCents: v.dailyRateCents,
        driverDailyRateCents: v.driverDailyRateCents,
        withDriver,
        renterFeeBps: DEFAULT_COMMISSION.renterFeeBps,
        hostCommissionBps: hostCommissionBps(DEFAULT_COMMISSION, v.type, withDriver ? v.driver : null),
      });
      const renter = renters[Math.floor(rand() * renters.length)];
      const cancelled = rand() < 0.05;
      const paidAt = manilaTen(start, -1 - Math.floor(rand() * 3));
      const payoutDay = new Date(end.getTime() + 5 * 86_400_000);

      const booking = await db.booking.create({
        data: {
          vehicleId: v.id,
          renterCompanyId: renter.id,
          requestedById: renter.users[0].id,
          mode: withDriver ? "WITH_DRIVER" : "SELF_DRIVE",
          driverId: withDriver ? v.driverId : null,
          startDate: start,
          endDate: end,
          days,
          vehicleCents: price.vehicleCents,
          driverCents: price.driverCents,
          renterFeeBps: price.renterFeeBps,
          renterFeeCents: price.renterFeeCents,
          hostCommissionBps: price.hostCommissionBps,
          hostFeeCents: price.hostFeeCents,
          status: cancelled ? "CANCELLED" : "COMPLETED",
          note: "demo history",
          approvedAt: new Date(paidAt.getTime() - 3_600_000),
          paidAt,
          pickedUpAt: cancelled ? null : manilaTen(start, 0),
          returnedAt: cancelled ? null : manilaTen(end, 0),
          payments: {
            create: {
              provider: "SIMULATED",
              amountCents: price.renterTotalCents,
              status: "PAID",
              paidAt,
              refundNeeded: cancelled,
              refundedAt: cancelled ? new Date(paidAt.getTime() + 2 * 86_400_000) : null,
            },
          },
          ...(cancelled
            ? {}
            : {
                payout: {
                  create: {
                    companyId: v.companyId,
                    amountCents: price.hostPayoutCents,
                    status: payoutDay < today ? "PAID" : "PENDING",
                    reference: payoutDay < today ? `GC-DEMO-${String(created + 1).padStart(4, "0")}` : "",
                    paidAt: payoutDay < today ? payoutDay : null,
                  },
                },
              }),
        },
      });
      if (!cancelled && rand() < 0.25) {
        await db.review.create({
          data: {
            bookingId: booking.id,
            authorId: renter.users[0].id,
            vehicleRating: rand() < 0.8 ? 5 : 4,
            driverRating: withDriver ? 5 : null,
            comment: demoReview(withDriver, reviews++),
            createdAt: manilaTen(end, 1),
          },
        });
      }
      created++;
      offset += days; // the car is out until it's back
    }
  }
  console.log(`Seeded ${created} demo bookings of history.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
