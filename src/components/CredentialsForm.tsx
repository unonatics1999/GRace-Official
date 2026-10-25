import { updateCredentials } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";

/** Change sign-in email and password; used on /settings and /admin/settings. */
export function CredentialsForm({ email }: { email: string }) {
  return (
    <ActionForm action={updateCredentials} submitLabel="Save changes" className="space-y-4">
      <Field label="Email" name="email" type="email" defaultValue={email} autoComplete="email" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password (leave blank to keep)" name="newPassword" type="password" autoComplete="new-password" minLength={10} />
        <Field label="Repeat new password" name="confirmPassword" type="password" autoComplete="new-password" />
      </div>
      <Field label="Current password (required to save)" name="currentPassword" type="password" autoComplete="current-password" required />
    </ActionForm>
  );
}
