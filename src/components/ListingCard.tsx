import Link from "next/link";
import type { Company, DowntimeWindow, Vehicle } from "@prisma/client";
import { VehicleArt } from "@/components/VehicleArt";
import { VEHICLE_TYPES, type VehicleType } from "@/lib/constants";
import { describeDowntime, equipmentTags } from "@/lib/listings";
import { formatCents } from "@/lib/util";

type Props = {
  vehicle: Vehicle & { company: Company; windows: DowntimeWindow[] };
  /** Dates carried to the listing page so its booking box is pre-filled. */
  query?: string;
  totalCents?: number;
  days?: number;
};

export function ListingCard({ vehicle: v, query, totalCents, days }: Props) {
  const tags = equipmentTags(v.equipment);
  return (
    <Link href={`/listing/${v.id}${query ? `?${query}` : ""}`} className="group block">
      <VehicleArt type={v.type} seed={v.id} className="aspect-[4/3] rounded-2xl transition group-hover:brightness-95" />
      <div className="mt-3 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-stone-900">{v.name}</p>
          <p className="shrink-0 text-sm">
            <span className="font-semibold">{formatCents(v.dailyRateCents)}</span>
            <span className="text-stone-500"> / day</span>
          </p>
        </div>
        <p className="text-sm text-stone-500">
          {v.year} {VEHICLE_TYPES[v.type as VehicleType]} · {v.city}
        </p>
        <p className="flex items-center gap-1 text-sm text-stone-600">
          <VerifiedIcon /> {v.company.name}
        </p>
        <p className="text-sm text-brand-600">{describeDowntime(v.windows)}</p>
        {tags.length > 0 && (
          <p className="truncate text-xs text-stone-500">{tags.join(" · ")}</p>
        )}
        {totalCents !== undefined && days !== undefined && (
          <p className="pt-1 text-sm text-stone-700">
            <span className="font-semibold">{formatCents(totalCents)}</span> total for {days} day{days === 1 ? "" : "s"}
          </p>
        )}
      </div>
    </Link>
  );
}

export function VerifiedIcon({ className = "h-4 w-4 text-brand-600" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-label="Verified business">
      <path
        fillRule="evenodd"
        d="M10 1.5l2.2 1.6 2.7-.2.9 2.6 2.3 1.5-.9 2.6.9 2.6-2.3 1.5-.9 2.6-2.7-.2L10 18.5l-2.2-1.6-2.7.2-.9-2.6-2.3-1.5.9-2.6-.9-2.6 2.3-1.5.9-2.6 2.7.2L10 1.5zm3.7 6.2a.75.75 0 00-1.1-1l-3.6 3.9-1.6-1.6a.75.75 0 10-1.1 1.1l2.2 2.1a.75.75 0 001.1 0l4.1-4.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
