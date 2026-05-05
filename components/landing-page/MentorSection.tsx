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
    <section ref={sectionRef} id="mentor" className="bg-white px-6 py-20 lg:py-28">
      <div className="mx-auto w-full">
        <div className="mb-16 text-center">
          <h2 className="mt-3 text-5xl font-bold tracking-tight text-[#071014] sm:text-6xl">
            Your <span className="bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent">Mentor</span>
          </h2>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex justify-center lg:justify-start">
            <div className="overflow-hidden rounded-[40px] border border-[#0f7896]/10 bg-gradient-to-br from-[#0f7896]/5 to-transparent p-4 shadow-[0_32px_80px_rgba(15,120,150,0.06)] backdrop-blur-sm">
              <Image
                src="/my-mentor-2.jpeg"
                alt="Dr. Ankit Goel"
                width={800}
                height={1000}
                className="h-auto w-auto max-w-full rounded-[28px] object-contain shadow-sm"
                priority
              />
            </div>
          </div>

          <div>
            <h3 className="text-4xl font-bold tracking-tight text-[#071014] md:text-5xl leading-tight">
              <span className="bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent">Urologics</span> launched by the
              Founder of FRCS Urology course{" "}
              <span className="bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent">Dr. Ankit Goel</span>
            </h3>

            <div className="mt-6 inline-flex items-center rounded-full border border-[#0f7896]/20 bg-[#0f7896]/5 px-5 py-2 text-sm font-bold tracking-wide text-[#0f7896] shadow-sm">
              Gold Medalist
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
  {mentorHighlights.map((item, index) => {
    const accents = ["#0f7896", "#7c6ee6", "#e6a63a", "#3bb273"];
    const accent = accents[index % accents.length];

    return (
      <div
        key={item.title}
        className={`group relative overflow-hidden rounded-[32px] border border-slate-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 hover:shadow-[0_20px_48px_rgba(15,120,150,0.1)] ${
          isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
        style={{
          transitionDelay: isInView ? `${index * 100}ms` : "0ms",
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-1.5 opacity-80"
          style={{ backgroundColor: accent }}
        />

        <p
          className="text-3xl font-extrabold tracking-tight"
          style={{ color: accent }}
        >
          {item.title}
        </p>

        <p className="mt-4 text-lg font-medium leading-relaxed text-slate-600">
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