"use client";

import { useState } from "react";
import { DEFAULT_COMMISSION } from "@/lib/commission";

const HOST_FEE_RATE = DEFAULT_COMMISSION.baseBps.SEDAN / 10_000;

/** Lets a prospective host see what their idle days are worth. Weeks per month = 4.33. */
export function EarningsCalculator() {
  const [vehicles, setVehicles] = useState(1);
  const [idleDays, setIdleDays] = useState(2);
  const [rate, setRate] = useState(1800);
  const bookedShare = 0.5;

  const monthly = Math.round(vehicles * idleDays * 4.33 * bookedShare * rate * (1 - HOST_FEE_RATE));
  const money = (n: number) => n.toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="space-y-6">
        <Slider label="Cars you can list" value={vehicles} min={1} max={20} onChange={setVehicles} display={`${vehicles}`} />
        <Slider
          label="Days per week you don't use it"
          value={idleDays}
          min={1}
          max={7}
          onChange={setIdleDays}
          display={`${idleDays} day${idleDays === 1 ? "" : "s"}`}
        />
        <Slider label="Daily rate" value={rate} min={800} max={6000} step={100} onChange={setRate} display={money(rate)} />
      </div>
      <div className="mt-8 rounded-2xl bg-brand-900 p-6 text-white">
        <p className="text-sm text-brand-100">Estimated monthly payout</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight text-lime">{money(monthly)}</p>
        <p className="mt-2 text-xs text-brand-100">
          Self-drive only, assuming half your free days get booked, after a {HOST_FEE_RATE * 100}% commission. Driving it yourself adds the driver fee. An estimate, not a promise.
        </p>
      </div>
    </div>
  );
}

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display: string;
  onChange: (v: number) => void;
};

function Slider({ label, value, min, max, step = 1, display, onChange }: SliderProps) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="font-semibold text-stone-900">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[#1f5139]"
      />
    </label>
  );
}
