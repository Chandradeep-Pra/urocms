"use client";

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

const stats = [
  { title: "Total Users", value: "2,847", change: "+12%", icon: Users, color: "text-primary" },
  { title: "Paid Users", value: "1,203", change: "+8%", icon: TrendingUp, color: "text-accent" },
  { title: "Total Questions", value: "5,432", change: "+24", icon: HelpCircle, color: "text-secondary" },
  { title: "Mock Tests", value: "48", change: "+3", icon: FileText, color: "text-info" },
  { title: "Grand Mocks", value: "6", change: "1 upcoming", icon: Trophy, color: "text-warning" },
  { title: "AI Viva Cases", value: "124", change: "+5", icon: Brain, color: "text-primary" },
  { title: "Chapters", value: "32", change: "", icon: BookOpen, color: "text-accent" },
  { title: "Videos", value: "87", change: "+6", icon: Video, color: "text-secondary" },
];

const userGrowth = [
  { month: "Sep", users: 180 },
  { month: "Oct", users: 320 },
  { month: "Nov", users: 450 },
  { month: "Dec", users: 580 },
  { month: "Jan", users: 720 },
  { month: "Feb", users: 847 },
];

const tierData = [
  { name: "Paid", value: 1203 },
  { name: "Free", value: 1644 },
];

const TIER_COLORS = ["hsl(187, 82%, 31%)", "hsl(214, 32%, 85%)"];

const Dashboard = () => {
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
                {stat.change && (
                  <p className="mt-1 text-xs text-accent font-medium">{stat.change}</p>
                )}
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
