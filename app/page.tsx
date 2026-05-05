import { Outfit } from "next/font/google";
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

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

export default function Page() {
  return (
    <main className={`${outfit.variable} font-sans min-h-screen overflow-x-hidden bg-gradient-to-b from-cyan-50 via-white to-cyan-50 text-[#071014]`}>
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
