import type { Metadata } from "next";
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
import { absoluteUrl, siteConfig } from "@/lib/site";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Urologics | World's First App Based Urology Course ",
  description:
    "Explore Urologics for FRCS Urology preparation with AI viva practice, video courses, chapter-wise quizzes, weekly mocks, grand mocks, and structured exam support.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Best FRCS Urology Course | Urologics",
    description:
      "AI viva practice, structured video teaching, weekly mocks, analytics, and FRCS Urology preparation in one platform.",
    url: absoluteUrl("/"),
    images: [
      {
        url: absoluteUrl(siteConfig.defaultOgImage),
        width: 500,
        height: 500,
        alt: "Urologics FRCS Urology Prep",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Best FRCS Urology Course | Urologics",
    description:
      "AI viva practice, structured video teaching, weekly mocks, analytics, and premium FRCS Urology preparation in one platform.",
    images: [absoluteUrl(siteConfig.defaultOgImage)],
  },
};

export default function Page() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Urologics",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo.png"),
    description: siteConfig.description,
    sameAs: [],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Urologics",
    url: absoluteUrl("/"),
    description: siteConfig.description,
  };

  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Urologics FRCS Urology Preparation",
    description:
      "FRCS Urology preparation with video courses, chapter-wise quizzes, weekly mocks, grand mocks, progress tracking, and AI viva practice.",
    provider: {
      "@type": "EducationalOrganization",
      name: "Urologics",
      url: absoluteUrl("/"),
    },
  };

  return (
    <main className={`${outfit.variable} font-sans min-h-screen overflow-x-hidden bg-gradient-to-b from-cyan-50 via-white to-cyan-50 text-[#071014]`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationSchema, websiteSchema, courseSchema]),
        }}
      />
      <LandingHeader />
      {/* <div className=" h-[12px]" aria-hidden="true" /> */}
      <HeroSection />
      <MentorSection />
      <PlatformSection />
      <FaceToFaceSection />
      <AiVivaSection />
      <AppScreensSection />
      <SuccessStoriesSection />
      <PricingSection />
      <LandingFooter />
    </main>
  );
}
