import { CirclePlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chipClass } from "@/components/landing-page/theme";
import { LazyLaunchSoonDialog } from "./LazyLaunchSoonDialog";
import { LazyWaitlistDialog } from "./LazyWaitlistDialog";
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="relative px-4 pb-16 pt-32 sm:px-6 sm:pb-24 sm:pt-40 lg:pt-36">
      <div className="mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-[64fr_36fr] lg:gap-10">
        <div className="animate-slide-up space-y-7 text-center lg:space-y-8 lg:text-left">
          <div className="space-y-5 sm:space-y-6">
            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight text-[#071014] sm:text-6xl lg:mx-0 lg:text-[72px] lg:leading-[1.1]">
              World&apos;s First
              <span className={`mt-3 block bg-gradient-to-r from-[#0f7896] via-[#1294ba] to-[#0f7896] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x`}>
                App based Learning Platform for FRCS Urology
              </span>
            </h1>

            <div className="flex justify-center lg:justify-start">
              <span className={chipClass}>Powered by Urologics AI</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <LazyWaitlistDialog />

            <Button
              variant="outline"
              className="rounded-full border-2 border-[#0f7896]/20 bg-white/50 backdrop-blur-md px-8 py-7 text-base font-bold text-[#0f7896] shadow-sm transition-all duration-300 hover:bg-white hover:border-[#0f7896]/40 hover:-translate-y-1 hover:scale-105 hover:shadow-md hover:text-[#0f7896]"
            >
              <CirclePlay className="mr-2 h-5 w-5 text-[#0f7896]" />
              Watch AI Viva Demo
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:justify-center lg:justify-start">
  <LazyLaunchSoonDialog
    icon="/apple-logo.webp"
    eyebrow="Download on the"
    label="App Store"
  />

  <LazyLaunchSoonDialog
    icon="/google-play.webp"
    eyebrow="Get it on"
    label="Google Play"
  />

  {/* <StoreButton
    href="#"
    icon="/web.webp"
    eyebrow="Continue on"
    label="Web Platform"
    className="col-span-2 mx-auto w-fit sm:col-span-1 sm:mx-0 hidden md:block"
  /> */}
</div>
        </div>

        <div className="relative animate-slide-up self-start pt-2 lg:pt-8">
          <div className="relative mx-auto flex w-full justify-center sm:min-h-[440px]">
            <div className="relative z-10 w-full max-w-[220px] sm:absolute sm:left-1/2 sm:top-0 sm:max-w-[273px] sm:-translate-x-1/2 lg:-top-10 xl:max-w-[294px]">
              <Image
                src="/ai-screen-phone.webp"
                alt="Urologics AI viva phone screen"
                width={450}
                height={920}
                className="h-auto w-full"
                sizes="(min-width: 1280px) 294px, (min-width: 640px) 273px, 220px"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
