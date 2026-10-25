// Creates a Downtime admin, or resets an existing admin's password.
//
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run admin:create
//
// (PowerShell: $env:ADMIN_EMAIL="you@example.com"; $env:ADMIN_PASSWORD="..."; npm run admin:create)
// Use this on a fresh production database instead of the demo seed. Admins sign in at /staff-login.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME?.trim() || "Downtime Admin";
  if (!email || !email.includes("@")) throw new Error("Set ADMIN_EMAIL.");
  if (password.length < 12) throw new Error("Set ADMIN_PASSWORD to at least 12 characters.");

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing && !existing.isAdmin) throw new Error(`${email} belongs to a renter/owner account; use a different email.`);

  await db.user.upsert({
    where: { email },
    create: { email, name, passwordHash, isAdmin: true },
    update: { passwordHash, name },
  });
  console.log(`${existing ? "Updated" : "Created"} admin ${email}. Sign in at /staff-login.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
