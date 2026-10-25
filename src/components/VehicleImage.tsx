import { VehicleArt } from "@/components/VehicleArt";
import { photoUrl } from "@/lib/listings";

type Props = {
  vehicle: {
    id: string;
    type: string;
    colorHex: string;
    make: string;
    model: string;
    photos?: { id: string; representative?: boolean; credit?: string }[];
  };
  className?: string;
};

/** The vehicle's cover photo, or its artwork until the host uploads photos. */
export function VehicleImage({ vehicle, className = "" }: Props) {
  const cover = vehicle.photos?.[0];
  if (!cover) return <VehicleArt type={vehicle.type} seed={vehicle.id} colorHex={vehicle.colorHex} className={className} />;
  return (
    <div className={`relative overflow-hidden bg-stone-100 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- served by our own auth-checked route */}
      <img
        src={photoUrl(cover.id)}
        alt={`${vehicle.make} ${vehicle.model}`}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        title={cover.credit ? `Photo: ${cover.credit}` : undefined}
      />
      {cover.representative && (
        <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
          Representative photo
        </span>
      )}
    </div>
  );
}
