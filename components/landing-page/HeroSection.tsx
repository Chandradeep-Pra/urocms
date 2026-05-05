import { CirclePlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chipClass, goldGradient } from "@/components/landing-page/theme";
import { PhoneMock } from "@/components/landing-page/primitives";
import { StoreButton } from "./StoreButton";

export function HeroSection() {
  return (
    <section className="relative px-5 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-32 lg:pt-20">
      <div className="mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
        <div className="animate-slide-up space-y-7 text-center lg:space-y-8 lg:text-left">
          <div className="space-y-5 sm:space-y-6">
            <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#071014] sm:text-6xl lg:mx-0 lg:text-[78px] lg:leading-[0.92]">
              World's First #
              <span className={`mt-2 block ${goldGradient}`}>
                App based Learning Platform for FRCS Urology
              </span>
            </h1>

            <div className="flex justify-center lg:justify-start">
              <span className={chipClass}>Powered by Urologics AI</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
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

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:justify-center lg:justify-start">
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
    className="col-span-2 mx-auto w-fit sm:col-span-1 sm:mx-0 hidden md:block"
  />
</div>
        </div>

        <div className="relative animate-slide-up self-start pt-4 lg:pt-16 lg:pl-8 xl:pl-16">
          <div className="relative mx-auto flex min-h-[430px] w-full max-w-[360px] justify-center sm:min-h-[520px] sm:max-w-[460px] lg:min-h-[560px] lg:max-w-[560px]">
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 lg:-top-24">
              <div className="landing-phone-stack origin-bottom scale-[0.78] transform-gpu sm:scale-[0.9] lg:scale-100">
                <PhoneMock imageSrc="/phone-sc-3.jpeg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}