import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardPwaInstallBanner } from "@/components/dashboard-pwa-install-banner";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <SidebarProvider className="max-md:h-svh max-md:overflow-hidden">
      <AppSidebar username={session.username} />
      <SidebarInset className="max-md:min-h-0 max-md:overflow-hidden">
        <MobilePageHeader username={session.username} />
        <div className="p-4 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] md:p-6 md:pb-6 max-md:min-h-0 max-md:flex-1 max-md:overflow-y-auto max-md:overscroll-y-contain">
          <DashboardPwaInstallBanner />
          {children}
        </div>
      </SidebarInset>
      <MobileBottomNav />
    </SidebarProvider>
  );
}
