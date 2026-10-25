// Load test: many people using Downtime at once. Run against a production build:
//
//   npm run build && npx next start -p 3200      (in one terminal)
//   BASE_URL=http://localhost:3200 npm run load-test
//
// Scenarios
//   1. Visitors browsing public pages (many concurrent users)
//   2. Signed-in renters and owners on their own pages
//   3. A burst of real logins at the same moment
//   4. A booking race: N conflicting requests for one car approved simultaneously.
//      Exactly one may win; the rest must stay requested (no double booking).
//
// Uses the demo seed data. Scenario 4 adds test bookings and removes them afterwards.

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const BASE = process.env.BASE_URL ?? "http://localhost:3200";
const DURATION_MS = Number(process.env.DURATION_S ?? 30) * 1000;
const VISITORS = Number(process.env.VISITORS ?? 100);
const MEMBERS = Number(process.env.MEMBERS ?? 50);
const LOGINS = Number(process.env.LOGINS ?? 30);
const RACERS = Number(process.env.RACERS ?? 20);
const DEMO_PASSWORD = "downtime-demo";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
const db = new PrismaClient();

// ── helpers ──────────────────────────────────────────────────────────────

function stats(name, samples, errors, elapsedMs) {
  const sorted = [...samples].sort((a, b) => a - b);
  const pct = (p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))].toFixed(0) : "-");
  const total = samples.length + errors.length;
  return {
    scenario: name,
    requests: total,
    "req/s": (total / (elapsedMs / 1000)).toFixed(1),
    "p50 ms": pct(50),
    "p95 ms": pct(95),
    "p99 ms": pct(99),
    "max ms": sorted.length ? sorted.at(-1).toFixed(0) : "-",
    errors: errors.length,
    "error %": total ? ((errors.length / total) * 100).toFixed(2) : "0",
  };
}

async function timed(url, init) {
  const t = performance.now();
  const res = await fetch(url, { redirect: "manual", ...init });
  await res.arrayBuffer();
  return { res, ms: performance.now() - t };
}

/** Run `users` loops in parallel for DURATION_MS, each picking a request from `next()`. */
async function soak(name, users, next) {
  const samples = [];
  const errors = [];
  const start = performance.now();
  const end = start + DURATION_MS;
  await Promise.all(
    Array.from({ length: users }, async (_, i) => {
      while (performance.now() < end) {
        const { url, init, ok = (s) => s < 400 } = next(i);
        try {
          const { res, ms } = await timed(url, init);
          if (ok(res.status)) samples.push(ms);
          else errors.push(`${res.status} ${url}`);
        } catch (e) {
          errors.push(`${e.cause?.code ?? e.message} ${url}`);
        }
      }
    }),
  );
  return { row: stats(name, samples, errors, performance.now() - start), errors };
}

async function sessionCookie(userId) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(env.SESSION_SECRET));
  return `dt_session=${token}`;
}

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** Hidden inputs of the first <form> whose markup contains `marker` (progressive-enhancement fields). */
function formFields(html, marker) {
  for (const form of html.match(/<form[\s\S]*?<\/form>/g) ?? []) {
    if (!form.includes(marker)) continue;
    const fields = new FormData();
    for (const input of form.match(/<input[^>]*type="hidden"[^>]*>/g) ?? []) {
      const name = input.match(/name="([^"]*)"/)?.[1];
      const value = input.match(/value="([^"]*)"/)?.[1] ?? "";
      if (name) fields.append(decode(name), decode(value));
    }
    return fields;
  }
  return null;
}

// ── scenarios ────────────────────────────────────────────────────────────

async function visitors() {
  const vehicles = await db.vehicle.findMany({ where: { reviewStatus: "APPROVED" }, select: { id: true } });
  const paths = [
    "/",
    "/explore",
    "/explore?type=SEDAN&start=2026-12-07&end=2026-12-08",
    "/help",
    "/api/health",
    ...vehicles.map((v) => `/listing/${v.id}`),
  ];
  return soak(`1. ${VISITORS} visitors browsing`, VISITORS, () => ({ url: BASE + paths[Math.floor(Math.random() * paths.length)] }));
}

async function members() {
  const users = await db.user.findMany({ where: { isAdmin: false, company: { status: "VERIFIED" } }, include: { company: true } });
  const sessions = await Promise.all(users.map(async (u) => ({ cookie: await sessionCookie(u.id), owner: u.company.accountType === "OWNER" })));
  return soak(`2. ${MEMBERS} signed-in users`, MEMBERS, (i) => {
    const s = sessions[i % sessions.length];
    const pages = s.owner ? ["/dashboard", "/fleet", "/bookings", "/account", "/driver"] : ["/bookings", "/account", "/explore"];
    // A redirect here would mean the session wasn't accepted.
    return { url: BASE + pages[Math.floor(Math.random() * pages.length)], init: { headers: { cookie: s.cookie } }, ok: (st) => st === 200 };
  });
}

