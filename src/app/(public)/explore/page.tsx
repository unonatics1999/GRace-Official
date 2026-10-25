import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";
import { SearchBar } from "@/components/SearchBar";
import { checkAvailability } from "@/lib/availability";
import { priceBooking } from "@/lib/commission";
import { VEHICLE_TYPES } from "@/lib/constants";
import { formatDay, parseDay } from "@/lib/dates";
import { getLiveListings } from "@/lib/listing-cache";
import { currentUser } from "@/lib/session";
import { getCommissionSettings } from "@/lib/settings";

type Search = { type?: string; city?: string; start?: string; end?: string };

export const metadata = { title: "Explore vehicles · GRace Car Rentals" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  const user = await currentUser();
  const type = query.type && query.type in VEHICLE_TYPES ? query.type : undefined;
  const city = query.city?.trim() || undefined;
  const start = parseDay(query.start);
  const end = parseDay(query.end);
  const dated = Boolean(start && end && end >= start);

  const [settings, live] = await Promise.all([getCommissionSettings(), getLiveListings()]);
  const cityLower = city?.toLowerCase();
  const vehicles = live.filter(
    (v) =>
      (!type || v.type === type) &&
      (!cityLower || v.city.toLowerCase().includes(cityLower)) &&
      v.companyId !== user?.companyId,
  );

  type Result = { vehicle: (typeof vehicles)[number]; totalCents?: number; days?: number };
  const results = vehicles.flatMap((v): Result[] => {
    if (!dated) return [{ vehicle: v }];
    const availability = checkAvailability(v.windows, v.bookings, start!, end!);
    if (!availability.ok) return [];
    const price = priceBooking({
      days: availability.days,
      dailyRateCents: v.dailyRateCents,
      driverDailyRateCents: v.driverDailyRateCents,
      withDriver: false,
      renterFeeBps: settings.renterFeeBps,
      hostCommissionBps: 0,
    });
    return [{ vehicle: v, totalCents: price.renterTotalCents, days: price.days }];
  });
  const carry = dated ? `start=${formatDay(start!)}&end=${formatDay(end!)}` : undefined;

  const typeLink = (t?: string) => {
    const params = new URLSearchParams();
    if (t) params.set("type", t);
    if (city) params.set("city", city);
    if (dated) {
      params.set("start", formatDay(start!));
      params.set("end", formatDay(end!));
    }
    const qs = params.toString();
    return `/explore${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <SearchBar type={type} city={city} start={query.start} end={query.end} compact />

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        <TypeChip href={typeLink()} active={!type} label="All vehicles" />
        {Object.entries(VEHICLE_TYPES).map(([value, label]) => (
          <TypeChip key={value} href={typeLink(value)} active={type === value} label={label} />
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {results.length} vehicle{results.length === 1 ? "" : "s"}
          {dated ? " free for every day you picked" : " from verified owners"}
        </h1>
        {!dated && <p className="text-sm text-stone-500">Add dates to see only vehicles free on those days, with totals.</p>}
      </div>

      {results.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 p-12 text-center">
          <p className="font-medium">Nothing matches yet</p>
          <p className="mt-1 text-sm text-stone-500">Try fewer days, another vehicle type, or any city.</p>
          <Link href="/explore" className="btn-secondary mt-4">Clear filters</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((r) => (
            <ListingCard key={r.vehicle.id} vehicle={r.vehicle} query={carry} totalCents={r.totalCents} days={r.days} />
          ))}
        </div>
      )}
    </div>
  );
}

function TypeChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition ${
        active ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
      }`}
    >
      {label}
    </Link>
  );
}
