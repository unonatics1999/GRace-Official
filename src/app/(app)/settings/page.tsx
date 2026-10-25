import { CredentialsForm } from "@/components/CredentialsForm";
import { requireCompanyUser } from "@/lib/session";

export const metadata = { title: "Email & password · GRace Car Rental" };

export default async function SettingsPage() {
  const me = await requireCompanyUser();
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="page-title">Email &amp; password</h1>
      <p className="mt-1 text-sm text-stone-500">How you sign in to GRace.</p>
      <div className="card mt-6 p-6">
        <CredentialsForm email={me.email} />
      </div>
    </div>
  );
}
