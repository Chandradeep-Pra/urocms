import StatCard from "@/components/dashboard/StatCard";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentActivity from "@/components/dashboard/RecentActivity";
import ContentOverview from "@/components/dashboard/ContentOverview";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-zinc-400 text-sm">
          Overview of UroCMS activity
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value="1,248" />
        <StatCard title="Paid Users" value="312" />
        <StatCard title="Active Content" value="184" />
        <StatCard title="Tests Published" value="42" />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <ContentOverview />
      </div>
    </div>
  );
}
