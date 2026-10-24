import type { BookingLike, WindowLike } from "@/lib/availability";
import { dayBooked, dayInDowntime } from "@/lib/availability";
import { WEEKDAYS } from "@/lib/constants";
import { addDays, displayDay, eachDay, today } from "@/lib/dates";

type Props = {
  windows: WindowLike[];
  bookings: BookingLike[];
  days?: number;
  /** Hosts see why a day is unavailable; renters only see free or not. */
  audience: "host" | "renter";
};

/** A week-aligned grid of the coming days, coloured by whether each can be rented. */
export function AvailabilityCalendar({ windows, bookings, days = 42, audience }: Props) {
  const start = today();
  const gridStart = addDays(start, -start.getUTCDay());
  const end = addDays(start, days - 1);
  const cells = eachDay(gridStart, end).map((day) => {
    const past = day < start;
    const state = past ? "past" : dayBooked(bookings, day) ? "booked" : dayInDowntime(windows, day) ? "free" : "busy";
    return { day, state };
  });

  const style: Record<string, string> = {
    past: "text-stone-300",
    free: "bg-lime/80 text-brand-900 font-medium",
    booked: audience === "host" ? "bg-brand-700 text-white" : "bg-stone-100 text-stone-400 line-through",
    busy: "bg-stone-100 text-stone-400",
  };
  const label: Record<string, string> = {
    past: "past",
    free: "available",
    booked: audience === "host" ? "booked" : "unavailable",
    busy: audience === "host" ? "you're using it" : "unavailable",
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-500">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1">{d}</div>
        ))}
        {cells.map(({ day, state }) => (
          <div
            key={day.toISOString()}
            title={`${displayDay(day)}: ${label[state]}`}
            className={`relative rounded-md py-2 text-sm ${style[state]}`}
          >
            {day.getUTCDate() === 1 && (
              <span className="absolute left-1 top-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-70">
                {day.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
              </span>
            )}
            {day.getUTCDate()}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-stone-600">
        <Legend className="bg-lime/80" label="Available" />
        {audience === "host" ? (
          <>
            <Legend className="bg-brand-700" label="Booked" />
            <Legend className="bg-stone-100" label="You're using it" />
          </>
        ) : (
          <Legend className="bg-stone-100" label="Unavailable" />
        )}
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
