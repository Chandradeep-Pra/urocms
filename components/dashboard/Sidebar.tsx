"use client";

export const nav = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Curriculum",
    icon: BookOpen,
    children: [
      // { name: "Courses", href: "/dashboard/courses", icon: Layers },
      { name: "Chapters", href: "/dashboard/curriculum/chapters", icon: FileText },
      // { name: "Topics", href: "/dashboard/topics", icon: HelpCircle },
    ],
  },
  {
    label: "Content",
    icon: Folder,
    children: [
      { name: "Questions", href: "/dashboard/content/questions", icon: HelpCircle },
      { name: "Videos", href: "/dashboard/content/videos", icon: Video },
      { name: "Announcements", href: "/dashboard/content/announcement", icon: Megaphone },
      // { name: "Resources", href: "/dashboard/content/resources", icon: FileText },
    ],
  },
  {
    label: "Assessments",
    icon: ClipboardList,
    children: [
      { name: "Tests", href: "/dashboard/assesments/tests", icon: ClipboardList },
      // { name: "Quizzes", href: "/dashboard/assesments/quizzes", icon: HelpCircle },
      { name: "Grand Mocks", href: "/dashboard/assesments/grand-mocks", icon: Sparkles },
      { name: "AI Viva Sets", href: "/dashboard/assesments/viva", icon: Brain },
    ],
  },
  // {
  //   label: "App Layout",
  //   icon: Sparkles,
  //   children: [
  //     { name: "Home Sections", href: "/dashboard/home-sections", icon: LayoutDashboard },
  //     { name: "Featured Content", href: "/dashboard/featured", icon: Star },
  //     { name: "Banners", href: "/dashboard/banners", icon: Image },
  //   ],
  // },
  {
    label: "Users",
    icon: Users,
    children: [
      { name: "Users", href: "/dashboard/users", icon: Users },
      // { name: "Bookmarks", href: "/dashboard/bookmarks", icon: Bookmark },
      // { name: "Progress", href: "/dashboard/progress", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    icon: Settings,
    children: [
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
      // { name: "Roles & Access", href: "/dashboard/roles", icon: ShieldCheck },
    ],
  },
];

import { BarChart3, Bookmark, BookOpen, Brain, ChevronRight, ClipboardList, FileText, Folder, HelpCircle, Image, Layers, LayoutDashboard, Megaphone, Settings, ShieldCheck, Sparkles, Star, Users, Video } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";







export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    nav.forEach((item) => {
      if (
        item.children?.some((c) => pathname.startsWith(c.href))
      ) {
        setOpen(item.label);
      }
    });
  }, [pathname]);

  return (
    <aside className="min-h-screen w-64 bg-slate-50 border-r border-slate-200 p-5 shadow-sm">
  {/* Logo / Title */}
  <h1 className="mb-8 px-2 text-lg font-semibold tracking-wide text-teal-700">
    UroCMS
  </h1>

  <nav className="space-y-1 text-sm">
    {nav.map((item) => {
      const Icon = item.icon;

      if (item.href) {
        const active = pathname === item.href;

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200
              ${
                active
                  ? "bg-teal-100 text-teal-700 shadow-sm"
                  : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"
              }`}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      }

      const isOpen = open === item.label;

      return (
        <div key={item.label} className="relative">
          {/* Parent */}
          <button
            onClick={() => setOpen(isOpen ? null : item.label)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200
              ${
                isOpen
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"
              }`}
          >
            <span className="flex items-center gap-3">
              <Icon size={18} />
              {item.label}
            </span>
            <ChevronRight
              size={14}
              className={`transition-transform duration-200 ${
                isOpen ? "rotate-90 text-blue-600" : ""
              }`}
            />
          </button>

          {/* Accent vertical spine */}
          {isOpen && (
            <span className="absolute left-[20px] top-11 bottom-2 w-px bg-teal-200" />
          )}

          {/* Children */}
          {isOpen && (
            <div className="ml-6 mt-2 space-y-1">
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                const active = pathname === child.href;

                return (
                  <div
                    key={child.href}
                    className="relative flex items-center"
                  >
                    {/* Branch line */}
                    <span className="absolute -left-3 top-1/2 h-px w-3 bg-teal-200" />

                    <Link
                      href={child.href}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 transition-all duration-200
                        ${
                          active
                            ? "bg-teal-600 text-white shadow-sm"
                            : "text-slate-500 hover:bg-teal-50 hover:text-teal-700"
                        }`}
                    >
                      <ChildIcon size={14} />
                      {child.name}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    })}
  </nav>
</aside>

  );
}
