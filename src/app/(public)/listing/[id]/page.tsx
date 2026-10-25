import Link from "next/link";
import { notFound } from "next/navigation";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { BookingBox } from "@/components/BookingBox";
import { Gallery } from "@/components/Gallery";
import { StarIcon, VerifiedIcon } from "@/components/ListingCard";
import { VehicleArt } from "@/components/VehicleArt";
import { averageRating } from "@/lib/commission";
import { ACCOUNT_KINDS, FUEL_TYPES, TRANSMISSIONS, VEHICLE_TYPES, type AccountKind, type VehicleType } from "@/lib/constants";
import { formatDay, parseDay, today } from "@/lib/dates";
import { getLiveListings } from "@/lib/listing-cache";
import { describeDowntime, driverBookable, equipmentTags, photoUrl, vehicleTitle } from "@/lib/listings";
import { bookingEligibility } from "@/lib/eligibility";
import { currentUser } from "@/lib/session";
import { getCommissionSettings } from "@/lib/settings";
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
  const [user, settings, live] = await Promise.all([currentUser(), getCommissionSettings(), getLiveListings()]);

  const vehicle = live.find((v) => v.id === id);
  if (!vehicle) notFound();
  const ownerListings = live.filter((v) => v.companyId === vehicle.companyId).length;

  const title = vehicleTitle(vehicle);
  const tags = equipmentTags(vehicle.equipment);
  const withDriver = driverBookable(vehicle);
  const driver = vehicle.driver;
  const rating = driver ? averageRating(driver.ratingSum, driver.ratingCount) : null;
  const isOwn = user?.companyId === vehicle.companyId;
  const memberSince = vehicle.company.createdAt.toLocaleDateString("en-PH", { month: "long", year: "numeric" });

  // With a driver needs no ID; self-drive needs a verified ID and licence (re-checked on the server
  // against the actual return date).
  const renter = user?.company;
  // The phone can be typed in the booking box, so check eligibility as if it were on file.
  const withPhone = renter ? { ...renter, phone: renter.phone || "pending" } : null;
  const selfCheck = withPhone ? bookingEligibility(withPhone, "SELF_DRIVE", today()) : null;
  const selfDrive = {
    offered: vehicle.selfDriveAllowed,
    eligible: selfCheck?.ok ?? false,
    reason: selfCheck && !selfCheck.ok ? selfCheck.reason : undefined,
  };
  const blocked = renter && (renter.status === "SUSPENDED" || renter.status === "REJECTED");

  const facts = [
    ["Type", VEHICLE_TYPES[vehicle.type as VehicleType]],
    ["Seats", String(vehicle.seats)],
    ["Transmission", TRANSMISSIONS[vehicle.transmission as keyof typeof TRANSMISSIONS]],
    ["Fuel", FUEL_TYPES[vehicle.fuelType as keyof typeof FUEL_TYPES]],
    ["Colour", vehicle.color],
    ["Availability", describeDowntime(vehicle.windows)],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/explore" className="text-sm text-stone-500 hover:text-stone-900">← All vehicles</Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">{title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-stone-600">
            <span>{vehicle.color}</span>·<span>{vehicle.city}</span>·
            <span className="inline-flex items-center gap-1"><VerifiedIcon /> {vehicle.company.name}</span>
            {rating !== null && (
              <>·<span className="inline-flex items-center gap-1"><StarIcon /> {rating.toFixed(1)} ({driver!.ratingCount} trips rated)</span></>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {vehicle.selfDriveAllowed && <span className="badge bg-stone-100 px-3 py-1 text-stone-700">Self-drive</span>}
          {withDriver && <span className="badge bg-stone-900 px-3 py-1 text-white">With driver</span>}
        </div>
      </div>

      <div className="mt-6">
        {vehicle.photos.length > 0 ? (
          <>
            <Gallery
              photos={vehicle.photos.map((p) => ({
                id: p.id,
                url: photoUrl(p.id),
                representative: p.representative,
                credit: p.credit,
                sourceUrl: p.sourceUrl,
              }))}
              alt={title}
            />
            {vehicle.photos.some((p) => p.representative) && (
              <p className="mt-2 text-xs text-stone-500">
                Representative photos of a {vehicle.make} {vehicle.model}, not this exact car. You&apos;ll see the actual car in the
                pick-up photo checklist. Photos from Wikimedia Commons; credits on each photo.
              </p>
            )}
          </>
        ) : (
          <VehicleArt type={vehicle.type} seed={vehicle.id} colorHex={vehicle.colorHex} className="aspect-[16/7] rounded-3xl ring-1 ring-black/5" />
        )}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <section className="flex items-center gap-4 border-b border-stone-200 pb-8">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-700 text-lg font-semibold text-lime">
              {vehicle.company.name[0]}
            </div>
            <div>
              <p className="font-semibold">Owned by {vehicle.company.name}</p>
              <p className="text-sm text-stone-500">
                Verified {ACCOUNT_KINDS[vehicle.company.kind as AccountKind].toLowerCase()} · on GRace since {memberSince} ·{" "}
                {ownerListings} vehicle{ownerListings === 1 ? "" : "s"}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-stone-200 p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
                <p className="mt-1 font-medium text-stone-900">{value}</p>
              </div>
            ))}
          </section>

          {withDriver && driver && (
            <section className="rounded-2xl border border-stone-200 p-6">
              <h2 className="text-lg font-semibold">Your driver</h2>
              <div className="mt-4 flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-stone-900 text-xl font-semibold text-white">
                  {driver.user.name[0]}
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-stone-900">{driver.user.name}</p>
                  <p className="text-stone-500">
                    LTO professional licence · {driver.yearsExperience} years driving
                    {rating !== null ? ` · ${rating.toFixed(1)}★ from ${driver.ratingCount} trips` : " · new on GRace"}
                  </p>
                  <p className="mt-1 text-stone-500">NBI clearance checked by GRace.</p>
                </div>
              </div>
            </section>
          )}

          {vehicle.description && (
            <section>
              <h2 className="text-lg font-semibold">About this vehicle</h2>
              <p className="mt-2 whitespace-pre-line text-stone-600">{vehicle.description}</p>
            </section>
          )}

          {tags.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">Features</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li key={tag} className="rounded-full border border-stone-300 px-3 py-1 text-sm capitalize text-stone-700">{tag}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold">When it&apos;s free</h2>
            <p className="mt-1 text-sm text-stone-500">The owner rents it only on days they don&apos;t need it themselves.</p>
            <div className="mt-4 max-w-xl">
              <AvailabilityCalendar windows={vehicle.windows} bookings={vehicle.bookings} audience="renter" />
            </div>
          </section>

          <section className="rounded-2xl bg-stone-50 p-6">
            <h2 className="font-semibold">Checked by GRace</h2>
            <ul className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
              <li>✓ LTO OR/CR matches plate</li>
              <li>✓ Registration and CTPL insurance current</li>
              <li>✓ Owner identity verified</li>
              {withDriver && <li>✓ Professional licence and NBI clearance</li>}
              <li>✓ Photo checklist at pick-up and return</li>
              <li>✓ Pay securely by GCash, Maya or card</li>
            </ul>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-stone-200 p-6 shadow-lg shadow-stone-200/50">
            <p className="text-2xl font-semibold">
              {formatCents(vehicle.dailyRateCents)} <span className="text-base font-normal text-stone-500">/ day</span>
            </p>
            {withDriver && <p className="text-sm text-stone-500">Driver +{formatCents(vehicle.driverDailyRateCents)} / day</p>}
            <div className="mt-5">
              {isOwn ? (
                <div className="space-y-3 text-sm text-stone-600">
                  <p>This is one of your vehicles.</p>
                  <Link href={`/fleet/${vehicle.id}`} className="btn-secondary w-full">Manage it</Link>
                </div>
              ) : !user ? (
                <div className="space-y-3 text-sm text-stone-600">
                  <p>{withDriver ? "Log in to book. With a driver, no ID is needed." : "Log in to request this vehicle."}</p>
                  <Link href="/login" className="btn-primary w-full py-3">Log in to book</Link>
                  <Link href="/signup" className="btn-secondary w-full">Create an account</Link>
                </div>
              ) : !user.company ? (
                <p className="text-sm text-stone-600">Admin accounts can&apos;t book vehicles.</p>
              ) : blocked ? (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{selfCheck && !selfCheck.ok ? selfCheck.reason : ""}</p>
              ) : !canManageFleet(user.role) ? (
                <p className="text-sm text-stone-600">Ask an owner or fleet manager on your account to book.</p>
              ) : (
                <BookingBox
                  vehicleId={vehicle.id}
                  dailyRateCents={vehicle.dailyRateCents}
                  driverDailyRateCents={vehicle.driverDailyRateCents}
                  renterFeeBps={settings.renterFeeBps}
                  selfDrive={selfDrive}
                  withDriver={{ offered: withDriver, driverName: driver?.user.name }}
                  needsPhone={!renter?.phone}
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
