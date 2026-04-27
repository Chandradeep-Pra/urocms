"use client";

import {
  BookOpen,
  Brain,
  ChevronRight,
  ClipboardList,
  FileText,
  Folder,
  HelpCircle,
  LayoutDashboard,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Smartphone,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
      { name: "Access Simulator", href: "/dashboard/system/access-simulator", icon: Smartphone },
      // { name: "Roles & Access", href: "/dashboard/roles", icon: ShieldCheck },
    ],
  },
];
export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [flyoutPosition, setFlyoutPosition] = useState<{ top: number; left: number } | null>(null);
  const parentButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    nav.forEach((item) => {
      if (
        item.children?.some((c) => pathname.startsWith(c.href))
      ) {
        setOpen(item.label);
      }
    });
  }, [pathname]);

  useEffect(() => {
    const stored = window.localStorage.getItem("dashboard.sidebar.collapsed");
    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "dashboard.sidebar.collapsed",
      String(collapsed),
    );

    if (collapsed) {
      setOpen(null);
      setFlyoutPosition(null);
    }
  }, [collapsed]);

  useEffect(() => {
    if (!collapsed || !open) {
      setFlyoutPosition(null);
      return;
    }

    const button = parentButtonRefs.current[open];
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const nextTop = Math.min(Math.max(rect.top, 12), window.innerHeight - 280);
    setFlyoutPosition({
      top: nextTop,
      left: rect.right + 12,
    });
  }, [collapsed, open]);

  const activeParent = useMemo(() => {
    return nav.find((item) => item.children?.some((c) => pathname.startsWith(c.href)))
      ?.label;
  }, [pathname]);

  const openItem = useMemo(() => {
    if (!open) return null;
    return nav.find((item) => item.label === open) ?? null;
  }, [open]);

  const openChildren = openItem?.children ?? [];

  const asideWidthClass = collapsed ? "w-20" : "w-72";

  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 overflow-x-hidden overflow-y-auto border-r border-slate-200 bg-slate-50/95 p-4 shadow-sm transition-[width] duration-300 ease-out ${asideWidthClass}`}
    >
      <div className="mb-6 flex items-center justify-between gap-2 px-1">
        <div
          className={`overflow-hidden transition-[max-width,opacity] duration-200 ease-out ${
            collapsed ? "max-w-0 opacity-0" : "max-w-[140px] opacity-100"
          }`}
        >
          <h1 className="bg-gradient-to-r from-teal-700 to-cyan-600 bg-clip-text text-lg font-semibold tracking-wide text-transparent">
            UroCMS
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="space-y-1.5 text-sm">
          {nav.map((item) => {
            const Icon = item.icon;

            if (item.href) {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={item.label}
                  className={`group flex items-center rounded-xl px-3 py-2.5 transition-colors duration-150 ${
                    collapsed ? "justify-center" : "justify-start gap-3"
                  } ${
                    active
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            }

            const isOpen = open === item.label;
            const isParentActive = activeParent === item.label;
            const children = item.children ?? [];

            return (
              <div key={item.label} className="relative">
                <button
                  ref={(el) => {
                    parentButtonRefs.current[item.label] = el;
                  }}
                  type="button"
                  onClick={() => {
                    const nextOpen = isOpen ? null : item.label;
                    setOpen(nextOpen);

                    if (!collapsed || !nextOpen) {
                      setFlyoutPosition(null);
                      return;
                    }

                    const button = parentButtonRefs.current[item.label];
                    if (!button) return;

                    const rect = button.getBoundingClientRect();
                    const nextTop = Math.min(Math.max(rect.top, 12), window.innerHeight - 280);
                    setFlyoutPosition({
                      top: nextTop,
                      left: rect.right + 12,
                    });
                  }}
                  title={item.label}
                  className={`flex w-full items-center rounded-xl px-3 py-2.5 transition-colors duration-150 ${
                    collapsed ? "justify-center" : "justify-between"
                  } ${
                    isOpen || isParentActive
                      ? "bg-cyan-50 text-cyan-700"
                      : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                  }`}
                >
                  <span className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>

                  {!collapsed && (
                    <ChevronRight
                      size={14}
                      className={`transition-transform duration-200 ${
                        isOpen ? "rotate-90 text-cyan-600" : ""
                      }`}
                    />
                  )}
                </button>

                {!collapsed && isOpen && (
                  <div className="ml-6 mt-2 space-y-1 border-l border-teal-200 pl-3">
                    {children.map((child) => {
                      const ChildIcon = child.icon;
                      const active = pathname === child.href;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors duration-150 ${
                            active
                              ? "bg-teal-600 text-white shadow-sm"
                              : "text-slate-500 hover:bg-teal-50 hover:text-teal-700"
                          }`}
                        >
                          <ChildIcon size={14} />
                          <span className="truncate">{child.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </nav>

      {collapsed && openItem && flyoutPosition && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-[100] w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
          style={{
            top: flyoutPosition.top,
            left: flyoutPosition.left,
          }}
        >
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {openItem.label}
          </p>

          <div className="space-y-1">
            {openChildren.map((child) => {
              const ChildIcon = child.icon;
              const active = pathname === child.href;

              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                    active
                      ? "bg-teal-600 text-white"
                      : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                  }`}
                >
                  <ChildIcon size={14} />
                  <span>{child.name}</span>
                </Link>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </aside>
  );
}
