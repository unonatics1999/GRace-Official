import { VEHICLE_TYPES } from "@/lib/constants";
import { formatDay, today } from "@/lib/dates";

type Props = { type?: string; city?: string; start?: string; end?: string; compact?: boolean };

/** GET form to /explore: the same search on the home page and the explore page. */
export function SearchBar({ type, city, start, end, compact }: Props) {
  const min = formatDay(today());
  return (
    <form
      action="/explore"
      className={`grid gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm sm:grid-cols-[1fr_1fr_1fr_1fr_auto] ${
        compact ? "" : "sm:rounded-full sm:p-2 sm:pl-4"
      }`}
    >
      <SearchField label="Vehicle">
        <select name="type" defaultValue={type ?? ""} className="w-full bg-transparent text-sm outline-none">
          <option value="">Any type</option>
          {Object.entries(VEHICLE_TYPES).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </SearchField>
      <SearchField label="Where">
        <input name="city" defaultValue={city ?? ""} placeholder="Any city" className="w-full bg-transparent text-sm outline-none" />
      </SearchField>
      <SearchField label="From">
        <input type="date" name="start" min={min} defaultValue={start ?? ""} className="w-full bg-transparent text-sm outline-none" />
      </SearchField>
      <SearchField label="To">
        <input type="date" name="end" min={min} defaultValue={end ?? ""} className="w-full bg-transparent text-sm outline-none" />
      </SearchField>
      <button className="btn-primary rounded-xl px-6 py-3 sm:rounded-full">Search</button>
    </form>
  );
}

function SearchField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-xl px-3 py-1.5 hover:bg-stone-50">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</span>
      {children}
    </label>
  );
}
