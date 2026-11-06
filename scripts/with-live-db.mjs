// Runs a command against the LIVE database (Supabase), e.g. creating the first admin:
//   npm run live:admin
// Reads settings from .env.production.local (never committed), switches the Prisma client to
// PostgreSQL for the command, then switches it back to SQLite for local development.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const file = ".env.production.local";
if (!existsSync(file)) throw new Error(`${file} not found. Fill it in first (see README, "Free test site").`);
const liveEnv = Object.fromEntries(
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);
for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
  if (!liveEnv[key] || liveEnv[key].includes("PASTE")) throw new Error(`Set ${key} in ${file}.`);
}

const env = { ...process.env, ...liveEnv, NODE_ENV: "production" };
const run = (cmd, e = env) => execSync(cmd, { stdio: "inherit", env: e });
const command = process.argv.slice(2).join(" ");

run("node scripts/postgres-schema.mjs");
run("npx prisma generate --schema prisma/postgres/schema.prisma");
try {
  run(command);
} finally {
  // Back to the local SQLite client.
  run("npx prisma generate", process.env);
}
