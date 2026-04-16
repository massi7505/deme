import { Header } from "@/components/layout/Header";
import { DashboardNav, MobileNav } from "@/components/layout/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <DashboardNav />
        <main className="flex-1 bg-muted/30 pb-20 lg:pb-0">
          <div className="container max-w-6xl py-6 lg:py-8">{children}</div>
        </main>
      </div>
      <MobileNav />
    </>
  );
}
