import { saveDriverProfile, uploadDriverDocument } from "@/app/actions/driver";
import { ActionForm } from "@/components/ActionForm";
import { DocumentChecklist } from "@/components/DocumentChecklist";
import { StarIcon } from "@/components/ListingCard";
import { Field } from "@/components/ui";
import { averageRating, formatBps, hostCommissionBps, ratingTier } from "@/lib/commission";
import { DRIVER_STATUS, VEHICLE_TYPES, type VehicleType } from "@/lib/constants";
import { formatDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { DRIVER_REQUIREMENTS, VEHICLE_RULES } from "@/lib/requirements";
import { requireCompanyUser } from "@/lib/session";
import { getCommissionSettings } from "@/lib/settings";

export const metadata = { title: "Driver profile · Downtime" };

const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-brand-100 text-brand-700",
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-stone-200 text-stone-700",
};

export default async function DriverPage() {
  const me = await requireCompanyUser();
  const [driver, settings] = await Promise.all([
    db.driver.findUnique({ where: { userId: me.id }, include: { documents: { orderBy: { createdAt: "desc" } }, vehicles: true } }),
    getCommissionSettings(),
  ]);
  const rating = driver ? averageRating(driver.ratingSum, driver.ratingCount) : null;
  const tier = driver ? ratingTier(settings, rating, driver.ratingCount) : null;
  const tiers = [...settings.tiers].sort((a, b) => b.minRating - a.minRating);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Driver profile</h1>
          <p className="mt-1 text-sm text-stone-500">
            Drive your own car for renters who book with a driver. Higher ratings mean Downtime takes a smaller commission.
          </p>
        </div>
        {driver && <span className={`badge ${STATUS_TONE[driver.status]}`}>{DRIVER_STATUS[driver.status as keyof typeof DRIVER_STATUS]}</span>}
      </div>

      {driver && (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="card">
            <p className="text-sm text-stone-500">Rating</p>
            <p className="mt-1 flex items-center gap-1.5 text-2xl font-semibold">
              {rating !== null ? <><StarIcon className="h-5 w-5 text-amber-500" /> {rating.toFixed(2)}</> : "—"}
            </p>
            <p className="text-xs text-stone-500">{driver.ratingCount} rated trip{driver.ratingCount === 1 ? "" : "s"}</p>
          </div>
          <div className="card">
            <p className="text-sm text-stone-500">Your commission tier</p>
            <p className="mt-1 text-2xl font-semibold">{tier ? `−${formatBps(tier.discountBps)}` : "Base rate"}</p>
            <p className="text-xs text-stone-500">{tier ? `For ${tier.minRating}★ and ${tier.minReviews}+ rated trips` : "Earn ratings to lower it"}</p>
          </div>
          <div className="card">
            <p className="text-sm text-stone-500">Vehicles you drive</p>
            <p className="mt-1 text-2xl font-semibold">{driver.vehicles.length}</p>
            <p className="text-xs text-stone-500">
              {driver.vehicles.map((v) => `${v.model} (${formatBps(hostCommissionBps(settings, v.type, driver))})`).join(", ") || "None yet"}
            </p>
          </div>
        </section>
      )}

      <section className="card p-6">
        <h2 className="font-semibold">How ratings lower your commission</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="py-2">Rating</th>
                <th className="py-2">Rated trips</th>
                {Object.keys(settings.baseBps).map((t) => <th key={t} className="py-2">{VEHICLE_TYPES[t as VehicleType] ?? t}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr className={!tier ? "font-semibold text-brand-700" : ""}>
                <td className="py-2">New / below {tiers.at(-1)?.minRating ?? 4}★</td>
                <td className="py-2">—</td>
                {Object.values(settings.baseBps).map((b, i) => <td key={i} className="py-2">{formatBps(b)}</td>)}
              </tr>
              {[...tiers].reverse().map((t) => (
                <tr key={t.minRating} className={tier?.minRating === t.minRating ? "font-semibold text-brand-700" : ""}>
                  <td className="py-2">{t.minRating}★ and up</td>
                  <td className="py-2">{t.minReviews}+</td>
                  {Object.values(settings.baseBps).map((b, i) => (
                    <td key={i} className="py-2">{formatBps(Math.max(settings.floorBps, b - t.discountBps))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-stone-500">Commission is taken from the car and driver fees of each booking.</p>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">Licence details</h2>
        <p className="mt-1 text-sm text-stone-500">
          Driving for hire needs an LTO Professional licence, {VEHICLE_RULES.minDriverExperienceYears}+ years of experience and age {VEHICLE_RULES.minDriverAge}+.
        </p>
        <ActionForm action={saveDriverProfile} submitLabel={driver ? "Update details" : "Apply as driver"} className="mt-5 space-y-4">
          <input type="hidden" name="licenceType" value="PROFESSIONAL" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Licence no." name="licenceNo" defaultValue={driver?.licenceNo} placeholder="N01-23-456789" required />
            <Field label="Expiry" name="licenceExpiry" type="date" defaultValue={driver ? formatDay(driver.licenceExpiry) : ""} required />
            <Field label="Years driving" name="yearsExperience" type="number" min={0} defaultValue={driver?.yearsExperience} required />
          </div>
          <label className="flex items-start gap-2 text-sm text-stone-600">
            <input type="checkbox" required className="mt-1 accent-[#1f5139]" />
            I hold an LTO <strong className="mx-1">Professional</strong> licence with the right restriction codes for the vehicles I&apos;ll drive.
          </label>
        </ActionForm>
        {driver?.reviewNote && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">Reviewer: {driver.reviewNote}</p>}
      </section>

      {driver && (
        <section className="card p-6">
          <h2 className="font-semibold">Driver documents</h2>
          <div className="mt-5">
            <DocumentChecklist requirements={DRIVER_REQUIREMENTS} uploaded={driver.documents} upload={uploadDriverDocument} />
          </div>
        </section>
      )}
    </div>
  );
}
