import AdminGuard from "@/components/dashboard/AdminGuard";
import Sidebar from "@/components/dashboard/Sidebar";
import { requireDashboardSession } from "@/lib/server/dashboardSession";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDashboardSession();
  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="h-screen flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
