import Link from "next/link";
import { SignupForm } from "@/components/SignupForm";

export const metadata = { title: "Create an account · GRace Car Rental" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  const owner = as === "owner";
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{owner ? "List your car on GRace" : "Create your account"}</h1>
      <p className="mt-1 text-sm text-stone-500">Takes a minute. You can rent and list from the same account later.</p>
      <SignupForm initial={owner ? "OWNER" : "RENTER"} />
      <p className="mt-6 text-sm text-stone-500">
        Already have an account? <Link href={`/login${owner ? "?as=owner" : ""}`} className="font-medium text-brand-600">Log in</Link>
      </p>
    </>
  );
}
