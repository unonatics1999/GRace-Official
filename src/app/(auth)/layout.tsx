import Link from "next/link";
import { redirect } from "next/navigation";
import { VehicleArt } from "@/components/VehicleArt";
import { Logo } from "@/components/ui";
import { currentUser } from "@/lib/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (user) redirect(user.isAdmin ? "/admin" : "/dashboard");

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Link href="/" aria-label="Downtime home">
          <Logo className="text-lg" />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-brand-900 lg:block">
        <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 space-y-8 text-white">
          <VehicleArt type="CARGO_VAN" seed="auth" className="aspect-[2/1] rounded-3xl" />
          <div>
            <p className="text-3xl font-semibold tracking-tight">One business&apos;s downtime is another business&apos;s peak.</p>
            <p className="mt-3 text-brand-100">
              Rent idle vans, trucks and pickups to verified businesses — or rent one for your next job.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
