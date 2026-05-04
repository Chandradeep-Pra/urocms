import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { darkSectionClass } from "@/components/landing-page/theme";

export function PricingSection() {
  return (
    <section className="px-6 pb-24 pt-10">
      <div className={`mx-auto max-w-7xl overflow-hidden ${darkSectionClass} px-8 py-10 sm:px-12 sm:py-14`}>
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.24em] text-[#0f7896]">Pricing</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#071014] sm:text-5xl">
              Choose a plan that fits how you want to prepare.
            </h2>
            <p className="mt-4 text-lg leading-8 text-[#071014]/66">
              Explore tailored bundles across app-based learning, live online classes, and premium AI viva
              preparation.
            </p>
          </div>

          <Button
            asChild
            className="rounded-full border border-[#0f7896] bg-[#0f7896] px-6 py-6 text-base text-white transition-colors duration-300 hover:bg-[#0d6b85]"
          >
            <Link href="/pricing">
              Enroll Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
