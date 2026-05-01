import {
  AiVivaSection,
  HeroSection,
  LandingFooter,
  LandingHeader,
  MentorSection,
  PlatformSection,
  PricingSection,
  TopicMarquee,
  WhySection,
} from "@/components/landing-page";

export default function Page() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(210,184,115,0.11),transparent_18%),radial-gradient(circle_at_88%_12%,rgba(76,98,148,0.18),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(10,23,46,0.34),transparent_32%),linear-gradient(180deg,#02060d_0%,#06101c_18%,#091a31_42%,#08172b_68%,#03060e_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 uro-grid opacity-[0.08]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] bg-[radial-gradient(circle_at_top,rgba(214,190,130,0.1),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-[24%] h-[520px] bg-[radial-gradient(circle_at_72%_20%,rgba(100,124,176,0.14),transparent_28%)]" />

      <LandingHeader />
      <div className="h-[92px]" aria-hidden="true" />
      <HeroSection />
      <TopicMarquee />
      <WhySection />
      <PlatformSection />
      <AiVivaSection />
      <MentorSection />
      <PricingSection />
      <LandingFooter />
    </main>
  );
}
