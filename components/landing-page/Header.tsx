"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Mentor", href: "#mentor" },
  { label: "Courses", href: "#courses" },
  { label: "AI Viva", href: "#ai-viva" },
  { label: "Stories", href: "#stories" },
  { label: "Pricing", href: "/pricing" },
];

export function LandingHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="inset-x-0 top-0 z-50 border-b border-[#0f7896]/12 bg-cyan-50/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-6 md:py-4">
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

          <p className="font-[family:var(--font-newsreader)] text-xl font-semibold tracking-[-0.04em] text-[#0f7896] md:text-2xl">
            Urologics
          </p>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full px-4 py-2 text-md font-bold text-[#0f7896] transition duration-300 hover:bg-[#0f7896] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            asChild
            className="rounded-full border border-[#0f7896] bg-[#0f7896] px-5 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#0d6b85]"
          >
            <Link href="/pricing">Enroll Now</Link>
          </Button>
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

          <Button
            asChild
            className="mt-2 rounded-full bg-[#0f7896] py-6 text-sm font-semibold text-white hover:bg-[#0d6b85]"
          >
            <Link href="/pricing" onClick={() => setIsOpen(false)}>
              Enroll Now
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}