import Image from "next/image";
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#0f7896]/12 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-[#071014]/56 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0">
            <Image src="/logo.png" alt="Urologics logo" fill className="object-contain" sizes="44px" />
          </div>
          <div>
            <p className="font-medium text-[#071014]">Urologics</p>
            <p>Premium FRCS prep platform for clinically serious candidates.</p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 text-left md:items-end">
          <p>{new Date().getFullYear()} Urologics · Under the direction of Dr. Ankit Goel</p>
          <Link
            href="/login"
            className="text-xs uppercase tracking-[0.18em] text-[#0f7896] underline underline-offset-4 hover:text-[#071014]"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </footer>
  );
}
