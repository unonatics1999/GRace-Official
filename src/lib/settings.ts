import { z } from "zod";
import { DEFAULT_COMMISSION, type CommissionSettings } from "./commission";
import { db } from "./db";

const COMMISSION_KEY = "commission";

const bps = z.number().int().min(0).max(5000);
export const commissionSchema = z.object({
  renterFeeBps: bps,
  baseBps: z.record(z.string(), bps),
  tiers: z.array(
    z.object({
      minRating: z.number().min(1).max(5),
      minReviews: z.number().int().min(1).max(1000),
      discountBps: bps,
    }),
  ),
  floorBps: bps,
});

/** The admin's commission settings, or the defaults until they've been saved once. */
export async function getCommissionSettings(): Promise<CommissionSettings> {
  const row = await db.setting.findUnique({ where: { key: COMMISSION_KEY } });
  if (!row) return DEFAULT_COMMISSION;
  const parsed = commissionSchema.safeParse(JSON.parse(row.value));
  if (!parsed.success) return DEFAULT_COMMISSION;
  return { ...parsed.data, baseBps: { ...DEFAULT_COMMISSION.baseBps, ...parsed.data.baseBps } };
}

export async function saveCommissionSettings(settings: CommissionSettings): Promise<void> {
  const value = JSON.stringify(commissionSchema.parse(settings));
  await db.setting.upsert({ where: { key: COMMISSION_KEY }, create: { key: COMMISSION_KEY, value }, update: { value } });
}
