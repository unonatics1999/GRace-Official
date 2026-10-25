import { updateCommission } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { AdminHeader } from "@/components/admin";
import { formatBps, priceBooking } from "@/lib/commission";
import { VEHICLE_TYPES, type VehicleType } from "@/lib/constants";
import { requireAdmin } from "@/lib/session";
import { getCommissionSettings } from "@/lib/settings";
import { formatCents } from "@/lib/util";

const pct = (bps: number) => String(bps / 100);

export default async function CommissionPage() {
  await requireAdmin();
  const s = await getCommissionSettings();
  const tiers = [...s.tiers].sort((a, b) => b.minRating - a.minRating);
  while (tiers.length < 3) tiers.push({ minRating: 0, minReviews: 1, discountBps: 0 });

  // Example: a ₱1,800/day sedan with a ₱1,000/day driver for 2 days.
  const example = (hostBps: number) =>
    priceBooking({ days: 2, dailyRateCents: 180_000, driverDailyRateCents: 100_000, withDriver: true, renterFeeBps: s.renterFeeBps, hostCommissionBps: hostBps });
  const exampleRows = [
    { label: "New driver", bps: s.baseBps.SEDAN ?? 1500 },
    ...s.tiers.map((t) => ({ label: `${t.minRating}★, ${t.minReviews}+ trips`, bps: Math.max(s.floorBps, (s.baseBps.SEDAN ?? 1500) - t.discountBps) })),
  ];

  return (
    <>
      <AdminHeader
        title="Commission"
        description="What GRace earns per booking. Changes apply to new requests only; existing bookings keep the rates they were quoted."
      />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="card p-6">
          <ActionForm action={updateCommission} submitLabel="Save rates" className="space-y-8">
            <fieldset className="space-y-3">
              <legend className="font-semibold">Renter service fee</legend>
              <PercentInput name="renterFee" label="Added to every renter's total" value={pct(s.renterFeeBps)} />
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="font-semibold">Host commission by vehicle category</legend>
              <p className="text-sm text-stone-500">Taken from the car and driver fees before the payout.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {Object.keys(VEHICLE_TYPES).map((t) => (
                  <PercentInput key={t} name={`base_${t}`} label={VEHICLE_TYPES[t as VehicleType]} value={pct(s.baseBps[t] ?? 1500)} />
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="font-semibold">Driver rating discounts</legend>
              <p className="text-sm text-stone-500">
                Better-rated drivers pay less commission. The highest tier a driver qualifies for applies. Set a rating to 0 to turn a tier off.
              </p>
              <div className="space-y-2">
                {tiers.slice(0, 3).map((t, i) => (
                  <div key={i} className="grid grid-cols-3 gap-3">
                    <label className="block">
                      <span className="label">Min. rating</span>
                      <input name={`tier${i}_rating`} type="number" step="0.1" min="0" max="5" defaultValue={t.minRating || 0} className="input" />
                    </label>
                    <label className="block">
                      <span className="label">Min. rated trips</span>
                      <input name={`tier${i}_reviews`} type="number" min="1" defaultValue={t.minReviews} className="input" />
                    </label>
                    <PercentInput name={`tier${i}_discount`} label="Discount (points)" value={pct(t.discountBps)} />
                  </div>
                ))}
              </div>
              <PercentInput name="floor" label="Lowest commission allowed" value={pct(s.floorBps)} />
            </fieldset>
          </ActionForm>
        </section>

        <section className="card h-fit p-6">
          <h2 className="font-semibold">What this earns</h2>
          <p className="mt-1 text-sm text-stone-500">Sedan at ₱1,800/day with a ₱1,000/day driver, 2 days.</p>
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-stone-500">
              <tr><th className="py-2">Driver</th><th className="py-2">Commission</th><th className="py-2">Host gets</th><th className="py-2">You earn</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {exampleRows.map((r) => {
                const p = example(r.bps);
                return (
                  <tr key={r.label}>
                    <td className="py-2">{r.label}</td>
                    <td className="py-2">{formatBps(r.bps)}</td>
                    <td className="py-2">{formatCents(p.hostPayoutCents)}</td>
                    <td className="py-2 font-semibold text-brand-700">{formatCents(p.platformEarningsCents)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-stone-500">Renter pays {formatCents(example(0).renterTotalCents)} in every case.</p>
        </section>
      </div>
    </>
  );
}

function PercentInput({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <input name={name} type="number" step="0.5" min="0" max="50" defaultValue={value} className="input pr-8" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">%</span>
      </span>
    </label>
  );
}
