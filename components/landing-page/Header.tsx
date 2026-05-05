"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignUpDialog } from "./SignUpDialog";

const navItems = [
  { label: "Mentor", href: "#mentor" },
  { label: "Courses", href: "#courses" },
  { label: "AI Viva", href: "#ai-viva" },
  { label: "Stories", href: "#stories" },
  // { label: "Pricing", href: "/pricing" },
];

export function LandingHeader() {
  const [isOpen, setIsOpen] = useState(false);

  const [showHeader, setShowHeader] = useState(true);
const [lastScrollY, setLastScrollY] = useState(0);

useEffect(() => {
  const handleScroll = () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY < 50) {
      setShowHeader(true); // always show at top
    } else if (currentScrollY > lastScrollY) {
      setShowHeader(false); // scrolling down
    } else {
      setShowHeader(true); // scrolling up
    }

    setLastScrollY(currentScrollY);
  };

  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, [lastScrollY]);

  return (
    <header
  className={`fixed inset-x-0 top-4 z-50 mx-auto max-w-7xl px-4 sm:px-6 transition-all duration-300 ${
    showHeader ? "translate-y-0 opacity-100" : "-translate-y-[120%] opacity-0"
  }`}
>
      <div className="flex items-center justify-between rounded-full border border-white/40 bg-white/60 px-5 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl md:py-3 md:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-[#0f7896]/16 bg-white md:h-16 md:w-16">
            <Image
              src="/logo.png"
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

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 transition duration-300 hover:bg-slate-100 hover:text-[#0f7896]"
          >
            Login
          </Link>
          <SignUpDialog>
            <Button
              className="rounded-full bg-gradient-to-r from-[#0f7896] to-[#1294ba] px-6 text-sm font-bold text-white shadow-lg shadow-[#0f7896]/25 transition-all duration-300 hover:scale-105 hover:shadow-[#0f7896]/40"
            >
              Sign Up
            </Button>
          </SignUpDialog>
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
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Login
            </Link>
            <SignUpDialog>
              <Button
                className="w-full rounded-2xl bg-gradient-to-r from-[#0f7896] to-[#1294ba] py-6 text-sm font-bold text-white shadow-lg shadow-[#0f7896]/25"
              >
                Sign Up
              </Button>
            </SignUpDialog>
          </div>
        </div>
      </div>
    </header>
  );
}