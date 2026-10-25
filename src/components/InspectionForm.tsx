"use client";

import { useState, useTransition } from "react";
import { submitInspection } from "@/app/actions/inspections";
import { compressImage } from "@/lib/compress-image";
import { FUEL_LEVELS, PHOTO_ANGLES, REQUIRED_PHOTO_ANGLES, type PhotoAngle } from "@/lib/constants";
import type { ActionState } from "@/lib/util";

type Props = { bookingId: string; phase: "PICKUP" | "RETURN"; minOdometer?: number };

/** The handoff checklist: a photo per angle (camera on phones), odometer, fuel and notes. */
export function InspectionForm({ bookingId, phase, minOdometer }: Props) {
  const [previews, setPreviews] = useState<Partial<Record<PhotoAngle, string>>>({});
  const [files, setFiles] = useState<Partial<Record<PhotoAngle, File>>>({});
  const [fuel, setFuel] = useState(4);
  const [state, setState] = useState<ActionState>();
  const [pending, start] = useTransition();

  function pick(angle: PhotoAngle, file: File | undefined) {
    if (!file) return;
    setFiles((f) => ({ ...f, [angle]: file }));
    setPreviews((p) => ({ ...p, [angle]: URL.createObjectURL(file) }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = new FormData(e.currentTarget);
    start(async () => {
      const form = new FormData();
      form.set("odometerKm", String(raw.get("odometerKm") ?? ""));
      form.set("fuelQuarters", String(fuel));
      form.set("notes", String(raw.get("notes") ?? ""));
      for (const [angle, file] of Object.entries(files)) {
        if (file) form.set(`photo_${angle}`, await compressImage(file));
      }
      setState(await submitInspection(bookingId, phase, form));
    });
  }

  if (state?.ok) return <p className="rounded-lg bg-brand-50 p-4 text-sm text-brand-700">{state.ok}</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(Object.keys(PHOTO_ANGLES) as PhotoAngle[]).map((angle) => (
          <label key={angle} className="group relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 hover:border-brand-500">
            {previews[angle] ? (
              /* eslint-disable-next-line @next/next/no-img-element -- local preview of the picked file */
              <img src={previews[angle]} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-0 grid place-items-center p-2 text-center text-xs text-stone-500">
                <span>
                  <span className="mb-1 block text-2xl text-stone-400">+</span>
                  {PHOTO_ANGLES[angle]}
                  {!REQUIRED_PHOTO_ANGLES.includes(angle) && <span className="block text-stone-400">(optional)</span>}
                </span>
              </span>
            )}
            {previews[angle] && (
              <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[11px] text-white">{PHOTO_ANGLES[angle]}</span>
            )}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pick(angle, e.target.files?.[0])} />
          </label>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Odometer (km)</span>
          <input name="odometerKm" type="number" inputMode="numeric" min={minOdometer ?? 0} required className="input" placeholder={minOdometer ? `At least ${minOdometer}` : "e.g. 24510"} />
        </label>
        <div>
          <span className="label">Fuel level</span>
          <div className="grid grid-cols-5 gap-1">
            {FUEL_LEVELS.map((label, q) => (
              <button
                key={label}
                type="button"
                onClick={() => setFuel(q)}
                className={`rounded-md border py-2 text-xs font-medium ${fuel === q ? "border-brand-700 bg-brand-700 text-white" : "border-stone-300 bg-white"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="block">
        <span className="label">Existing scratches, dents or notes</span>
        <textarea name="notes" rows={2} maxLength={1000} className="input" placeholder="e.g. small scratch on rear bumper, left side" />
      </label>

      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full py-3 sm:w-auto">
        {pending ? "Uploading photos…" : `Submit ${phase === "PICKUP" ? "pick-up" : "return"} checklist`}
      </button>
    </form>
  );
}
