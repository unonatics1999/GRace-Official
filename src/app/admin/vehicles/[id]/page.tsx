import Link from "next/link";
import { notFound } from "next/navigation";
import { setVehicleBlocked } from "@/app/actions/admin";
import { adminDeleteVehicle, adminUpdateVehicle } from "@/app/actions/admin-crud";
import { ActionButton, AdminHeader } from "@/components/admin";
import { AdminVehicleFields, DangerZone } from "@/components/admin-forms";
import { VehicleImage } from "@/components/VehicleImage";
import { VehicleForm } from "@/components/VehicleForm";
import { db } from "@/lib/db";
import { vehicleTitle } from "@/lib/listings";
import { requireAdmin } from "@/lib/session";

export default async function VehicleDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const flags = await searchParams;
  const v = await db.vehicle.findUnique({
    where: { id },
    include: { company: true, photos: { orderBy: { position: "asc" } }, _count: { select: { bookings: true, documents: true } } },
  });
  if (!v) notFound();

  return (
    <>
      <Link href="/admin/vehicles" className="text-sm text-stone-500 hover:text-stone-900">← Vehicles</Link>
      <AdminHeader title={`${vehicleTitle(v)} · ${v.plateNumber}`} description={`Owner: ${v.company.name} · ${v._count.bookings} booking(s) · ${v._count.documents} document(s)`}>
        <div className="flex gap-2">
          <Link href={`/admin/companies/${v.companyId}`} className="btn-secondary px-3 py-1.5 text-xs">Owner account</Link>
          {v.blocked ? (
            <ActionButton action={setVehicleBlocked.bind(null, v.id, false)} label="Unhide listing" />
          ) : (
            <ActionButton action={setVehicleBlocked.bind(null, v.id, true)} label="Hide listing" tone="danger" />
          )}
        </div>
      </AdminHeader>
      {flags.created && <p className="mb-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">Vehicle created.</p>}
      {flags.error === "history" && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">This vehicle has bookings, so it can&apos;t be deleted. Hide the listing instead.</p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="card p-6">
          <VehicleForm
            action={adminUpdateVehicle.bind(null, v.id)}
            vehicle={v}
            defaultCity={v.city}
            submitLabel="Save vehicle"
            extra={<AdminVehicleFields review={v.reviewStatus} />}
          />
        </section>
        <div className="space-y-6">
          <VehicleImage vehicle={v} className="aspect-[4/3] rounded-xl" />
          <DangerZone
            action={adminDeleteVehicle.bind(null, v.id)}
            what="this vehicle"
            note="Removes the vehicle with its photos, papers and availability. Refused if it has ever been booked."
          />
        </div>
      </div>
    </>
  );
}
