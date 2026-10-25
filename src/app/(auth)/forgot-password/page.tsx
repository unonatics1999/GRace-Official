import { ForgotPasswordForm } from "@/components/PasswordResetForms";

export const metadata = { title: "Forgot password · GRace Car Rental" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
      <p className="mt-1 text-sm text-stone-500">Enter your account email and we&apos;ll send you a link to choose a new one.</p>
      <ForgotPasswordForm />
    </div>
  );
}
