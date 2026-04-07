"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  HelpCircle,
  FileText,
  Trophy,
  TrendingUp,
  BookOpen,
  Video,
  Brain,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import DailyQuizForm from "@/components/dashboard/DailyQuizManager";

type DashboardStats = {
  totalUsers: number;
  paidUsers: number;
  totalQuestions: number;
  mockTests: number;
  grandMocks: number;
  vivaCases: number;
  chapters: number;
  videos: number;
};

type GrowthPoint = {
  month: string;
  users: number;
};

type TierPoint = {
  name: string;
  value: number;
};

const EMPTY_STATS: DashboardStats = {
  totalUsers: 0,
  paidUsers: 0,
  totalQuestions: 0,
  mockTests: 0,
  grandMocks: 0,
  vivaCases: 0,
  chapters: 0,
  videos: 0,
};

const TIER_COLORS = ["hsl(187, 82%, 31%)", "hsl(214, 32%, 85%)"];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<DashboardStats>(EMPTY_STATS);
  const [userGrowth, setUserGrowth] = useState<GrowthPoint[]>([]);
  const [tierData, setTierData] = useState<TierPoint[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch metrics");

        const data = await res.json();
        setStatsData(data.stats ?? EMPTY_STATS);
        setUserGrowth(Array.isArray(data.userGrowth) ? data.userGrowth : []);
        setTierData(Array.isArray(data.tierData) ? data.tierData : []);
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const stats = useMemo(
    () => [
      { title: "Total Users", value: statsData.totalUsers.toLocaleString(), icon: Users, color: "text-primary" },
      { title: "Paid Users", value: statsData.paidUsers.toLocaleString(), icon: TrendingUp, color: "text-accent" },
      { title: "Total Questions", value: statsData.totalQuestions.toLocaleString(), icon: HelpCircle, color: "text-secondary" },
      { title: "Mock Tests", value: statsData.mockTests.toLocaleString(), icon: FileText, color: "text-info" },
      { title: "Grand Mocks", value: statsData.grandMocks.toLocaleString(), icon: Trophy, color: "text-warning" },
      { title: "AI Viva Cases", value: statsData.vivaCases.toLocaleString(), icon: Brain, color: "text-primary" },
      { title: "Chapters", value: statsData.chapters.toLocaleString(), icon: BookOpen, color: "text-accent" },
      { title: "Videos", value: statsData.videos.toLocaleString(), icon: Video, color: "text-secondary" },
    ],
    [statsData]
  );

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.title} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  {loading ? "Loading..." : "Live"}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <DailyQuizForm />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(214, 32%, 91%)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                />
                <Bar dataKey="users" fill="hsl(187, 82%, 31%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {!userGrowth.length && (
              <p className="text-xs text-muted-foreground mt-3">No user growth data available yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Paid vs Free</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={tierData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {tierData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={TIER_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-6 mt-2">
              {tierData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: TIER_COLORS[i] }} />
                  <span className="text-muted-foreground">{entry.name}: <span className="font-semibold text-foreground">{entry.value}</span></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
