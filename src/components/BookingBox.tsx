"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { requestBooking } from "@/app/actions/bookings";
import { quote } from "@/lib/availability";
import { MAX_BOOKING_DAYS } from "@/lib/constants";
import type { ActionState } from "@/lib/util";

type Props = {
  vehicleId: string;
  dailyRateCents: number;
  minDate: string;
  defaultStart?: string;
  defaultEnd?: string;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Number.isNaN(ms) || ms < 0 ? 0 : Math.round(ms / 86_400_000) + 1;
}

/** Sticky booking panel on a listing: live quote, then a request to the host. */
export function BookingBox({ vehicleId, dailyRateCents, minDate, defaultStart = "", defaultEnd = "" }: Props) {
  const [state, action] = useActionState<ActionState, FormData>(requestBooking, undefined);
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const days = daysBetween(start, end);
  const price = days > 0 && days <= MAX_BOOKING_DAYS ? quote(dailyRateCents, days) : null;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-stone-300">
        <label className="block border-r border-stone-300 px-3 py-2">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500">Pick up</span>
          <input
            type="date"
            name="start"
            required
            min={minDate}
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
            min={start || minDate}
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
        placeholder="What's the job? Helps the host say yes. (optional)"
      />

      <Submit />
      <p className="text-center text-xs text-stone-500">The host approves every request. You won&apos;t be charged yet.</p>

      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {days > MAX_BOOKING_DAYS && (
        <p className="text-sm text-red-600">Bookings are limited to {MAX_BOOKING_DAYS} days.</p>
      )}

      {price && (
        <dl className="space-y-2 border-t border-stone-200 pt-4 text-sm">
          <Row label={`${money(dailyRateCents)} × ${price.days} day${price.days === 1 ? "" : "s"}`} value={money(price.subtotalCents)} />
          <Row label="Downtime service fee (10%)" value={money(price.renterFeeCents)} />
          <div className="flex justify-between border-t border-stone-200 pt-2 font-semibold">
            <dt>Total</dt>
            <dd>{money(price.renterTotalCents)}</dd>
          </div>
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

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-3 text-base">
      {pending ? "Sending…" : "Request to book"}
    </button>
  );
}
