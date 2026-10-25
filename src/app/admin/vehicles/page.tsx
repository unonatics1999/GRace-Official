import Link from "next/link";
import { setVehicleBlocked } from "@/app/actions/admin";
import { ActionButton, AdminHeader, FilterTabs, Table, Td } from "@/components/admin";
import { VehicleArt } from "@/components/VehicleArt";
import { VEHICLE_TYPES, type VehicleType } from "@/lib/constants";
import { db } from "@/lib/db";
import { describeDowntime, listableWhere, vehicleTitle } from "@/lib/listings";
import { requireAdmin } from "@/lib/session";
import { formatCents } from "@/lib/util";

const FILTERS = {
  LIVE: () => listableWhere(),
  REVIEW: () => ({ reviewStatus: "SUBMITTED" }),
  HIDDEN: () => ({ blocked: true }),
  PAUSED: () => ({ active: false }),
};

export default async function AdminVehicles({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = status && status in FILTERS ? (status as keyof typeof FILTERS) : undefined;

  const vehicles = await db.vehicle.findMany({
    where: filter ? FILTERS[filter]() : {},
    include: { company: true, windows: true, _count: { select: { bookings: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <AdminHeader title="Vehicles" description="Every car on GRace. Hidden listings can't be un-hidden by their owner.">
        <Link href="/admin/vehicles/new" className="btn-primary">+ New vehicle</Link>
      </AdminHeader>
      <FilterTabs
        base="/admin/vehicles"
        current={filter}
        options={[
          { label: "All" },
          { value: "LIVE", label: "Live" },
          { value: "REVIEW", label: "Under review" },
          { value: "PAUSED", label: "Paused by host" },
          { value: "HIDDEN", label: "Hidden by admin" },
        ]}
      />
      <Table head={["Vehicle", "Host", "Rate", "GRace", "Bookings", "State", ""]} empty={vehicles.length === 0}>
        {vehicles.map((v) => {
          const live = v.reviewStatus === "APPROVED" && v.active && !v.blocked && v.company.status === "VERIFIED" && v.windows.length > 0;
          return (
            <tr key={v.id} className="hover:bg-stone-50/60">
              <Td>
                <div className="flex items-center gap-3">
                  <VehicleArt type={v.type} seed={v.id} colorHex={v.colorHex} className="h-10 w-14 shrink-0 rounded-md" />
                  <div>
                    <Link href={`/admin/vehicles/${v.id}`} className="font-medium text-brand-700 hover:underline">{vehicleTitle(v)}</Link>
                    <p className="text-xs text-stone-500">{v.color} · {v.plateNumber} · {VEHICLE_TYPES[v.type as VehicleType]} · {v.city}</p>
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
