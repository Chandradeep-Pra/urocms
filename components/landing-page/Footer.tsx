import Image from "next/image";
import Link from "next/link";
import { Instagram, Youtube, Mail, Linkedin } from "lucide-react";

const doctorProfileUrl = "https://www.youtube.com/@ankitgoel2863";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#0f7896]/12 bg-white px-4 py-12 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-7xl">

        {/* Top Grid */}
        <div className="grid gap-10 md:grid-cols-4">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11">
                <Image src="/logo.png" alt="Urologics logo" fill className="object-contain" />
              </div>

              <p className="text-lg font-semibold text-[#071014]">
                Urologics
              </p>
            </div>

            <p className="mt-4 text-sm leading-6 text-[#071014]/60">
              App based FRCS Urology Learning Platform founded by the Gold Medalist,{" "}
              <a
                href={doctorProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#0f7896] underline decoration-[#0f7896]/30 underline-offset-4 transition hover:decoration-[#0f7896]"
              >
                Dr. Ankit Goel
              </a>
            </p>

            {/* Socials */}
            <div className="mt-5 flex gap-3">
              <a className="rounded-xl border border-[#0f7896]/14 p-2 text-[#0f7896] hover:bg-[#0f7896] hover:text-white transition" href="https://www.linkedin.com/in/ankitgoelfrcs/" target="_blank" rel="noopener noreferrer">
                <Linkedin className="h-4 w-4" />
              </a>
              <a className="rounded-xl border border-[#0f7896]/14 p-2 text-[#0f7896] hover:bg-[#0f7896] hover:text-white transition" href="https://www.youtube.com/@ankitgoel2863" target="_blank" rel="noopener noreferrer">
                <Youtube className="h-4 w-4" />
              </a>
              <a className="rounded-xl border border-[#0f7896]/14 p-2 text-[#0f7896] hover:bg-[#0f7896] hover:text-white transition" href="mailto:ankitgoel402@gmail.com" target="_blank" rel="noopener noreferrer">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0f7896]">
              Platform
            </p>

            <div className="mt-4 space-y-3 text-sm text-[#071014]/70">
              <Link href="#courses" className="block hover:text-[#0f7896]">
                Courses
              </Link>
              <Link href="#ai-viva" className="block hover:text-[#0f7896]">
                AI Viva
              </Link>
              <Link href="#stories" className="block hover:text-[#0f7896]">
                Success Stories
              </Link>
              <Link href="/pricing" className="block hover:text-[#0f7896]">
                Pricing
              </Link>
            </div>
          </div>

          {/* Support */}
          {/* <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0f7896]">
              Support
            </p>

            <div className="mt-4 space-y-3 text-sm text-[#071014]/70">
              <Link href="#" className="block hover:text-[#0f7896]">
                Help Center
              </Link>
              <Link href="#" className="block hover:text-[#0f7896]">
                Contact Us
              </Link>
              <Link href="#" className="block hover:text-[#0f7896]">
                Privacy Policy
              </Link>
            </div>
          </div> */}

          {/* Mentor / Company */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0f7896]">
              Company
            </p>

            <div className="mt-4 space-y-3 text-sm text-[#071014]/70">
              <p>Under the direction of</p>
              <a
                href={doctorProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#0f7896] underline decoration-[#0f7896]/30 underline-offset-4 transition hover:decoration-[#0f7896]"
              >
                Dr. Ankit Goel
              </a>
              <Link href="/privacy-policy" className="block hover:text-[#0f7896]">
                Privacy Policy
              </Link>

            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-[#0f7896]/10 pt-6 text-center text-xs text-[#071014]/50">
          © {new Date().getFullYear()} Urologics. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