async function loginBurst() {
  const html = await (await fetch(`${BASE}/login`)).text();
  const base = formFields(html, 'name="portal"');
  if (!base) throw new Error("Couldn't find the login form fields.");
  const emails = ["ana@santos.test", "ops@mabilis.test", "fleet@downtime.test", "mark@reyestransport.test", "carlo@mendoza.test"];
  const start = performance.now();
  const results = await Promise.all(
    Array.from({ length: LOGINS }, async (_, i) => {
      const form = new FormData();
      for (const [k, v] of base) form.append(k, v);
      form.set("email", emails[i % emails.length]);
      form.set("password", DEMO_PASSWORD);
      form.set("portal", i % 2 ? "OWNER" : "RENTER");
      try {
        const { res, ms } = await timed(`${BASE}/login`, { method: "POST", body: form });
        // Success = a session cookie was issued.
        return { ms, ok: (res.headers.get("set-cookie") ?? "").includes("dt_session="), status: res.status };
      } catch (e) {
        return { ms: 0, ok: false, status: e.cause?.code ?? e.message };
      }
    }),
  );
  const errors = results.filter((r) => !r.ok).map((r) => String(r.status));
  return { row: stats(`3. ${LOGINS} logins at once`, results.filter((r) => r.ok).map((r) => r.ms), errors, performance.now() - start), errors };
}

async function bookingRace() {
  const vehicle = await db.vehicle.findFirst({ where: { model: "Avanza" }, include: { company: { include: { users: true } } } });
  const renters = await db.company.findMany({ where: { accountType: "RENTER", status: "VERIFIED" }, include: { users: true } });
  const host = vehicle.company.users[0];
  const day = (s) => new Date(`${s}T00:00:00.000Z`);
  const created = [];
  for (let i = 0; i < RACERS; i++) {
    const renter = renters[i % renters.length];
    created.push(
      await db.booking.create({
        data: {
          vehicleId: vehicle.id,
          renterCompanyId: renter.id,
          requestedById: renter.users[0].id,
          mode: "WITH_DRIVER",
          driverId: vehicle.driverId,
          startDate: day("2027-01-20"),
          endDate: day("2027-01-21"),
          days: 2,
          vehicleCents: 500000,
          driverCents: 220000,
          renterFeeBps: 1000,
          renterFeeCents: 72000,
          hostCommissionBps: 1100,
          hostFeeCents: 79200,
          note: "load-test",
        },
      }),
    );
  }

  const cookie = await sessionCookie(host.id);
  const forms = await Promise.all(
    created.map(async (b) => {
      const html = await (await fetch(`${BASE}/bookings/${b.id}`, { headers: { cookie } })).text();
      return { id: b.id, fields: formFields(html, ">Approve<") };
    }),
  );
  const missing = forms.filter((f) => !f.fields).length;

  // Fire every approval at the same moment.
  const start = performance.now();
  const results = await Promise.all(
    forms
      .filter((f) => f.fields)
      .map(async (f) => {
        try {
          const { res, ms } = await timed(`${BASE}/bookings/${f.id}`, { method: "POST", body: f.fields, headers: { cookie } });
          return { ms, status: res.status };
        } catch (e) {
          return { ms: 0, status: e.cause?.code ?? e.message };
        }
      }),
  );
  const elapsed = performance.now() - start;

  const after = await db.booking.findMany({ where: { id: { in: created.map((b) => b.id) } }, select: { status: true } });
  const approved = after.filter((b) => b.status === "AWAITING_PAYMENT").length;
  const stillRequested = after.filter((b) => b.status === "REQUESTED").length;
  const serverErrors = results.filter((r) => typeof r.status !== "number" || r.status >= 500).map((r) => String(r.status));

  await db.booking.deleteMany({ where: { id: { in: created.map((b) => b.id) } } });

  return {
    row: stats(
      `4. ${RACERS} approvals racing for one car`,
      results.filter((r) => typeof r.status === "number" && r.status < 500).map((r) => r.ms),
      serverErrors,
      elapsed,
    ),
    race: { approved, stillRequested, formsNotFound: missing, passed: approved === 1 && missing === 0 },
    errors: serverErrors,
  };
}

// ── run ──────────────────────────────────────────────────────────────────

const health = await fetch(`${BASE}/api/health`).catch(() => null);
if (!health?.ok) {
  console.error(`Server not reachable at ${BASE}. Start it first (npm run build && npx next start -p 3200).`);
  process.exit(1);
}

const rows = [];
const notes = [];
for (const run of [visitors, members, loginBurst, bookingRace]) {
  process.stdout.write(`Running ${run.name}…\n`);
  const result = await run();
  rows.push(result.row);
  if (result.race) notes.push(`Booking race: ${result.race.approved} approved, ${result.race.stillRequested} still requested -> ${result.race.passed ? "PASS (no double booking)" : "FAIL"}`);
  const sample = [...new Set(result.errors)].slice(0, 5);
  if (sample.length) notes.push(`${result.row.scenario} sample errors: ${sample.join(" | ")}`);
}
console.table(rows);
for (const n of notes) console.log(n);
const healthAfter = await fetch(`${BASE}/api/health`).catch(() => null);
console.log(`Server still healthy afterwards: ${healthAfter?.ok ? "yes" : "NO"}`);
await db.$disconnect();
