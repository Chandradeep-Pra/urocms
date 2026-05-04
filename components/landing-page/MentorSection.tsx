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
         <div className="overflow-hidden rounded-[24px]">
  <Image
    src="/my-mentor-2.jpeg"
    alt="Dr. Ankit Goel"
    width={800}   // adjust if needed
    height={1000} // maintain your image ratio
    className="h-auto w-full object-contain"
    priority
  />
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

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
  {mentorHighlights.map((item, index) => {
    const colorStyles = [
      {
        bg: "bg-[#0f7896]/8",
        border: "border-[#0f7896]/20",
        title: "text-[#0f7896]",
      },
      {
        bg: "bg-[#7c6ee6]/10",
        border: "border-[#7c6ee6]/20",
        title: "text-[#7c6ee6]",
      },
      {
        bg: "bg-[#e6a63a]/12",
        border: "border-[#e6a63a]/25",
        title: "text-[#e6a63a]",
      },
      {
        bg: "bg-[#3bb273]/12",
        border: "border-[#3bb273]/25",
        title: "text-[#3bb273]",
      },
    ];

    const style = colorStyles[index % colorStyles.length];

    return (
      <div
        key={item.title}
        className={`rounded-[22px] border p-5 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${style.bg} ${style.border} ${
          isInView
            ? "translate-y-0 opacity-100"
            : "translate-y-5 opacity-0"
        }`}
        style={{
          transitionDelay: isInView ? `${index * 120}ms` : "0ms",
        }}
      >
        {/* Title */}
        <p
          className={`text-xl font-bold tracking-[-0.03em] ${style.title}`}
        >
          {item.title}
        </p>

        {/* Text */}
        <p className="mt-3 text-sm leading-6 text-[#071014]/65">
          {item.text}
        </p>
      </div>
    );
  })}
</div>
        </div>
      </div>
    </section>
  );
}