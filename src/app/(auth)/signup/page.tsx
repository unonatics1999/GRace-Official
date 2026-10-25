import Link from "next/link";
import { SignupForm } from "@/components/SignupForm";

export const metadata = { title: "Create an account · Downtime" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-stone-500">
        Book a car with a driver right away, no ID needed. Verify your ID later to drive yourself or list your own car.
      </p>
      <SignupForm />
      <p className="mt-6 text-sm text-stone-500">
        Already have an account? <Link href="/login" className="font-medium text-brand-600">Log in</Link>
      </p>
    </>
  );
}
