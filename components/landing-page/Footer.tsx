import Image from "next/image";
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/8 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-white/40 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0">
            <Image src="/logo.png" alt="Urologics logo" fill className="object-contain" sizes="44px" />
          </div>
          <div>
            <p className="font-medium text-white/80">Urologics</p>
            <p>Premium FRCS prep platform for clinically serious candidates.</p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 text-left md:items-end">
          <p>{new Date().getFullYear()} Urologics · Under the direction of Dr. Ankit Goel</p>
          <Link
            href="/login"
            className="text-xs uppercase tracking-[0.18em] text-[#e1c777]/80 underline underline-offset-4 hover:text-white"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </footer>
  );
}
