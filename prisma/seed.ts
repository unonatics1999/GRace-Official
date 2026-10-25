// Demo data for local development: the five launch vehicles, their owners and drivers, two
// renters and an applicant waiting for review. Every demo account uses the password below.
// Never run this against production.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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

  await db.user.create({ data: { email: "admin@downtime.test", name: "Downtime Admin", passwordHash, isAdmin: true } });

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
  const own = await host({ kind: "BUSINESS", name: "Downtime Fleet", city: "Quezon City", email: "fleet@downtime.test", person: "Fleet Manager", ratingSum: 147, ratingCount: 30, years: 8 });
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

  console.log(`Seeded demo data. Every demo account's password is "${DEMO_PASSWORD}".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
