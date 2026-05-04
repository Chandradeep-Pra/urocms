"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const mentorHighlights = [
  {
    text: "Trained 200+ Candidates Worldwide",
    title: "200+",
  },
  {
    text: "The most trusted FRCS Urology mentor for evidence based teaching",
    title: "Gold Medalist",
  },
  {
    text: "Structured teaching with Tips & Tricks & Mnemonics",
    title: "Innovative Educator",
  },
  {
    text: "90%+ pass rates in both SBAs and Viva",
    title: "Guaranteed Success",
  },
];

export function MentorSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

   const observer = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) {
      setIsInView(true);
      observer.disconnect();
    }
  },
  { threshold: 0.6 } 
);

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="mentor" className="bg-white px-6 py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative overflow-hidden rounded-[32px] border border-[#0f7896]/18 bg-white p-3 shadow-[0_18px_50px_rgba(15,120,150,0.08)]">
          <div className="relative min-h-[560px] overflow-hidden rounded-[24px]">
            <Image
              src="/my-mentor-2.jpeg"
              alt="Dr. Ankit Goel"
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 52vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0f7896]">
            Your Mentor
          </p>

          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#071014] md:text-5xl">
            <span className="text-[#0f7896]">Urologics</span> launched by the
            Founder of FRCS Urology course{" "}
            <span className="text-[#0f7896]">Dr. Ankit Goel</span>
          </h2>

          <div className="mt-3 inline-flex items-center rounded-full border border-[#0f7896]/30 bg-white px-3 py-1 text-sm font-medium text-[#0f7896]">
            Gold Medalist
          </div>

          <div className="mt-10 space-y-5">
            {mentorHighlights.map((item, index) => (
              <div
                key={item.title}
                className={`group flex items-start gap-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isInView
                    ? "translate-y-0 opacity-100"
                    : "translate-y-5 opacity-0"
                }`}
                style={{
                  transitionDelay: isInView ? `${index * 130}ms` : "0ms",
                }}
              >
                <div
                  className={`mt-3 h-2.5 w-2.5 shrink-0 rounded-full bg-[#0f7896] shadow-[0_0_0_6px_rgba(15,120,150,0.10)] transition-all duration-500 ${
                    isInView ? "scale-100 opacity-100" : "scale-0 opacity-0"
                  }`}
                  style={{
                    transitionDelay: isInView ? `${index * 130}ms` : "0ms",
                  }}
                />

                <div className="border-b border-[#0f7896]/10 pb-5">
                  <p className="inline-flex rounded-full bg-[#0f7896]/10 px-3 py-1 text-lg font-bold tracking-[-0.03em] text-[#0f7896] transition duration-300 group-hover:bg-[#0f7896] group-hover:text-white">
                    {item.title}
                  </p>

                  <p className="mt-3 text-lg leading-7 text-[#071014]/72">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}