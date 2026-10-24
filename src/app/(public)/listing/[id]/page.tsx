import Link from "next/link";
import { notFound } from "next/navigation";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { BookingBox } from "@/components/BookingBox";
import { VerifiedIcon } from "@/components/ListingCard";
import { VehicleArt } from "@/components/VehicleArt";
import { VEHICLE_TYPES, type VehicleType } from "@/lib/constants";
import { formatDay, parseDay, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { describeDowntime, equipmentTags, LISTABLE } from "@/lib/listings";
import { currentUser } from "@/lib/session";
import { canManageFleet, formatCents } from "@/lib/util";

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await currentUser();

  const vehicle = await db.vehicle.findFirst({
    where: { id, ...LISTABLE },
    include: {
      company: { include: { _count: { select: { vehicles: true } } } },
      windows: true,
      bookings: { where: { status: "CONFIRMED" } },
    },
  });
  if (!vehicle) notFound();

  const tags = equipmentTags(vehicle.equipment);
  const typeLabel = VEHICLE_TYPES[vehicle.type as VehicleType];
  const isOwn = user?.companyId === vehicle.companyId;
  const memberSince = vehicle.company.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/explore" className="text-sm text-stone-500 hover:text-stone-900">← All vehicles</Link>

      <div className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">{vehicle.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-stone-600">
          <span>{vehicle.year} {typeLabel}</span>·<span>{vehicle.city}</span>·
          <span className="inline-flex items-center gap-1"><VerifiedIcon /> {vehicle.company.name}</span>
        </p>
      </div>

      <VehicleArt type={vehicle.type} seed={vehicle.id} className="mt-6 aspect-[16/7] rounded-3xl" />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <section className="flex items-center gap-4 border-b border-stone-200 pb-8">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-700 text-lg font-semibold text-lime">
              {vehicle.company.name[0]}
            </div>
            <div>
              <p className="font-semibold">Hosted by {vehicle.company.name}</p>
              <p className="text-sm text-stone-500">
                Verified business · {vehicle.company.city} · on Downtime since {memberSince} ·{" "}
                {vehicle.company._count.vehicles} vehicle{vehicle.company._count.vehicles === 1 ? "" : "s"}
              </p>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <Fact label="Type" value={typeLabel} />
            <Fact label="Year" value={String(vehicle.year)} />
            <Fact label="Availability" value={describeDowntime(vehicle.windows)} />
          </section>

          {vehicle.description && (
            <section>
              <h2 className="text-lg font-semibold">About this vehicle</h2>
              <p className="mt-2 whitespace-pre-line text-stone-600">{vehicle.description}</p>
            </section>
          )}

          {tags.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">Equipment</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li key={tag} className="rounded-full border border-stone-300 px-3 py-1 text-sm capitalize text-stone-700">
                    {tag}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold">When it&apos;s free</h2>
            <p className="mt-1 text-sm text-stone-500">
              The host only rents this vehicle on days their own business doesn&apos;t need it.
            </p>
            <div className="mt-4 max-w-xl">
              <AvailabilityCalendar windows={vehicle.windows} bookings={vehicle.bookings} audience="renter" />
            </div>
          </section>

          <section className="rounded-2xl bg-stone-50 p-6">
            <h2 className="font-semibold">Booking with Downtime</h2>
            <ul className="mt-3 space-y-2 text-sm text-stone-600">
              <li>· Both companies are verified businesses.</li>
              <li>· The host confirms every request; you&apos;re not charged until then.</li>
              <li>· Pick-up and return are arranged with the host at {vehicle.city}.</li>
            </ul>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-stone-200 p-6 shadow-lg shadow-stone-200/50">
            <p className="text-2xl font-semibold">
              {formatCents(vehicle.dailyRateCents)} <span className="text-base font-normal text-stone-500">/ day</span>
            </p>
            <div className="mt-5">
              {isOwn ? (
                <div className="space-y-3 text-sm text-stone-600">
                  <p>This is one of your vehicles.</p>
                  <Link href={`/fleet/${vehicle.id}`} className="btn-secondary w-full">Manage it</Link>
                </div>
              ) : !user ? (
                <div className="space-y-3 text-sm text-stone-600">
                  <p>Log in with a verified company account to request this vehicle.</p>
                  <Link href="/login" className="btn-primary w-full py-3">Log in to book</Link>
                  <Link href="/signup" className="btn-secondary w-full">Create a company account</Link>
                </div>
              ) : !user.company ? (
                <p className="text-sm text-stone-600">Admin accounts can&apos;t book vehicles.</p>
              ) : user.company.status !== "VERIFIED" ? (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  Booking unlocks once Downtime verifies {user.company.name}.
                </p>
              ) : !canManageFleet(user.role) ? (
                <p className="text-sm text-stone-600">Ask an owner or fleet manager at your company to book.</p>
              ) : (
                <BookingBox
                  vehicleId={vehicle.id}
                  dailyRateCents={vehicle.dailyRateCents}
                  minDate={formatDay(today())}
                  defaultStart={parseDay(query.start) ? query.start : undefined}
                  defaultEnd={parseDay(query.end) ? query.end : undefined}
                />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 p-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 font-medium text-stone-900">{value}</p>
    </div>
  );
}
