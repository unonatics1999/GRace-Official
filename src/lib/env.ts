import { z } from "zod";

// Validated once, on first use. Production refuses to run without the settings that make
// payments and links work; development fills sensible defaults.

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
    APP_URL: z.string().url().optional(),
    PAYMONGO_SECRET_KEY: z.string().optional(),
    PAYMONGO_WEBHOOK_SECRET: z.string().optional(),
    STORAGE_DIR: z.string().default("./storage"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    for (const key of ["APP_URL", "PAYMONGO_SECRET_KEY", "PAYMONGO_WEBHOOK_SECRET"] as const) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: `${key} is required in production` });
    }
  });

export type Env = z.infer<typeof schema> & { APP_URL: string };

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration (see .env.example):\n${problems}`);
  }
  cached = { ...parsed.data, APP_URL: parsed.data.APP_URL ?? "http://localhost:3000" };
  return cached;
}

/** Payments run against PayMongo when a key is set; otherwise (development only) they're simulated. */
export function paymentsSimulated(): boolean {
  const e = env();
  return !e.PAYMONGO_SECRET_KEY && e.NODE_ENV !== "production";
}
