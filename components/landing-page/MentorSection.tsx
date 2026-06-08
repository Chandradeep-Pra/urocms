"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Award } from "lucide-react";

const doctorProfileUrl = "https://www.artemishospitals.com/doctor/profile/dr-ankit-goyal";

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
    <section ref={sectionRef} id="mentor" className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-10 text-center sm:mb-16">
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#071014] sm:text-6xl">
            Your <span className="bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent">Mentor</span>
          </h2>
        </div>

        <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex justify-center lg:justify-start">
            <div className="overflow-hidden rounded-[28px] border border-[#0f7896]/10 bg-gradient-to-br from-[#0f7896]/5 to-transparent p-2 shadow-[0_32px_80px_rgba(15,120,150,0.06)] backdrop-blur-sm sm:rounded-[40px] sm:p-4">
              <Image
                src="/my-mentor-2.webp"
                alt="Dr. Ankit Goel"
                width={800}
                height={1000}
                className="h-auto w-auto max-w-full rounded-[22px] object-contain shadow-sm sm:rounded-[28px]"
                priority
              />
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold tracking-tight text-[#071014] sm:text-3xl md:text-5xl leading-tight">
              <span className="bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent">Urologics</span> launched by the
              Founder of FRCS Urology course{" "}
              <Link
                href={doctorProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent underline decoration-[#0f7896]/30 underline-offset-8 transition hover:decoration-[#0f7896]"
              >
                Dr. Ankit Goel
              </Link>
            </h3>

            <div className="mt-6 flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#d6a735]/30 bg-gradient-to-br from-[#fff8dc] via-white to-[#f4d46a]/30 shadow-[0_12px_28px_rgba(214,167,53,0.16)]">
                <Award className="h-6 w-6 text-[#b98516]" />
              </div>
              <p className="text-xl font-black tracking-[-0.04em] text-[#071014] sm:text-2xl">
                Gold Medalist
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4">
  {mentorHighlights.map((item, index) => {
    const accents = ["#0f7896", "#7c6ee6", "#e6a63a", "#3bb273"];
    const accent = accents[index % accents.length];

    return (
      <div
        key={item.title}
        className={`group relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 hover:shadow-[0_20px_48px_rgba(15,120,150,0.1)] sm:rounded-[32px] sm:p-8 ${
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
          className="text-2xl font-extrabold tracking-tight sm:text-3xl"
          style={{ color: accent }}
        >
          {item.title}
        </p>

        <p className="mt-3 text-sm font-medium leading-6 text-slate-600 sm:mt-4 sm:text-lg sm:leading-relaxed">
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
