import Link from "next/link";
import { adminCreateVehicle } from "@/app/actions/admin-crud";
import { AdminHeader } from "@/components/admin";
import { AdminVehicleFields } from "@/components/admin-forms";
import { VehicleForm } from "@/components/VehicleForm";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function NewVehicle({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  await requireAdmin();
  const { account } = await searchParams;
  const accounts = await db.company.findMany({ select: { id: true, name: true, city: true }, orderBy: { name: "asc" } });
  return (
    <>
      <Link href="/admin/vehicles" className="text-sm text-stone-500 hover:text-stone-900">← Vehicles</Link>
      <AdminHeader title="New vehicle" description="Add a car on an owner's behalf. Photos, papers and availability are added on the owner's fleet page." />
      <div className="card max-w-3xl p-6">
        <VehicleForm
          action={adminCreateVehicle}
          defaultCity=""
          submitLabel="Create vehicle"
          extra={<AdminVehicleFields accounts={accounts} account={account} />}
        />
      </div>
    </>
  );
}
