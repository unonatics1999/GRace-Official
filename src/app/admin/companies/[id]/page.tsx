import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDeleteAccount, adminUpdateAccount } from "@/app/actions/admin-crud";
import { AdminHeader } from "@/components/admin";
import { AccountForm, DangerZone } from "@/components/admin-forms";
import { BookingStatusBadge, CompanyStatusBadge } from "@/components/ui";
import { ROLES, type Role } from "@/lib/constants";
import { displayDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { vehicleTitle } from "@/lib/listings";
import { requireAdmin } from "@/lib/session";

export default async function AccountDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const flags = await searchParams;
  const c = await db.company.findUnique({
    where: { id },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      vehicles: { orderBy: { createdAt: "desc" } },
      bookings: { include: { vehicle: true }, orderBy: { createdAt: "desc" }, take: 10 },
      documents: true,
    },
  });
  if (!c) notFound();

  return (
    <>
      <Link href="/admin/companies" className="text-sm text-stone-500 hover:text-stone-900">← Accounts</Link>
      <AdminHeader title={c.name} description={`Joined ${displayDay(c.createdAt)} · ${c.documents.length} document(s) uploaded`}>
        <CompanyStatusBadge status={c.status} />
      </AdminHeader>
      {flags.created && <p className="mb-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">Account created.</p>}
      {flags.error === "history" && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          This account has bookings, payouts or admin history, so it can&apos;t be deleted. Set its status to Suspended instead.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <h2 className="mb-4 font-semibold">Details</h2>
          <AccountForm action={adminUpdateAccount.bind(null, c.id)} account={c} submitLabel="Save account" />
        </section>

        <div className="space-y-6">
          <section className="card">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Logins</h2>
              <Link href={`/admin/users/new?account=${c.id}`} className="text-sm text-brand-600 hover:underline">+ Add</Link>
            </div>
            <ul className="mt-2 divide-y divide-stone-100 text-sm">
              {c.users.map((u) => (
                <li key={u.id}>
                  <Link href={`/admin/users/${u.id}`} className="flex justify-between py-2 hover:bg-stone-50">
                    <span>{u.name} <span className="text-stone-400">· {u.email}</span></span>
                    <span className="text-stone-500">{ROLES[u.role as Role]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Vehicles</h2>
              <Link href={`/admin/vehicles/new?account=${c.id}`} className="text-sm text-brand-600 hover:underline">+ Add</Link>
            </div>
            {c.vehicles.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">None.</p>
            ) : (
              <ul className="mt-2 divide-y divide-stone-100 text-sm">
                {c.vehicles.map((v) => (
                  <li key={v.id}>
                    <Link href={`/admin/vehicles/${v.id}`} className="flex justify-between py-2 hover:bg-stone-50">
                      <span>{vehicleTitle(v)} <span className="text-stone-400">· {v.plateNumber}</span></span>
                      <span className="text-stone-500">{v.reviewStatus.toLowerCase()}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2 className="font-semibold">Recent rentals</h2>
            {c.bookings.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">None.</p>
            ) : (
              <ul className="mt-2 divide-y divide-stone-100 text-sm">
                {c.bookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-2">
                    <span>{vehicleTitle(b.vehicle)} · {displayDay(b.startDate)}</span>
                    <BookingStatusBadge status={b.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <DangerZone
            action={adminDeleteAccount.bind(null, c.id)}
            what="this account"
            note="Deletes the account, its logins, vehicles and documents. Refused if it has any bookings or payouts. Suspend it instead in that case."
          />
        </div>
      </div>
    </>
  );
}
