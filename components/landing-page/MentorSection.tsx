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
      {
        threshold: 0.25,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="mentor" className="bg-white px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">

          <h2 className="mt-3 text-5xl font-semibold tracking-[-0.05em] text-[#071014] sm:text-6xl">
            Your Mentor
          </h2>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex justify-center lg:justify-start">
            <div className="overflow-hidden rounded-[32px] border border-[#0f7896]/14 bg-white p-3 shadow-[0_18px_50px_rgba(15,120,150,0.08)]">
              <Image
                src="/my-mentor-2.jpeg"
                alt="Dr. Ankit Goel"
                width={800}
                height={1000}
                className="h-auto w-auto max-w-full rounded-[24px] object-contain"
                priority
              />
            </div>
          </div>

          <div>
            <h3 className="text-4xl font-semibold tracking-[-0.04em] text-[#071014] md:text-5xl">
              <span className="text-[#0f7896]">Urologics</span> launched by the
              Founder of FRCS Urology course{" "}
              <span className="text-[#0f7896]">Dr. Ankit Goel</span>
            </h3>

            <div className="mt-4 inline-flex items-center rounded-full border border-[#0f7896]/30 bg-cyan-50 px-4 py-1.5 text-sm font-semibold text-[#0f7896]">
              Gold Medalist
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
  {mentorHighlights.map((item, index) => {
    const accents = ["#0f7896", "#7c6ee6", "#e6a63a", "#3bb273"];
    const accent = accents[index % accents.length];

    return (
      <div
        key={item.title}
        className={`group relative overflow-hidden rounded-[24px] border border-[#0f7896]/10 bg-white p-6 shadow-[0_14px_36px_rgba(15,120,150,0.08)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(15,120,150,0.13)] ${
          isInView ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
        }`}
        style={{
          transitionDelay: isInView ? `${index * 120}ms` : "0ms",
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ backgroundColor: accent }}
        />

        <p
          className="text-3xl font-bold tracking-[-0.05em]"
          style={{ color: accent }}
        >
          {item.title}
        </p>

        <p className="mt-4 text-lg font-semibold leading-7 text-black">
          {item.text}
        </p>
      </div>
    );
  })}
</div>
          </div>
        </div>
      </div>
    </section>
  );
}