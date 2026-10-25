import Link from "next/link";
import { SignupForm } from "@/components/SignupForm";

export const metadata = { title: "Create an account · Downtime" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-stone-500">
        One account to rent cars, hire a driver, or list your own car and earn. We verify everyone before their first booking.
      </p>
      <SignupForm />
      <p className="mt-6 text-sm text-stone-500">
        Already have an account? <Link href="/login" className="font-medium text-brand-600">Log in</Link>
      </p>
    </>
  );
}
