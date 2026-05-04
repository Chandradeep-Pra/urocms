import { Apple, CirclePlay, Laptop, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chipClass, goldGradient } from "@/components/landing-page/theme";
import { HeroMetric, PhoneMock } from "@/components/landing-page/primitives";
import { StoreButton } from "./StoreButton";

export function HeroSection() {
  return (
    <section className="relative px-6 pb-24  sm:pt-20">
      <div className="mx-auto grid max-w-7xl items-start gap-14 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="animate-slide-up space-y-8">
          <div className="space-y-6">
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.92] tracking-[-0.06em] text-[#071014] sm:text-6xl lg:text-[78px]">
              World's First #
              <span className={`mt-2 block ${goldGradient}`}>App based Learning Platform for FRCS Urology</span>
            </h1>
            <span className={chipClass}>Powered by Urologics AI</span>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button className="rounded-full border border-[#0f7896] bg-[#0f7896] px-7 py-6 text-white transition-colors duration-300 hover:bg-[#0d6b85]">
              Join Waitlist
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-2 border-[#0f7896] bg-transparent px-6 py-6 text-base text-[#0f7896] hover:bg-white hover:text-[#0f7896]"
            >
              <CirclePlay className="mr-2 h-4 w-4 text-current" />
              Watch AI Viva Demo
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
  <StoreButton
    href="#"
    icon="/apple-logo.png"
    eyebrow="Download on the"
    label="App Store"
  />

  <StoreButton
    href="#"
    icon="/google-play.png"
    eyebrow="Get it on"
    label="Google Play"
  />

  <StoreButton
    href="#"
    icon="/web.png"
    eyebrow="Continue on"
    label="Web Platform"
  />
</div>
        </div>

        <div className="relative animate-slide-up self-start pt-16 lg:pl-8 xl:pl-16">
          <div className="relative mx-auto flex min-h-[560px] w-full max-w-[560px]">
            <div className="absolute left-1/2 -top-24 z-10 -translate-x-1/2">
              <div className="landing-phone-stack origin-bottom transform-gpu">
                <PhoneMock imageSrc="/phone-sc-3.jpeg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
