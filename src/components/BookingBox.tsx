"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { requestBooking } from "@/app/actions/bookings";
import { formatBps, priceBooking } from "@/lib/commission";
import { MAX_BOOKING_DAYS } from "@/lib/constants";
import type { ActionState } from "@/lib/util";

type Props = {
  vehicleId: string;
  dailyRateCents: number;
  driverDailyRateCents: number;
  renterFeeBps: number;
  selfDrive: { offered: boolean; eligible: boolean; reason?: string };
  withDriver: { offered: boolean; driverName?: string };
  minDate: string;
  defaultStart?: string;
  defaultEnd?: string;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Number.isNaN(ms) || ms < 0 ? 0 : Math.round(ms / 86_400_000) + 1;
}

/** Sticky booking panel on a listing: self-drive or with driver, live price, then a request. */
export function BookingBox(props: Props) {
  const [state, action] = useActionState<ActionState, FormData>(requestBooking, undefined);
  const defaultMode = props.selfDrive.offered && props.selfDrive.eligible ? "SELF_DRIVE" : props.withDriver.offered ? "WITH_DRIVER" : "SELF_DRIVE";
  const [mode, setMode] = useState<"SELF_DRIVE" | "WITH_DRIVER">(defaultMode);
  const [start, setStart] = useState(props.defaultStart ?? "");
  const [end, setEnd] = useState(props.defaultEnd ?? "");
  const days = daysBetween(start, end);
  const price =
    days > 0 && days <= MAX_BOOKING_DAYS
      ? priceBooking({
          days,
          dailyRateCents: props.dailyRateCents,
          driverDailyRateCents: props.driverDailyRateCents,
          withDriver: mode === "WITH_DRIVER",
          renterFeeBps: props.renterFeeBps,
          hostCommissionBps: 0,
        })
      : null;
  const selfDriveBlocked = mode === "SELF_DRIVE" && !props.selfDrive.eligible;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="vehicleId" value={props.vehicleId} />
      <input type="hidden" name="mode" value={mode} />

      {props.selfDrive.offered && props.withDriver.offered && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 text-sm">
          {(["SELF_DRIVE", "WITH_DRIVER"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg py-2 font-medium transition ${mode === m ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
            >
              {m === "SELF_DRIVE" ? "Self-drive" : "With driver"}
            </button>
          ))}
        </div>
      )}
      {mode === "WITH_DRIVER" && props.withDriver.driverName && (
        <p className="text-sm text-stone-600">
          Driven by <span className="font-medium text-stone-900">{props.withDriver.driverName}</span>, +{money(props.driverDailyRateCents)}/day.
        </p>
      )}
      {selfDriveBlocked && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {props.selfDrive.reason}{" "}
          <Link href="/account" className="font-medium underline">Add your licence</Link>
          {props.withDriver.offered && " or book with a driver."}
        </p>
      )}

      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-stone-300">
        <label className="block border-r border-stone-300 px-3 py-2">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500">Pick-up</span>
          <input
            type="date"
            name="start"
            required
            min={props.minDate}
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (end && e.target.value > end) setEnd(e.target.value);
            }}
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <label className="block px-3 py-2">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500">Return</span>
          <input
            type="date"
            name="end"
            required
            min={start || props.minDate}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      <textarea
        name="note"
        rows={2}
        maxLength={500}
        className="input"
        placeholder={mode === "WITH_DRIVER" ? "Pick-up point, destination and itinerary" : "What's the trip for? (optional)"}
      />

      <Submit disabled={selfDriveBlocked} />
      <p className="text-center text-xs text-stone-500">The owner confirms first. You pay by GCash, Maya or card after that.</p>

      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {days > MAX_BOOKING_DAYS && <p className="text-sm text-red-600">Bookings are limited to {MAX_BOOKING_DAYS} days.</p>}

      {price && (
        <dl className="space-y-2 border-t border-stone-200 pt-4 text-sm">
          <Row label={`Car: ${money(props.dailyRateCents)} × ${price.days} day${price.days === 1 ? "" : "s"}`} value={money(price.vehicleCents)} />
          {price.driverCents > 0 && (
            <Row label={`Driver: ${money(props.driverDailyRateCents)} × ${price.days}`} value={money(price.driverCents)} />
          )}
          <Row label={`Service fee (${formatBps(props.renterFeeBps)})`} value={money(price.renterFeeCents)} />
          <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{money(price.renterTotalCents)}</dd>
          </div>
          {mode === "WITH_DRIVER" && (
            <p className="text-xs text-stone-500">Fuel, tolls, parking and the driver&apos;s meals are settled with the owner unless agreed otherwise.</p>
          )}
        </dl>
      )}
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-stone-600">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="btn-primary w-full py-3 text-base">
      {pending ? "Sending…" : "Request to book"}
    </button>
  );
}
