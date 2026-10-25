import { LoginForm } from "@/components/LoginForm";

// Admin sign-in. Not linked from anywhere and kept out of search engines; admin accounts can only
// sign in here, and renter/owner accounts can't use it.
export const metadata = { title: "Staff sign-in · GRace Car Rental", robots: { index: false, follow: false } };

export default function StaffLoginPage() {
  return <LoginForm admin />;
}
