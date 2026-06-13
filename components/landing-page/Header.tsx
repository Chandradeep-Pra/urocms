"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { consumeRecentLogoutFlag, syncTestingZoneAuth } from "@/lib/testingZoneAuthHandoff";
import { LazySignUpDialog } from "./LazySignUpDialog";

const navItems = [
  { label: "Mentor", href: "#mentor" },
  { label: "Courses", href: "#courses" },
  { label: "AI Viva", href: "#ai-viva" },
  { label: "Stories", href: "#stories" },
  // { label: "Pricing", href: "/pricing" },
];

const CONFIGURED_USER_APP_URL = process.env.NEXT_PUBLIC_USER_APP_URL || "/web";
const USER_APP_URL = CONFIGURED_USER_APP_URL.includes("testing-zone-five.vercel.app")
  ? "/web"
  : CONFIGURED_USER_APP_URL;

function getFirstName(user: User | null) {
  const source = user?.displayName || user?.email?.split("@")[0] || "";
  return source.trim().split(/\s+/)[0] || "Learner";
}

export function LandingHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [openingPlatform, setOpeningPlatform] = useState(false);
  const [checkingDestination, setCheckingDestination] = useState(false);
  const [showAdminChoice, setShowAdminChoice] = useState(false);
  const handledAuthUidRef = useRef<string | null>(null);
  const skipAutoRouteRef = useRef(false);

  const [showHeader, setShowHeader] = useState(true);
const lastScrollYRef = useRef(0);
const tickingRef = useRef(false);

useEffect(() => {
  skipAutoRouteRef.current = consumeRecentLogoutFlag();

  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (skipAutoRouteRef.current && user) {
      void signOut(auth).finally(() => {
        setAuthUser(null);
        setAuthReady(true);
        skipAutoRouteRef.current = false;
      });
      return;
    }

    setAuthUser(user);
    setAuthReady(true);
  });

  return unsubscribe;
}, []);

useEffect(() => {
  const handleScroll = () => {
    if (tickingRef.current) return;

    tickingRef.current = true;
    window.requestAnimationFrame(() => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;

      if (currentScrollY < 50) {
        setShowHeader(true); // always show at top
      } else if (currentScrollY > lastScrollY) {
        setShowHeader(false); // scrolling down
      } else {
        setShowHeader(true); // scrolling up
      }

      lastScrollYRef.current = currentScrollY;
      tickingRef.current = false;
    });
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  return () => window.removeEventListener("scroll", handleScroll);
}, []);

const openPlatform = async () => {
  if (!authUser) return;

  try {
    setOpeningPlatform(true);
    await syncTestingZoneAuth(authUser);
  } finally {
    window.location.assign(USER_APP_URL);
  }
};

const verifyAdminAccess = async (idToken: string) => {
  const response = await fetch("/api/admin/session", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    if (payload?.error === "Admin access denied") return false;
    throw new Error(payload?.error || "Failed to verify admin access");
  }

  return true;
};

