// Demo data for local development. Every demo account uses the password below.
// Never run this against production.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const DEMO_PASSWORD = "downtime-demo";

function day(offset: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await db.booking.deleteMany();
  await db.downtimeWindow.deleteMany();
  await db.vehicle.deleteMany();
  await db.user.deleteMany();
  await db.company.deleteMany();

  await db.user.create({
    data: { email: "admin@downtime.test", name: "Dana Admin", passwordHash, isAdmin: true },
  });

  const greenThumb = await db.company.create({
    data: {
      name: "Green Thumb Landscaping",
      city: "Denver",
      status: "VERIFIED",
      users: { create: { email: "sam@greenthumb.test", name: "Sam Rivera", passwordHash, role: "OWNER" } },
    },
  });
  const freshPlate = await db.company.create({
    data: {
      name: "Fresh Plate Catering",
      city: "Denver",
      status: "VERIFIED",
      users: { create: { email: "lee@freshplate.test", name: "Lee Chen", passwordHash, role: "OWNER" } },
    },
  });
  await db.company.create({
    data: {
      name: "Frost Snow Removal",
      city: "Denver",
      status: "VERIFIED",
      users: { create: { email: "alex@frostsnow.test", name: "Alex Morgan", passwordHash, role: "OWNER" } },
    },
  });
  await db.company.create({
    data: {
      name: "Bloom Florist",
      city: "Denver",
      status: "PENDING",
      users: { create: { email: "kim@bloom.test", name: "Kim Patel", passwordHash, role: "OWNER" } },
    },
  });

  // The landscaper's pickups sit idle for the next four months (their off-season).
  for (const name of ["F-150 #1", "F-150 #2"]) {
    await db.vehicle.create({
      data: {
        companyId: greenThumb.id,
        name,
        type: "PICKUP",
        year: 2021,
        equipment: "plow mount,tow hitch",
        dailyRateCents: 8500,
        city: "Denver",
        windows: { create: { kind: "RANGE", startDate: day(0), endDate: day(120) } },
      },
    });
  }

  // The caterer's van is free Monday to Wednesday every week.
  await db.vehicle.create({
    data: {
      companyId: freshPlate.id,
      name: "White Transit",
      type: "CARGO_VAN",
      year: 2022,
      equipment: "refrigeration,shelving",
      dailyRateCents: 9000,
      city: "Denver",
      windows: { create: { kind: "WEEKLY", weekdays: "1,2,3" } },
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
