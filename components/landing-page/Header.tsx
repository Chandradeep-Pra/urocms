"use client";

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
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#0f7896]/12 bg-cyan-50/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#0f7896]/16 bg-white">
            <Image src="/logo.png" alt="Urologics logo" fill className="object-contain" sizes="48px" />
          </div>

          <p className="font-[family:var(--font-newsreader)] text-2xl font-semibold tracking-[-0.04em] text-[#0f7896] ">
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

        <div className="flex items-center gap-3">
          

          <Button
            asChild
            className="rounded-full border border-[#0f7896] bg-[#0f7896] px-5 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#0d6b85]"
          >
            <Link href="/pricing">Enroll Now</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
