import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";

export default function SignupPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Create your company account</h1>
      <p className="mt-1 text-sm text-stone-500">
        One account to list idle vehicles and to rent from other businesses. We verify every company before its
        first booking.
      </p>
      <ActionForm action={signup} submitLabel="Create account" className="mt-6 space-y-4">
        <Field label="Company name" name="companyName" required autoComplete="organization" />
        <Field label="City" name="city" required placeholder="Where your fleet is based" />
        <Field label="Your name" name="name" required autoComplete="name" />
        <Field label="Work email" name="email" type="email" required autoComplete="email" />
        <Field label="Password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </ActionForm>
      <p className="mt-6 text-sm text-stone-500">
        Already have an account? <Link href="/login" className="font-medium text-brand-600">Log in</Link>
      </p>
    </>
  );
}
