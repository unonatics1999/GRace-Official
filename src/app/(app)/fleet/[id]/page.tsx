import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addWindow,
  assignMeAsDriver,
  deleteVehiclePhoto,
  deleteWindow,
  makeCoverPhoto,
  submitVehicleForReview,
  toggleVehicleActive,
  updateVehicle,
  uploadVehicleDocument,
  uploadVehiclePhotos,
} from "@/app/actions/vehicles";
import { ActionForm } from "@/components/ActionForm";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { DocumentChecklist } from "@/components/DocumentChecklist";
import { PhotoUploader } from "@/components/PhotoUploader";
import { BookingStatusBadge, EmptyState } from "@/components/ui";
import { VehicleImage } from "@/components/VehicleImage";
import { VehicleForm } from "@/components/VehicleForm";
import { BLOCKING_STATUSES, parseWeekdays } from "@/lib/availability";
import { DRIVER_STATUS, REVIEW_STATUS, WEEKDAYS } from "@/lib/constants";
import { displayDay, formatDay, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { photoUrl, vehicleTitle } from "@/lib/listings";
import { VEHICLE_REQUIREMENTS, missingDocuments } from "@/lib/requirements";
import { requireOwner } from "@/lib/session";
import { canManageFleet, formatCents } from "@/lib/util";

export default async function FleetVehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const me = await requireOwner();
  const vehicle = await db.vehicle.findFirst({
    where: { id, companyId: me.companyId },
    include: {
      windows: { orderBy: { createdAt: "asc" } },
      photos: { orderBy: { position: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
      driver: { include: { user: true } },
      bookings: { include: { renterCompany: true }, orderBy: { startDate: "desc" } },
    },
  });
  if (!vehicle) notFound();

  const canEdit = canManageFleet(me.role);
  const myDriver = await db.driver.findUnique({ where: { userId: me.id } });
  const missingDocs = missingDocuments(VEHICLE_REQUIREMENTS, vehicle.documents);
  const checklist = [
    { done: vehicle.photos.length >= 3, text: "At least 3 photos (front, side, interior)", href: "#photos" },
    { done: missingDocs.length === 0, text: "OR, CR and CTPL uploaded", href: "#documents" },
    { done: vehicle.windows.length > 0, text: "Availability set", href: "#availability" },
    ...(vehicle.withDriverAllowed ? [{ done: vehicle.driver !== null, text: "Driver profile linked", href: "#driver" }] : []),
  ];
  const ready = checklist.every((c) => c.done);
  const now = today();
  const lapsed = vehicle.registrationExpiry < now || vehicle.insuranceExpiry < now;
  const live = vehicle.reviewStatus === "APPROVED" && vehicle.active && !vehicle.blocked && !lapsed && me.company.status === "VERIFIED" && vehicle.windows.length > 0;
  const blocking = vehicle.bookings.filter((b) => BLOCKING_STATUSES.includes(b.status));

  return (
    <div className="space-y-6">
      <Link href="/fleet" className="text-sm text-stone-500 hover:text-stone-900">← My fleet</Link>

      {error === "incomplete" && <Banner tone="red">Finish the checklist before submitting.</Banner>}
      {vehicle.blocked && <Banner tone="red">Downtime has hidden this listing. Contact support to have it reviewed.</Banner>}
      {lapsed && <Banner tone="red">The registration or CTPL insurance has expired, so the listing is paused. Update the dates and upload the renewed papers.</Banner>}
      {vehicle.reviewStatus === "REJECTED" && vehicle.reviewNote && <Banner tone="red">Changes needed: {vehicle.reviewNote}</Banner>}

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <VehicleImage vehicle={vehicle} className="aspect-[16/6]" />
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="page-title">{vehicleTitle(vehicle)}</h1>
              <span className={`badge ${live ? "bg-brand-100 text-brand-700" : "bg-amber-100 text-amber-800"}`}>
                {live ? "Live" : REVIEW_STATUS[vehicle.reviewStatus as keyof typeof REVIEW_STATUS]}
              </span>
            </div>
            <p className="mt-1 text-stone-500">
              {vehicle.color} · {vehicle.plateNumber} · {vehicle.city} · {formatCents(vehicle.dailyRateCents)}/day
              {vehicle.withDriverAllowed && ` · driver ${formatCents(vehicle.driverDailyRateCents)}/day`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {live && <Link href={`/listing/${vehicle.id}`} className="btn-secondary">View listing</Link>}
            {canEdit && vehicle.reviewStatus === "APPROVED" && (
              <form action={toggleVehicleActive.bind(null, vehicle.id)}>
                <button className="btn-secondary">{vehicle.active ? "Pause listing" : "Resume listing"}</button>
              </form>
            )}
          </div>
        </div>
      </div>

      {["DRAFT", "REJECTED"].includes(vehicle.reviewStatus) && (
        <section className="card p-6">
          <h2 className="font-semibold">Get it approved</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.text}>
                <a href={c.href} className="flex items-center gap-2 text-sm">
                  <span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${c.done ? "bg-brand-600 text-white" : "border border-stone-300"}`}>{c.done ? "✓" : ""}</span>
                  <span className={c.done ? "text-stone-400 line-through" : "text-stone-800 hover:underline"}>{c.text}</span>
                </a>
              </li>
            ))}
          </ul>
          {canEdit && (
            <form action={submitVehicleForReview.bind(null, vehicle.id)} className="mt-5">
              <button className="btn-primary" disabled={!ready}>Submit for review</button>
              {!ready && <span className="ml-3 text-sm text-stone-500">Complete the checklist first.</span>}
            </form>
          )}
        </section>
      )}
      {vehicle.reviewStatus === "SUBMITTED" && (
        <Banner tone="amber">Under review. Downtime checks your papers within one business day. You&apos;ll see the result here.</Banner>
      )}

      <section id="photos" className="card scroll-mt-24 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Photos</h2>
            <p className="text-sm text-stone-500">Real, recent photos in daylight. The first one is the cover. Up to 10.</p>
          </div>
          {canEdit && <PhotoUploader upload={uploadVehiclePhotos.bind(null, vehicle.id)} />}
        </div>
        {vehicle.photos.length === 0 ? (
          <div className="mt-4"><EmptyState>No photos yet. Listings with good photos get booked first.</EmptyState></div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {vehicle.photos.map((p, i) => (
              <div key={p.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- served by our own auth-checked route */}
                <img src={photoUrl(p.id)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">Cover</span>}
                {canEdit && (
                  <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                    {i > 0 && (
                      <form action={makeCoverPhoto.bind(null, p.id)}>
                        <button className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium">Make cover</button>
                      </form>
                    )}
                    <form action={deleteVehiclePhoto.bind(null, p.id)}>
                      <button className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-red-700">Delete</button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="documents" className="card scroll-mt-24 p-6">
        <h2 className="font-semibold">Papers</h2>
        <p className="text-sm text-stone-500">Downtime checks these against the plate and owner before approving.</p>
        <div className="mt-4">
          <DocumentChecklist requirements={VEHICLE_REQUIREMENTS} uploaded={vehicle.documents} upload={uploadVehicleDocument.bind(null, vehicle.id)} canUpload={canEdit} />
        </div>
      </section>

      {vehicle.withDriverAllowed && (
        <section id="driver" className="card scroll-mt-24 p-6">
          <h2 className="font-semibold">Driver</h2>
          {vehicle.driver ? (
            <p className="mt-2 text-sm text-stone-600">
              Driven by <span className="font-medium text-stone-900">{vehicle.driver.user.name}</span> · driver profile{" "}
              <span className="font-medium">{DRIVER_STATUS[vehicle.driver.status as keyof typeof DRIVER_STATUS].toLowerCase()}</span>.
              {vehicle.driver.status !== "APPROVED" && " Renters can book it with a driver once the driver is approved."}
            </p>
          ) : myDriver ? (
            <form action={assignMeAsDriver.bind(null, vehicle.id)} className="mt-3 flex items-center gap-3">
              <p className="text-sm text-stone-600">You have a driver profile. Drive this vehicle yourself?</p>
              <button className="btn-secondary">I&apos;ll drive it</button>
            </form>
          ) : (
            <p className="mt-2 text-sm text-stone-600">
              To offer it with a driver, <Link href="/driver" className="font-medium text-brand-600 underline">apply as a driver</Link> with your professional licence and NBI clearance.
            </p>
          )}
        </section>
      )}

      <div id="availability" className="grid scroll-mt-24 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="card">
          <h2 className="font-semibold">Availability</h2>
          <p className="mt-1 text-sm text-stone-500">Renters can only book the green days.</p>
          <div className="mt-4">
            <AvailabilityCalendar windows={vehicle.windows} bookings={blocking} audience="host" />
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">When it&apos;s free</h2>
          {vehicle.windows.length === 0 ? (
            <EmptyState>No availability yet.</EmptyState>
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
              <ActionForm action={addWindow.bind(null, vehicle.id)} submitLabel="Add availability" className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                    <input type="radio" name="kind" value="WEEKLY" defaultChecked className="accent-[#1f5139]" />
                    <span><span className="block font-medium">Weekly</span><span className="text-xs text-stone-500">e.g. every weekday</span></span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                    <input type="radio" name="kind" value="RANGE" className="accent-[#1f5139]" />
                    <span><span className="block font-medium">Date range</span><span className="text-xs text-stone-500">e.g. while abroad</span></span>
                  </label>
                </div>
                <fieldset>
                  <legend className="label">Weekdays (weekly only)</legend>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((label, n) => (
                      <label key={label} className="cursor-pointer rounded-md border border-stone-300 py-1.5 text-center text-xs has-[:checked]:border-brand-700 has-[:checked]:bg-brand-700 has-[:checked]:text-white">
                        <input type="checkbox" name="weekdays" value={n} className="sr-only" />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="label">From</span><input type="date" name="startDate" min={formatDay(now)} className="input" /></label>
                  <label className="block"><span className="label">To</span><input type="date" name="endDate" min={formatDay(now)} className="input" /></label>
                </div>
              </ActionForm>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="font-semibold">Bookings</h2>
        {vehicle.bookings.length === 0 ? (
          <div className="mt-4"><EmptyState>No bookings yet.</EmptyState></div>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100">
            {vehicle.bookings.map((b) => (
              <li key={b.id}>
                <Link href={`/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-stone-50">
                  <span>
                    <span className="font-medium">{b.renterCompany.name}</span>
                    <span className="text-stone-500"> · {displayDay(b.startDate)} – {displayDay(b.endDate)} · {b.mode === "WITH_DRIVER" ? "with driver" : "self-drive"}</span>
                  </span>
                  <BookingStatusBadge status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canEdit && (
        <details className="card group">
          <summary className="flex cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
            Edit details
            <span className="text-stone-400 transition group-open:rotate-45">+</span>
          </summary>
          <div className="mt-6">
            <VehicleForm action={updateVehicle.bind(null, vehicle.id)} vehicle={vehicle} defaultCity={me.company.city} submitLabel="Save changes" />
          </div>
        </details>
      )}
    </div>
  );
}

function Banner({ tone, children }: { tone: "red" | "amber"; children: React.ReactNode }) {
  const cls = tone === "red" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900";
  return <p className={`rounded-xl border p-4 text-sm ${cls}`}>{children}</p>;
}
