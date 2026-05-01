import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { goldGradient } from "@/components/landing-page/theme";

export function PricingSection() {
  return (
    <section className="px-6 pb-24 pt-10">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[42px] border border-[rgba(214,190,130,0.16)] bg-[linear-gradient(135deg,rgba(10,27,49,0.98),rgba(4,12,22,0.98))] px-8 py-10 shadow-[0_28px_100px_rgba(0,3,10,0.56)] sm:px-12 sm:py-14">
          <div className="absolute -right-14 top-0 h-56 w-56 rounded-full bg-[#c79c45]/8 blur-3xl" />
          <div className="absolute left-1/3 top-0 h-px w-48 bg-[linear-gradient(90deg,transparent,rgba(233,210,149,0.65),transparent)]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.24em] text-[#e7d39f]/76">Pricing</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Explore plans built for serious FRCS candidates.
              </h2>
              <p className="mt-4 text-lg leading-8 text-[#d2dbef]/66">
                The homepage should sell the value. The pricing page can then show the actual bundles with cleaner detail.
              </p>
            </div>

            <Button
              asChild
              className={`rounded-full border border-[#eddba9]/30 px-6 py-6 text-base text-[#081321] shadow-[0_18px_45px_rgba(171,131,49,0.28)] ${goldGradient}`}
            >
              <Link href="/pricing">
                View Pricing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