useEffect(() => {
  if (skipAutoRouteRef.current) return;
  if (!authReady || !authUser || handledAuthUidRef.current === authUser.uid) return;

  handledAuthUidRef.current = authUser.uid;

  let cancelled = false;

  async function routeLoggedInUser() {
    try {
      setCheckingDestination(true);
      const token = await authUser.getIdToken();
      const isAdmin = await verifyAdminAccess(token);

      if (cancelled) return;

      if (isAdmin) {
        setShowAdminChoice(true);
        return;
      }

      await syncTestingZoneAuth(authUser, token);
      if (!cancelled) {
        window.location.assign(USER_APP_URL);
      }
    } catch (error) {
      console.error("Landing auth routing error:", error);
      handledAuthUidRef.current = null;
    } finally {
      if (!cancelled) setCheckingDestination(false);
    }
  }

  void routeLoggedInUser();

  return () => {
    cancelled = true;
  };
}, [authReady, authUser]);

  return (
    <header
  className={`fixed inset-x-0 top-4 z-50 mx-auto max-w-7xl px-4 sm:px-6 transition-all duration-500 ease-in-out ${
    showHeader ? "translate-y-0 opacity-100" : "-translate-y-[120%] opacity-0"
  }`}
>
      <div className="flex items-center justify-between rounded-full border border-white/50 bg-white/70 px-5 py-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-2xl md:py-3 md:px-6 transition-all">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-[#0f7896]/10 bg-white md:h-14 md:w-14 shadow-sm transition-transform group-hover:scale-105">
            <Image
              src="/logo.webp"
              alt="Urologics logo"
              fill
              className="object-contain"
              sizes="64px"
            />
          </div>

          <p className="font-[family:var(--font-outfit)] text-xl font-bold tracking-tight text-[#0f7896] md:text-2xl">
            Urologics
          </p>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full px-4 py-2 text-md font-semibold text-slate-600 transition duration-300 hover:bg-[#0f7896]/5 hover:text-[#0f7896]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {authReady && authUser ? (
            <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-bold text-[#0f7896]">
              {checkingDestination ? "Opening platform..." : "Signed in"}
            </span>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-300 hover:bg-slate-100/80 hover:text-[#0f7896]"
              >
                Login
              </Link>
              <LazySignUpDialog className="rounded-full bg-gradient-to-r from-[#0f7896] to-[#1294ba] px-7 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(15,120,150,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,120,150,0.35)]" />
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#0f7896]/18 bg-white text-[#0f7896] shadow-sm md:hidden"
        >
          <span
            className={`absolute h-0.5 w-5 rounded-full bg-[#0f7896] transition-all duration-300 ${
              isOpen ? "translate-y-0 rotate-45" : "-translate-y-1.5 rotate-0"
            }`}
          />
          <span
            className={`absolute h-0.5 w-5 rounded-full bg-[#0f7896] transition-all duration-300 ${
              isOpen ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute h-0.5 w-5 rounded-full bg-[#0f7896] transition-all duration-300 ${
              isOpen ? "translate-y-0 -rotate-45" : "translate-y-1.5 rotate-0"
            }`}
          />
        </button>
      </div>

      <div
        className={`overflow-hidden border-t border-[#0f7896]/10 bg-cyan-50/95 transition-all duration-300 md:hidden ${
          isOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-4">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="rounded-2xl px-4 py-3 text-base font-bold text-[#0f7896] transition hover:bg-[#0f7896] hover:text-white"
            >
              {item.label}
            </Link>
          ))}

          <div className="mt-2 flex flex-col gap-2">
            {authReady && authUser ? (
              <div className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-[#0f7896]">
                {checkingDestination ? "Opening platform..." : "Signed in"}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Login
                </Link>
                <LazySignUpDialog className="w-full rounded-2xl bg-gradient-to-r from-[#0f7896] to-[#1294ba] py-6 text-sm font-bold text-white shadow-lg shadow-[#0f7896]/25" />
              </>
            )}
          </div>
        </div>
      </div>

      {showAdminChoice && authUser ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#071014]/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[32px] border border-[#0f7896]/14 bg-white p-6 text-[#071014] shadow-[0_24px_70px_rgba(15,120,150,0.18)]">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-extrabold text-[#0f7896]">Continue as</h2>
              <p className="text-sm text-[#071014]/58">
                Signed in as {getFirstName(authUser)}. Choose where you want to go.
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              <Link
                href="/dashboard"
                className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#0f7896] to-[#1294ba] py-4 text-base font-bold text-white hover:from-[#1294ba] hover:to-[#0f7896]"
              >
                Admin dashboard
              </Link>
              <button
                type="button"
                onClick={openPlatform}
                disabled={openingPlatform}
                className="w-full rounded-2xl border border-[#0f7896]/16 bg-white py-4 text-base font-bold text-[#071014] hover:bg-cyan-50 disabled:cursor-wait disabled:opacity-70"
              >
                {openingPlatform ? "Opening platform..." : "Platform"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
