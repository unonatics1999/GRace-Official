import Link from "next/link";
import { login } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";

export default function LoginPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Log in</h1>
      <ActionForm action={login} submitLabel="Log in" className="mt-6 space-y-4">
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Password" name="password" type="password" required autoComplete="current-password" />
      </ActionForm>
      <p className="mt-6 text-sm text-stone-500">
        New to Downtime? <Link href="/signup" className="font-medium text-brand-600">Create a company account</Link>
      </p>
    </>
  );
}
