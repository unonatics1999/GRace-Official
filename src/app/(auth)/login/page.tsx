import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Log in · GRace Car Rentals" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  const initial = as === "owner" ? "OWNER" : "RENTER";
  return <LoginForm initial={initial} />;
}
