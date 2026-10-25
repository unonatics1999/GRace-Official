import Link from "next/link";
import { adminCreateAccount } from "@/app/actions/admin-crud";
import { AdminHeader } from "@/components/admin";
import { AccountForm } from "@/components/admin-forms";
import { requireAdmin } from "@/lib/session";

export default async function NewAccount() {
  await requireAdmin();
  return (
    <>
      <Link href="/admin/companies" className="text-sm text-stone-500 hover:text-stone-900">← Accounts</Link>
      <AdminHeader title="New account" description="Create a renter or car-owner account and its first login, e.g. for a partner who signed up offline." />
      <div className="card max-w-3xl p-6">
        <AccountForm action={adminCreateAccount} withOwner submitLabel="Create account" />
      </div>
    </>
  );
}
