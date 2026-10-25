import Link from "next/link";
import { ResetPasswordForm } from "@/components/PasswordResetForms";

export const metadata = { title: "Choose a new password · GRace Car Rental", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      {token ? (
        <>
          <p className="mt-1 text-sm text-stone-500">You&apos;ll be signed in, and signed out on every other device.</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <p className="mt-3 text-sm text-stone-600">
          This link is incomplete. <Link href="/forgot-password" className="font-medium text-brand-600">Request a new reset link</Link>.
        </p>
      )}
    </div>
  );
}
