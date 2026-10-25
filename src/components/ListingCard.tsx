import Link from "next/link";
import { VehicleImage } from "@/components/VehicleImage";
import { TRANSMISSIONS } from "@/lib/constants";
import { averageRating } from "@/lib/commission";
import { describeDowntime, driverBookable, vehicleTitle, type ListingVehicle } from "@/lib/listings";
import { formatCents } from "@/lib/util";

type Props = {
  vehicle: ListingVehicle;
  /** Dates carried to the listing page so its booking box is pre-filled. */
  query?: string;
  totalCents?: number;
  days?: number;
};

export function ListingCard({ vehicle: v, query, totalCents, days }: Props) {
  const withDriver = driverBookable(v);
  const rating = v.driver ? averageRating(v.driver.ratingSum, v.driver.ratingCount) : null;
  return (
    <Link href={`/listing/${v.id}${query ? `?${query}` : ""}`} className="group block">
      <div className="relative">
        <VehicleImage vehicle={v} className="aspect-[4/3] rounded-2xl ring-1 ring-black/5 transition duration-300 group-hover:shadow-xl group-hover:shadow-stone-300/60" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {v.selfDriveAllowed && <Pill>Self-drive</Pill>}
          {withDriver && <Pill dark>With driver</Pill>}
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-stone-900">{vehicleTitle(v)}</p>
          {rating !== null && (
            <p className="flex shrink-0 items-center gap-1 text-sm">
              <StarIcon /> {rating.toFixed(1)} <span className="text-stone-400">({v.driver!.ratingCount})</span>
            </p>
          )}
        </div>
        <p className="text-sm text-stone-500">
          {v.color} · {v.seats} seats · {TRANSMISSIONS[v.transmission as keyof typeof TRANSMISSIONS]} · {v.city}
        </p>
        <p className="flex items-center gap-1 text-sm text-stone-600">
          <VerifiedIcon /> {v.company.name}
        </p>
        <p className="text-sm text-brand-600">{describeDowntime(v.windows)}</p>
        <p className="pt-1 text-sm">
          <span className="font-semibold text-stone-900">{formatCents(v.dailyRateCents)}</span>
          <span className="text-stone-500"> / day</span>
          {withDriver && <span className="text-stone-500"> · driver +{formatCents(v.driverDailyRateCents)}</span>}
        </p>
        {totalCents !== undefined && days !== undefined && (
          <p className="text-sm text-stone-700">
            <span className="font-semibold">{formatCents(totalCents)}</span> total for {days} day{days === 1 ? "" : "s"}, self-drive
          </p>
        )}
      </div>
    </Link>
  );
}

function Pill({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur ${
        dark ? "bg-stone-900/85 text-white" : "bg-white/90 text-stone-800"
      }`}
    >
      {children}
    </span>
  );
}

export function StarIcon({ className = "h-3.5 w-3.5 text-amber-500" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8L10 1.8z" />
    </svg>
  );
}

export function VerifiedIcon({ className = "h-4 w-4 text-brand-600" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-label="Verified">
      <path
        fillRule="evenodd"
        d="M10 1.5l2.2 1.6 2.7-.2.9 2.6 2.3 1.5-.9 2.6.9 2.6-2.3 1.5-.9 2.6-2.7-.2L10 18.5l-2.2-1.6-2.7.2-.9-2.6-2.3-1.5.9-2.6-.9-2.6 2.3-1.5.9-2.6 2.7.2L10 1.5zm3.7 6.2a.75.75 0 00-1.1-1l-3.6 3.9-1.6-1.6a.75.75 0 10-1.1 1.1l2.2 2.1a.75.75 0 001.1 0l4.1-4.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
