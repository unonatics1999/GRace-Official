import { AdminHeader } from "@/components/admin";
import { CredentialsForm } from "@/components/CredentialsForm";
import { requireAdmin } from "@/lib/session";

export default async function AdminSettings() {
  const admin = await requireAdmin();
  return (
    <>
      <AdminHeader
        title="Your admin sign-in"
        description="Change the email and password for this admin account. The change is recorded in the audit log."
      />
      <div className="card max-w-xl p-6">
        <CredentialsForm email={admin.email} />
      </div>
      <p className="mt-4 max-w-xl text-sm text-stone-500">
        Staff sign in at <code className="rounded bg-stone-100 px-1.5 py-0.5">/staff-login</code>. It isn&apos;t linked anywhere on the site. Bookmark it.
      </p>
    </>
  );
}
