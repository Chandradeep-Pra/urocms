import { CirclePlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chipClass, goldGradient } from "@/components/landing-page/theme";
import { PhoneMock } from "@/components/landing-page/primitives";
import { StoreButton } from "./StoreButton";

export function HeroSection() {
  return (
    <section className="relative px-5 pb-20 pt-36 sm:px-6 sm:pb-24 sm:pt-40 lg:pt-36">
      <div className="mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
        <div className="animate-slide-up space-y-7 text-center lg:space-y-8 lg:text-left">
          <div className="space-y-5 sm:space-y-6">
            <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-[#071014] sm:text-6xl lg:mx-0 lg:text-[72px] lg:leading-[1.05]">
              World's First
              <span className={`mt-2 block bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent`}>
                App based Learning Platform for FRCS Urology
              </span>
            </h1>

            <div className="flex justify-center lg:justify-start">
              <span className={chipClass}>Powered by Urologics AI</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <Button className="rounded-full bg-gradient-to-r from-[#0f7896] to-[#1294ba] px-8 py-7 text-base font-bold text-white shadow-lg shadow-[#0f7896]/25 transition-all duration-300 hover:scale-105 hover:shadow-[#0f7896]/40">
              Join Waitlist
            </Button>

            <Button
              variant="outline"
              className="rounded-full border-2 border-[#0f7896]/20 bg-white/50 backdrop-blur-md px-8 py-7 text-base font-bold text-[#0f7896] shadow-sm transition-all duration-300 hover:bg-white hover:border-[#0f7896]/30 hover:scale-105"
            >
              <CirclePlay className="mr-2 h-5 w-5 text-current" />
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

  {/* <StoreButton
    href="#"
    icon="/web.png"
    eyebrow="Continue on"
    label="Web Platform"
    className="col-span-2 mx-auto w-fit sm:col-span-1 sm:mx-0 hidden md:block"
  /> */}
</div>
        </div>

        <div className="relative animate-slide-up self-start pt-4 lg:pt-16 lg:pl-8 xl:pl-16 mt-8">
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