import type { ComponentProps } from "react";
import { SuccessStoriesClient } from "@/components/landing-page/SuccessStoriesClient";
import { listPublicTestimonials } from "@/lib/server/testimonialService";

export async function SuccessStoriesSection() {
  let testimonials: ComponentProps<typeof SuccessStoriesClient>["initialTestimonials"] = [];

  try {
    testimonials = (await listPublicTestimonials()).map((item) => ({
      id: item.id,
      title: item.title,
      videoUrl: item.videoUrl,
      youtubeId: item.youtubeId,
      imageUrl: item.imageUrl,
      candidateName: item.candidateName,
      candidateRole: item.candidateRole,
      companyName: item.companyName,
      quote: item.quote,
    }));
  } catch (error) {
    console.error("Landing testimonials fetch error:", error);
  }

  return <SuccessStoriesClient initialTestimonials={testimonials} />;
}
