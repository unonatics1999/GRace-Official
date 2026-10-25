import Link from "next/link";
import { adminCreateUser } from "@/app/actions/admin-crud";
import { AdminHeader } from "@/components/admin";
import { UserForm } from "@/components/admin-forms";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function NewUser({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  await requireAdmin();
  const { account } = await searchParams;
  const accounts = await db.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <>
      <Link href="/admin/users" className="text-sm text-stone-500 hover:text-stone-900">← Users</Link>
      <AdminHeader title="New user" description="Add a login to an existing account, or create another Downtime admin." />
      <div className="card max-w-2xl p-6">
        <UserForm
          action={adminCreateUser}
          accounts={accounts}
          user={account ? ({ companyId: account } as never) : undefined}
          submitLabel="Create user"
          creating
        />
      </div>
    </>
  );
}
