import type { Vehicle } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { FUEL_TYPES, TRANSMISSIONS, VEHICLE_TYPES } from "@/lib/constants";
import { formatDay } from "@/lib/dates";
import type { ActionState } from "@/lib/util";

const SWATCHES = [
  ["Black", "#15171b"],
  ["Metallic Blue", "#1f4b8f"],
  ["White", "#e9ebee"],
  ["Silver", "#b8bcc2"],
  ["Gray", "#5b6068"],
  ["Red", "#9b1c1c"],
  ["Bronze", "#7a5a3a"],
] as const;

type Props = {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  vehicle?: Vehicle;
  defaultCity: string;
  submitLabel: string;
};

/** Every listing field, grouped the way an owner reads their OR/CR. */
export function VehicleForm({ action, vehicle: v, defaultCity, submitLabel }: Props) {
  const peso = (cents?: number) => (cents ? String(cents / 100) : "");
  return (
    <ActionForm action={action} submitLabel={submitLabel} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-stone-900">Vehicle (as on the CR)</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Make" name="make" defaultValue={v?.make} placeholder="Toyota" required />
          <Field label="Model" name="model" defaultValue={v?.model} placeholder="Vios" required />
          <Field label="Year" name="year" type="number" defaultValue={v?.year} placeholder="2023" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="label">Type</span>
            <select name="type" className="input" defaultValue={v?.type ?? ""} required>
              <option value="" disabled>Choose…</option>
              {Object.entries(VEHICLE_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <Field label="Plate number" name="plateNumber" defaultValue={v?.plateNumber} placeholder="NBC 1234" required />
          <Field label="Seats" name="seats" type="number" min={2} max={30} defaultValue={v?.seats ?? 5} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Transmission</span>
            <select name="transmission" className="input" defaultValue={v?.transmission ?? "AT"}>
              {Object.entries(TRANSMISSIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Fuel</span>
            <select name="fuelType" className="input" defaultValue={v?.fuelType ?? "GASOLINE"}>
              {Object.entries(FUEL_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr] sm:items-end">
          <Field label="Colour" name="color" defaultValue={v?.color} placeholder="Metallic Blue" required />
          <fieldset>
            <legend className="label">Closest shade (for the listing artwork)</legend>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map(([name, hex], i) => (
                <label key={hex} title={name} className="cursor-pointer">
                  <input
                    type="radio"
                    name="colorHex"
                    value={hex}
                    defaultChecked={v ? v.colorHex === hex : i === 0}
                    className="peer sr-only"
                  />
                  <span
                    className="block h-8 w-8 rounded-full ring-1 ring-black/10 ring-offset-2 peer-checked:ring-2 peer-checked:ring-brand-600"
                    style={{ background: hex }}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-stone-900">Registration and insurance</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="LTO registration valid until" name="registrationExpiry" type="date" defaultValue={v ? formatDay(v.registrationExpiry) : ""} required />
          <Field label="CTPL insurance valid until" name="insuranceExpiry" type="date" defaultValue={v ? formatDay(v.insuranceExpiry) : ""} required />
        </div>
        <p className="text-xs text-stone-500">Your listing pauses automatically if either lapses.</p>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-stone-900">How renters can book it</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-300 p-4 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
            <input type="checkbox" name="selfDriveAllowed" defaultChecked={v?.selfDriveAllowed ?? true} className="mt-1 accent-[#1f5139]" />
            <span>
              <span className="block text-sm font-medium">Self-drive</span>
              <span className="text-xs text-stone-500">Renters with a valid licence drive it themselves.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-300 p-4 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
            <input type="checkbox" name="withDriverAllowed" defaultChecked={v?.withDriverAllowed ?? true} className="mt-1 accent-[#1f5139]" />
            <span>
              <span className="block text-sm font-medium">With driver (you)</span>
              <span className="text-xs text-stone-500">You drive. Needs an approved driver profile.</span>
            </span>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Car rate per day (₱)" name="dailyRate" type="number" min={500} step="50" defaultValue={peso(v?.dailyRateCents)} placeholder="1800" required />
          <Field label="Driver rate per day (₱)" name="driverDailyRate" type="number" min={0} step="50" defaultValue={peso(v?.driverDailyRateCents)} placeholder="1000" />
          <Field label="Pick-up city" name="city" defaultValue={v?.city ?? defaultCity} required />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-stone-900">Listing</legend>
        <Field label="Features" name="equipment" defaultValue={v?.equipment.split(",").join(", ")} placeholder="dashcam, Apple CarPlay, roof rack" />
        <label className="block">
          <span className="label">Description</span>
          <textarea name="description" rows={4} maxLength={1000} defaultValue={v?.description} className="input" placeholder="Condition, what it's great for, pick-up instructions, house rules." />
        </label>
      </fieldset>
    </ActionForm>
  );
}
