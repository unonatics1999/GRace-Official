import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { currentUser } from "@/lib/session";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader user={user} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
