import Link from "next/link";
import { setVehicleBlocked } from "@/app/actions/admin";
import { ActionButton, AdminHeader, FilterTabs, Table, Td } from "@/components/admin";
import { VehicleArt } from "@/components/VehicleArt";
import { VEHICLE_TYPES, type VehicleType } from "@/lib/constants";
import { db } from "@/lib/db";
import { describeDowntime } from "@/lib/listings";
import { requireAdmin } from "@/lib/session";
import { formatCents } from "@/lib/util";

const FILTERS = {
  LIVE: { active: true, blocked: false, company: { status: "VERIFIED" }, windows: { some: {} } },
  HIDDEN: { blocked: true },
  PAUSED: { active: false },
} as const;

export default async function AdminVehicles({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = status && status in FILTERS ? (status as keyof typeof FILTERS) : undefined;

  const vehicles = await db.vehicle.findMany({
    where: filter ? FILTERS[filter] : {},
    include: { company: true, windows: true, _count: { select: { bookings: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <AdminHeader title="Vehicles" description="Hide a listing that breaks the rules. Hosts can't un-hide it themselves." />
      <FilterTabs
        base="/admin/vehicles"
        current={filter}
        options={[
          { label: "All" },
          { value: "LIVE", label: "Live" },
          { value: "PAUSED", label: "Paused by host" },
          { value: "HIDDEN", label: "Hidden by admin" },
        ]}
      />
      <Table head={["Vehicle", "Host", "Rate", "Downtime", "Bookings", "State", ""]} empty={vehicles.length === 0}>
        {vehicles.map((v) => {
          const live = v.active && !v.blocked && v.company.status === "VERIFIED" && v.windows.length > 0;
          return (
            <tr key={v.id} className="hover:bg-stone-50/60">
              <Td>
                <div className="flex items-center gap-3">
                  <VehicleArt type={v.type} seed={v.id} className="h-10 w-14 shrink-0 rounded-md" />
                  <div>
                    <p className="font-medium text-stone-900">{v.name}</p>
                    <p className="text-xs text-stone-500">{v.year} {VEHICLE_TYPES[v.type as VehicleType]} · {v.city}</p>
                  </div>
                </div>
              </Td>
              <Td className="text-stone-600">{v.company.name}</Td>
              <Td>{formatCents(v.dailyRateCents)}</Td>
              <Td className="text-stone-600">{describeDowntime(v.windows)}</Td>
              <Td>{v._count.bookings}</Td>
              <Td>
                {v.blocked ? (
                  <span className="badge bg-red-100 text-red-700">Hidden</span>
                ) : live ? (
                  <span className="badge bg-brand-100 text-brand-700">Live</span>
                ) : (
                  <span className="badge bg-stone-100 text-stone-600">Not live</span>
                )}
              </Td>
              <Td>
                <div className="flex justify-end gap-2">
                  {live && (
                    <Link href={`/listing/${v.id}`} className="btn-secondary px-2.5 py-1 text-xs">View</Link>
                  )}
                  {v.blocked ? (
                    <ActionButton action={setVehicleBlocked.bind(null, v.id, false)} label="Restore" />
                  ) : (
                    <ActionButton action={setVehicleBlocked.bind(null, v.id, true)} label="Hide" tone="danger" />
                  )}
                </div>
              </Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
