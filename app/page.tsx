import { Newsreader } from "next/font/google";
import {
  AiVivaSection,
  FaceToFaceSection,
  HeroSection,
  LandingFooter,
  LandingHeader,
  MentorSection,
  PlatformSection,
  PricingSection,
  SuccessStoriesSection,
} from "@/components/landing-page";
import { AppScreensSection } from "@/components/landing-page/AppScreensSection";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-newsreader",
});

export default function Page() {
  return (
    <main className={`${newsreader.variable} min-h-screen overflow-x-hidden bg-cyan-50 text-[#071014]`}>
      <LandingHeader />
      {/* <div className=" h-[12px]" aria-hidden="true" /> */}
      <HeroSection />
      <MentorSection />
      <PlatformSection />
      <FaceToFaceSection />
      <AiVivaSection />
      <SuccessStoriesSection />
      <AppScreensSection />
      <PricingSection />
      <LandingFooter />
    </main>
  );
}
