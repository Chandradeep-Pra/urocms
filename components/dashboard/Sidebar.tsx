"use client";

import { BarChart3, Bookmark, BookOpen, Brain, ChevronRight, ClipboardList, FileText, Folder, HelpCircle, Image, Layers, LayoutDashboard, Settings, ShieldCheck, Sparkles, Star, Users, Video } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";


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
      { name: "Courses", href: "/dashboard/courses", icon: Layers },
      { name: "Chapters", href: "/dashboard/chapters", icon: FileText },
      { name: "Topics", href: "/dashboard/topics", icon: HelpCircle },
    ],
  },
  {
    label: "Content",
    icon: Folder,
    children: [
      { name: "Questions", href: "/dashboard/questions", icon: HelpCircle },
      { name: "Videos", href: "/dashboard/videos", icon: Video },
      { name: "Resources", href: "/dashboard/resources", icon: FileText },
    ],
  },
  {
    label: "Assessments",
    icon: ClipboardList,
    children: [
      { name: "Tests", href: "/dashboard/tests", icon: ClipboardList },
      { name: "Quizzes", href: "/dashboard/quizzes", icon: HelpCircle },
      { name: "Grand Mocks", href: "/dashboard/grand-mocks", icon: Sparkles },
      { name: "AI Viva Sets", href: "/dashboard/viva", icon: Brain },
    ],
  },
  {
    label: "App Layout",
    icon: Sparkles,
    children: [
      { name: "Home Sections", href: "/dashboard/home-sections", icon: LayoutDashboard },
      { name: "Featured Content", href: "/dashboard/featured", icon: Star },
      { name: "Banners", href: "/dashboard/banners", icon: Image },
    ],
  },
  {
    label: "Users",
    icon: Users,
    children: [
      { name: "Users", href: "/dashboard/users", icon: Users },
      { name: "Bookmarks", href: "/dashboard/bookmarks", icon: Bookmark },
      { name: "Progress", href: "/dashboard/progress", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    icon: Settings,
    children: [
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
      { name: "Roles & Access", href: "/dashboard/roles", icon: ShieldCheck },
    ],
  },
];




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
    <aside className="h-screen w-64 border-r border-white/10 bg-[#050506] p-4">
      <h1 className="mb-6 px-2 text-sm font-semibold tracking-wide text-white">
        UroCMS
      </h1>

      <nav className="space-y-1 text-sm">
        {nav.map((item) => {
          const Icon = item.icon;

          if (item.href) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-400 hover:bg-white/5 hover:text-white`}
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
                onClick={() =>
                  setOpen(isOpen ? null : item.label)
                }
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white"
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} />
                  {item.label}
                </span>
                <ChevronRight
                  size={14}
                  className={`transition ${
                    isOpen ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Accent vertical spine */}
              {isOpen && (
                <span className="absolute left-[18px] top-10 bottom-2 w-px bg-indigo-500/50" />
              )}

              {/* Children */}
              {isOpen && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child, idx) => {
                    const ChildIcon = child.icon;
                    const active = pathname === child.href;

                    return (
                      <div
                        key={child.href}
                        className="relative flex items-center"
                      >
                        {/* Branch line */}
                        <span className="absolute -left-3 top-1/2 h-px w-3 bg-indigo-500/50" />

                        <Link
                          href={child.href}
                          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 transition
                            ${
                              active
                                ? "bg-indigo-500/10 text-white"
                                : "text-zinc-400 hover:bg-white/5 hover:text-white"
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
