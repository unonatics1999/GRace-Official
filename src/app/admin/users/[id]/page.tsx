import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDeleteUser, adminUpdateUser } from "@/app/actions/admin-crud";
import { AdminHeader } from "@/components/admin";
import { DangerZone, UserForm } from "@/components/admin-forms";
import { displayDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function UserDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const flags = await searchParams;
  const [user, accounts] = await Promise.all([
    db.user.findUnique({ where: { id }, include: { company: true } }),
    db.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!user) notFound();
  const userLastLogin = await db.loginAttempt.findFirst({ where: { email: user.email, success: true }, orderBy: { createdAt: "desc" } });

  return (
    <>
      <Link href="/admin/users" className="text-sm text-stone-500 hover:text-stone-900">← Users</Link>
      <AdminHeader
        title={user.name}
        description={`${user.isAdmin ? "Admin" : user.company?.name ?? "No account"} · last login ${userLastLogin ? displayDateTime(userLastLogin.createdAt) : "never"}`}
      />
      {flags.created && <p className="mb-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">User created. Share the temporary password with them privately.</p>}
      {flags.error === "history" && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          This user has bookings, checklists, ratings or admin history, so they can&apos;t be deleted. Reset their password or suspend their account instead.
        </p>
      )}
      {flags.error === "self" && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">You can&apos;t delete your own admin account.</p>}

      <div className="grid max-w-5xl gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="card p-6">
          <UserForm action={adminUpdateUser.bind(null, user.id)} user={user} accounts={accounts} submitLabel="Save user" />
        </section>
        {user.id !== admin.id && (
          <DangerZone
            action={adminDeleteUser.bind(null, user.id)}
            what="this user"
            note="Removes this login. Refused if they've made bookings, filled checklists, left ratings or taken admin actions."
          />
        )}
      </div>
    </>
  );
}
