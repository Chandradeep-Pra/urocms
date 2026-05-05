"use client";

import Image from "next/image";

const screens = [
  { label: "Quiz", image: "/quiz-screen.png", type: "phone" },
  { label: "Grand Mock", image: "/grand-mock-screen.png", type: "laptop" },
  { label: "Mock", image: "/mock-screen.png", type: "tablet" },
  { label: "Chapter Quiz", image: "/chapter-quiz-screen.png", type: "phone" },
];

export function AppScreensSection() {
  const marquee = [...screens, ...screens];

  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-12 text-center">
          {/* <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0f7896]">
            App Experience
          </p> */}
          <h2 className="text-5xl font-bold tracking-[-0.06em] text-[#071014] sm:text-6xl">
            Question <span className="text-[#0f7896]">Banks</span>
          </h2>
        </div>

        <div className="group overflow-hidden py-8">
          <div className="flex min-w-max items-end gap-10 animate-marquee group-hover:[animation-play-state:paused]">
            {marquee.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="relative flex min-h-[390px] w-[300px] shrink-0 flex-col items-center justify-end"
              >
                <div className="absolute top-0 left-1/2 z-20 -translate-x-1/2">
                  <div className="relative whitespace-nowrap rounded-full border border-[#0f7896]/14 bg-white px-4 py-2 text-sm font-semibold text-[#0f7896] shadow-[0_10px_30px_rgba(15,120,150,0.12)]">
                    {item.label}
                    <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b border-[#0f7896]/14 bg-white" />
                  </div>
                </div>

                {item.type === "phone" && (
                  <div className="relative w-[165px] rounded-[32px] bg-black p-2 shadow-[0_18px_45px_rgba(15,120,150,0.14)]">
                    <div className="absolute left-1/2 top-2 z-10 h-3.5 w-14 -translate-x-1/2 rounded-full bg-black" />
                    <div className="relative h-[330px] overflow-hidden rounded-[24px] bg-cyan-50">
                      <Image src={item.image} alt={item.label} fill className="object-cover object-top" />
                    </div>
                  </div>
                )}

                {item.type === "tablet" && (
                  <div className="relative w-[240px] rounded-[24px] bg-black p-2 shadow-[0_18px_45px_rgba(15,120,150,0.14)]">
                    <div className="relative h-[315px] overflow-hidden rounded-[18px] bg-cyan-50">
                      <Image src={item.image} alt={item.label} fill className="object-cover object-top" />
                    </div>
                  </div>
                )}

                {item.type === "laptop" && (
                  <div className="flex flex-col items-center">
                    <div className="relative w-[315px] rounded-[14px] bg-black p-2 shadow-[0_18px_45px_rgba(15,120,150,0.14)]">
                      <div className="relative h-[190px] overflow-hidden rounded-[8px] bg-cyan-50">
                        <Image src={item.image} alt={item.label} fill className="object-cover object-top" />
                      </div>
                    </div>
                    <div className="mt-1 h-2.5 w-[355px] rounded-b-2xl bg-black/80" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}