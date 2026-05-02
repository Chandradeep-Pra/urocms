import { Quote, Star } from "lucide-react";

const stories = [
  {
    name: "A. Sharma",
    role: "FRCS Candidate",
    quote:
      "The platform gave me structure. I could finally see what I had covered, where I was weak, and how to revise more intelligently.",
  },
  {
    name: "R. Mehta",
    role: "Viva Preparation Cohort",
    quote:
      "The AI viva experience was the closest thing to feeling pressure before the actual exam. That changed how I prepared.",
  },
  {
    name: "S. Khan",
    role: "Grand Mock User",
    quote:
      "Mocks, analytics, and topic-wise revision all being in one place made the preparation process feel far less scattered.",
  },
];

export function SuccessStoriesSection() {
  const marqueeStories = [...stories, ...stories];

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.24em] text-[#e7d39f]/76">Success Stories</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Candidates should feel this is already helping serious learners prepare better
            </h2>
          </div>
        </div>

        <div className="group overflow-hidden">
          <div className="success-marquee flex min-w-max gap-5 group-hover:[animation-play-state:paused]">
            {marqueeStories.map((story, index) => (
              <div
                key={`${story.name}-${index}`}
                className="relative w-[340px] shrink-0 overflow-hidden rounded-[30px] border border-[rgba(214,190,130,0.16)] bg-[linear-gradient(180deg,rgba(10,22,41,0.92),rgba(5,12,24,0.98))] p-6 shadow-[0_24px_70px_rgba(0,3,10,0.34)]"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,190,130,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[#efd79b]">
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Star key={starIndex} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <Quote className="h-5 w-5 text-[#efd79b]/60" />
                  </div>
                  <p className="mt-5 text-base leading-8 text-[#eef3ff]/88">"{story.quote}"</p>
                  <div className="mt-6">
                    <p className="text-base font-semibold text-white">{story.name}</p>
                    <p className="text-sm text-white/52">{story.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
