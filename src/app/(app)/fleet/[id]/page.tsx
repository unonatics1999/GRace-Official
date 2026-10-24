import Link from "next/link";
import { notFound } from "next/navigation";
import { addWindow, deleteWindow, toggleVehicleActive } from "@/app/actions/vehicles";
import { ActionForm } from "@/components/ActionForm";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { BookingStatusBadge, EmptyState } from "@/components/ui";
import { VehicleArt } from "@/components/VehicleArt";
import { parseWeekdays } from "@/lib/availability";
import { VEHICLE_TYPES, WEEKDAYS, type VehicleType } from "@/lib/constants";
import { displayDay, formatDay, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { equipmentTags } from "@/lib/listings";
import { requireCompanyUser } from "@/lib/session";
import { canManageFleet, formatCents } from "@/lib/util";

export default async function FleetVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireCompanyUser();
  const vehicle = await db.vehicle.findFirst({
    where: { id, companyId: me.companyId },
    include: {
      windows: { orderBy: { createdAt: "asc" } },
      bookings: { include: { renterCompany: true }, orderBy: { startDate: "asc" } },
    },
  });
  if (!vehicle) notFound();

  const canEdit = canManageFleet(me.role);
  const live = vehicle.active && !vehicle.blocked && vehicle.windows.length > 0 && me.company.status === "VERIFIED";
  const tags = equipmentTags(vehicle.equipment);

  return (
    <div className="space-y-6">
      <Link href="/fleet" className="text-sm text-stone-500 hover:text-stone-900">← My fleet</Link>

      {vehicle.blocked && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Downtime has hidden this listing from search. Contact support to have it reviewed.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <VehicleArt type={vehicle.type} seed={vehicle.id} className="aspect-[16/5]" />
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <h1 className="page-title">{vehicle.name}</h1>
            <p className="mt-1 text-stone-500">
              {vehicle.year} {VEHICLE_TYPES[vehicle.type as VehicleType]} · {vehicle.city} ·{" "}
              {formatCents(vehicle.dailyRateCents)}/day
            </p>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="badge bg-stone-100 capitalize text-stone-700">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {live && <Link href={`/listing/${vehicle.id}`} className="btn-secondary">View public listing</Link>}
            {canEdit && (
              <form action={toggleVehicleActive.bind(null, vehicle.id)}>
                <button className="btn-secondary">{vehicle.active ? "Pause listing" : "Resume listing"}</button>
              </form>
            )}
          </div>
        </div>
        {vehicle.description && <p className="whitespace-pre-line border-t border-stone-100 px-6 py-4 text-sm text-stone-600">{vehicle.description}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="card">
          <h2 className="font-semibold">Availability</h2>
          <p className="mt-1 text-sm text-stone-500">Renters can only book the green days.</p>
          <div className="mt-4">
            <AvailabilityCalendar windows={vehicle.windows} bookings={vehicle.bookings} audience="host" />
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Downtime windows</h2>
          {vehicle.windows.length === 0 ? (
            <EmptyState>No downtime yet, so nobody can rent this vehicle.</EmptyState>
          ) : (
            <ul className="divide-y divide-stone-100">
              {vehicle.windows.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span>
                    <span className="font-medium">
                      {w.kind === "WEEKLY" ? `Every ${parseWeekdays(w.weekdays).map((n) => WEEKDAYS[n]).join(", ")}` : "Every day"}
                    </span>
                    <span className="text-stone-500">
                      {w.startDate && ` from ${displayDay(w.startDate)}`}
                      {w.endDate && ` to ${displayDay(w.endDate)}`}
                    </span>
                  </span>
                  {canEdit && (
                    <form action={deleteWindow.bind(null, w.id)}>
                      <button className="btn-danger px-2.5 py-1 text-xs">Remove</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canEdit && (
            <div className="border-t border-stone-100 pt-4">
              <h3 className="text-sm font-semibold">Add downtime</h3>
              <ActionForm action={addWindow.bind(null, vehicle.id)} submitLabel="Add downtime" className="mt-3 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                    <input type="radio" name="kind" value="WEEKLY" defaultChecked className="accent-[#1f5139]" />
                    <span><span className="block font-medium">Weekly</span><span className="text-xs text-stone-500">e.g. every Mon–Wed</span></span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                    <input type="radio" name="kind" value="RANGE" className="accent-[#1f5139]" />
                    <span><span className="block font-medium">Date range</span><span className="text-xs text-stone-500">e.g. the off-season</span></span>
                  </label>
                </div>
                <fieldset>
                  <legend className="label">Weekdays (weekly only)</legend>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((label, n) => (
                      <label
                        key={label}
                        className="cursor-pointer rounded-md border border-stone-300 py-1.5 text-center text-xs has-[:checked]:border-brand-700 has-[:checked]:bg-brand-700 has-[:checked]:text-white"
                      >
                        <input type="checkbox" name="weekdays" value={n} className="sr-only" />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="label">From</span>
                    <input type="date" name="startDate" min={formatDay(today())} className="input" />
                  </label>
                  <label className="block">
                    <span className="label">To</span>
                    <input type="date" name="endDate" min={formatDay(today())} className="input" />
                  </label>
                </div>
                <p className="text-xs text-stone-500">Dates are optional for a weekly pattern and required for a range.</p>
              </ActionForm>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Bookings for this vehicle</h2>
          <Link href="/bookings" className="text-sm text-brand-600 hover:underline">Manage →</Link>
        </div>
        {vehicle.bookings.length === 0 ? (
          <div className="mt-4"><EmptyState>No bookings yet.</EmptyState></div>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100">
            {vehicle.bookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-medium">{b.renterCompany.name}</span>
                  <span className="text-stone-500"> · {displayDay(b.startDate)} – {displayDay(b.endDate)}</span>
                </span>
                <BookingStatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
