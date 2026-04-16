import {
  DashboardNav,
  DashboardMobileHeader,
  MobileNav,
} from "@/components/layout/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <DashboardNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardMobileHeader />
        <main className="flex-1 pb-24 lg:pb-8">
          <div className="container max-w-6xl py-4 lg:py-8">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
