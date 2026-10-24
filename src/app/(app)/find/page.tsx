import { requestBooking } from "@/app/actions/bookings";
import { ActionForm } from "@/components/ActionForm";
import { EmptyState } from "@/components/ui";
import { checkAvailability, quote } from "@/lib/availability";
import { VEHICLE_TYPES, type VehicleType } from "@/lib/constants";
import { addDays, displayDay, formatDay, parseDay, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { formatCents } from "@/lib/util";

type Search = { type?: string; city?: string; start?: string; end?: string };

export default async function FindPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await requireCompanyUser();
  const query = await searchParams;
  const start = parseDay(query.start);
  const end = parseDay(query.end);
  const type = query.type && query.type in VEHICLE_TYPES ? query.type : undefined;
  const city = query.city?.trim() || undefined;
  const searched = Boolean(start && end);

  const results = searched
    ? (
        await db.vehicle.findMany({
          where: {
            active: true,
            companyId: { not: me.companyId },
            company: { status: "VERIFIED" },
            ...(type ? { type } : {}),
            ...(city ? { city: { contains: city } } : {}),
          },
          include: { company: true, windows: true, bookings: { where: { status: "CONFIRMED" } } },
        })
      )
        .map((v) => ({ vehicle: v, availability: checkAvailability(v.windows, v.bookings, start!, end!) }))
        .filter((r) => r.availability.ok)
        .map((r) => ({ ...r, price: quote(r.vehicle.dailyRateCents, r.availability.ok ? r.availability.days : 0) }))
        .sort((a, b) => a.vehicle.dailyRateCents - b.vehicle.dailyRateCents)
    : [];

  const defaultStart = formatDay(addDays(today(), 1));
  const verified = me.company.status === "VERIFIED";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Find a vehicle</h1>
        <p className="mt-1 text-stone-500">Only vehicles idle for every day you need are shown.</p>
      </div>

      <form className="card grid gap-3 sm:grid-cols-5 sm:items-end">
        <label className="block">
          <span className="label">Type</span>
          <select name="type" defaultValue={type ?? ""} className="input">
            <option value="">Any</option>
            {Object.entries(VEHICLE_TYPES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">City</span>
          <input name="city" defaultValue={city ?? ""} className="input" placeholder="Any" />
        </label>
        <label className="block">
          <span className="label">From</span>
          <input type="date" name="start" required defaultValue={query.start ?? defaultStart} className="input" />
        </label>
        <label className="block">
          <span className="label">To</span>
          <input type="date" name="end" required defaultValue={query.end ?? defaultStart} className="input" />
        </label>
        <button className="btn-primary">Search</button>
      </form>

      {searched &&
        (results.length === 0 ? (
          <EmptyState>No vehicles are idle for all of those days. Try fewer days or another type.</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {results.map(({ vehicle: v, price }) => (
              <div key={v.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{v.name}</p>
                    <p className="text-sm text-stone-500">
                      {v.year} {VEHICLE_TYPES[v.type as VehicleType]} · {v.city} · from {v.company.name}
                    </p>
                  </div>
                  <p className="text-right font-semibold">
                    {formatCents(v.dailyRateCents)}
                    <span className="block text-xs font-normal text-stone-500">per day</span>
                  </p>
                </div>
                {v.equipment && (
                  <div className="flex flex-wrap gap-1">
                    {v.equipment.split(",").map((tag) => (
                      <span key={tag} className="badge bg-stone-100 text-stone-700">{tag}</span>
                    ))}
                  </div>
                )}
                <dl className="rounded-lg bg-stone-50 p-3 text-sm">
                  <div className="flex justify-between">
                    <dt>{price.days} day(s) · {displayDay(start!)} – {displayDay(end!)}</dt>
                    <dd>{formatCents(price.subtotalCents)}</dd>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <dt>Service fee (10%)</dt>
                    <dd>{formatCents(price.renterFeeCents)}</dd>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-stone-200 pt-1 font-semibold">
                    <dt>Total</dt>
                    <dd>{formatCents(price.renterTotalCents)}</dd>
                  </div>
                </dl>
                {verified ? (
                  <ActionForm action={requestBooking} submitLabel="Request booking" className="space-y-2">
                    <input type="hidden" name="vehicleId" value={v.id} />
                    <input type="hidden" name="start" value={formatDay(start!)} />
                    <input type="hidden" name="end" value={formatDay(end!)} />
                    <textarea name="note" rows={2} maxLength={500} className="input" placeholder="What's the job? (optional)" />
                  </ActionForm>
                ) : (
                  <p className="text-sm text-amber-700">Booking unlocks once your company is verified.</p>
                )}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
