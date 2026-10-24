import Link from "next/link";
import { notFound } from "next/navigation";
import { addWindow, deleteWindow, toggleVehicleActive } from "@/app/actions/vehicles";
import { ActionForm } from "@/components/ActionForm";
import { BookingStatusBadge, EmptyState } from "@/components/ui";
import { dayBooked, dayInDowntime, parseWeekdays } from "@/lib/availability";
import { VEHICLE_TYPES, WEEKDAYS, type VehicleType } from "@/lib/constants";
import { addDays, displayDay, eachDay, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { canManageFleet, formatCents } from "@/lib/util";

const CALENDAR_DAYS = 28;

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
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
  const start = today();
  const calendar = eachDay(start, addDays(start, CALENDAR_DAYS - 1)).map((day) => ({
    day,
    state: dayBooked(vehicle.bookings, day) ? "booked" : dayInDowntime(vehicle.windows, day) ? "idle" : "busy",
  }));

  return (
    <div className="space-y-6">
      <Link href="/vehicles" className="text-sm text-stone-500 hover:text-stone-800">← My fleet</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{vehicle.name}</h1>
          <p className="mt-1 text-stone-500">
            {vehicle.year} {VEHICLE_TYPES[vehicle.type as VehicleType]} · {vehicle.city} ·{" "}
            {formatCents(vehicle.dailyRateCents)}/day
          </p>
          {vehicle.equipment && (
            <div className="mt-2 flex flex-wrap gap-1">
              {vehicle.equipment.split(",").map((tag) => (
                <span key={tag} className="badge bg-stone-100 text-stone-700">{tag}</span>
              ))}
            </div>
          )}
        </div>
        {canEdit && (
          <form action={toggleVehicleActive.bind(null, vehicle.id)}>
            <button className="btn-secondary">{vehicle.active ? "Pause listing" : "Resume listing"}</button>
          </form>
        )}
      </div>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Next {CALENDAR_DAYS} days</h2>
          <div className="flex gap-4 text-xs text-stone-600">
            <Legend className="bg-lime" label="Idle — rentable" />
            <Legend className="bg-brand-700" label="Booked" />
            <Legend className="bg-stone-200" label="You're using it" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {calendar.map(({ day, state }) => (
            <div
              key={day.toISOString()}
              title={`${displayDay(day)} — ${state}`}
              className={`rounded-md p-1.5 text-center text-xs ${
                state === "booked" ? "bg-brand-700 text-white" : state === "idle" ? "bg-lime text-brand-900" : "bg-stone-100 text-stone-500"
              }`}
            >
              <div className="opacity-70">{WEEKDAYS[day.getUTCDay()]}</div>
              <div className="font-semibold">{day.getUTCDate()}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4">
          <h2 className="font-semibold">Downtime windows</h2>
          {vehicle.windows.length === 0 ? (
            <EmptyState>No downtime yet, so nobody can rent this vehicle.</EmptyState>
          ) : (
            <ul className="divide-y divide-stone-100">
              {vehicle.windows.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    {w.kind === "WEEKLY"
                      ? `Every ${parseWeekdays(w.weekdays).map((n) => WEEKDAYS[n]).join(", ")}`
                      : "Every day"}
                    {w.startDate && ` from ${displayDay(w.startDate)}`}
                    {w.endDate && ` to ${displayDay(w.endDate)}`}
                  </span>
                  {canEdit && (
                    <form action={deleteWindow.bind(null, w.id)}>
                      <button className="text-xs text-red-600 hover:underline">Remove</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canEdit && (
            <div className="border-t border-stone-100 pt-4">
              <h3 className="text-sm font-medium">Add downtime</h3>
              <ActionForm action={addWindow.bind(null, vehicle.id)} submitLabel="Add downtime" className="mt-3 space-y-3">
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="kind" value="WEEKLY" defaultChecked /> Weekly pattern
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="kind" value="RANGE" /> Date range (e.g. a season)
                  </label>
                </div>
                <fieldset>
                  <legend className="label">Weekdays (weekly only)</legend>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((label, n) => (
                      <label key={label} className="flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-sm">
                        <input type="checkbox" name="weekdays" value={n} /> {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="label">From</span>
                    <input type="date" name="startDate" className="input" />
                  </label>
                  <label className="block">
                    <span className="label">To</span>
                    <input type="date" name="endDate" className="input" />
                  </label>
                </div>
                <p className="text-xs text-stone-500">Dates are optional for a weekly pattern and required for a range.</p>
              </ActionForm>
            </div>
          )}
        </section>

        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Bookings</h2>
            <Link href="/bookings" className="text-sm text-brand-600">Manage →</Link>
          </div>
          {vehicle.bookings.length === 0 ? (
            <EmptyState>No bookings yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-stone-100">
              {vehicle.bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
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
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm ${className}`} /> {label}
    </span>
  );
}
