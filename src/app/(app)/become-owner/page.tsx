import { redirect } from "next/navigation";
import { becomeOwner } from "@/app/actions/auth";
import { requireCompanyUser } from "@/lib/session";

export const metadata = { title: "List your car · GRace Car Rentals" };

export default async function BecomeOwnerPage() {
  const me = await requireCompanyUser();
  if (me.company.accountType === "OWNER") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="card p-8">
        <p className="font-mono text-sm text-brand-600">FOR CAR OWNERS</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Earn from your car on the days you don&apos;t use it</h1>
        <ul className="mt-6 space-y-3 text-sm text-stone-700">
          <li>✓ You choose the days it&apos;s available and approve every booking.</li>
          <li>✓ Drive it yourself to earn the driver fee too.</li>
          <li>✓ Paid weekly by GCash or bank transfer.</li>
          <li>✓ You&apos;ll need your OR/CR, CTPL insurance and a verified ID.</li>
        </ul>
        <form action={becomeOwner} className="mt-8">
          <button className="btn-primary px-6 py-3">Start listing my car</button>
        </form>
        <p className="mt-3 text-xs text-stone-500">You can still rent cars from the same account.</p>
      </div>
    </div>
  );
}
