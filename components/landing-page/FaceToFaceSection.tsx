"use client";

import { useState } from "react";
import { ArrowUpRight, Presentation, GraduationCap, MessagesSquare, Users2, X, Check } from "lucide-react";

const liveCourses = [
  {
    title: "Section 1 (FRCS / FEBU) - Live Online Course",
    icon: Presentation,
    points: ["16 live online sessions", "Structured case based interactive sessions", "SBA discussion on all topics for FRCS/FEBU exam","⁠Detailed discussion on Oxford , EAU guidelines , Scientific Basis of Urology","Mnemonics , Algorithms and Flowcharts","⁠Evidence based solution to controversial questions","Statistics and Ethical scenarios"],
  },
  {
    title: "Section 2 (FRCS / FEBU) - Live Online Course",
    icon: GraduationCap,
    points: ["16 live online sessions ", "4 to 5 viva case practice per session ", "Viva practice for candidates in each session followed by feedback","Time management, appropriate evidence quotation and communication skills highlight","Learn the 'opening gambit' in viva","Concept based algorithms","Understanding the marking scheme"],
  },
  // {
  //   title: "Section 1 (FRCS / FEBU) Test & Discussion",
  //   icon: MessagesSquare,
  //   points: ["Test-based learning", "Discussion sessions", "Doubt solving"],
  // },
  {
    title: "Section 2 Viva in Dreams",
    icon: Users2,
    points: ["One to One Grand Mock Viva exam for Section 2 FRCS Urology ", "All 8 stations covered as actual exam", "Duration and Sequence of Mock stations individualised as a per Royal college sequence","Ideal for last minute assessment and feedback"],
  },
  {
    title: "Live One to One Session",
    icon: Presentation,
    points: ["Personalised mentoring for Section 1/ Section 2 FRCS Urology", "Flexible schedule for busy trainees / consultants", "Customisation as per candidate’s requirement","Discussion of Previous Exam like scenarios","Maximum viva practice on one to one basis with feedback","Limited slots only"],
  },
  {
    title: "Urology Masterclass",
    icon: Presentation,
    points: ["Monthly Masterclass", "Recent Advances Masterclass", "EAU Guidelines Masterclass","Post Graduate Practical Exam Masterclass"],
  },
];


export function FaceToFaceSection() {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  return (
    <section className="bg-cyan-50 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        
        {/* Header */}
        <div className="mb-12 flex flex-col items-center text-center">
          <h2 className="max-w-3xl px-4 text-5xl font-bold tracking-tight text-[#071014] sm:text-5xl">
            Face to Face <span className="bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent">Live Online Classes</span>
          </h2>
        </div>

        {/* Cards */}
        <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {liveCourses.map((course) => {
            const isActive = activeCard === course.title;

            return (
              <div
                key={course.title}
                className={`group relative flex flex-col rounded-[28px] p-6 transition-all duration-500 ${
                  isActive
                    ? "min-h-[320px] bg-[#0f7896] text-white shadow-[0_24px_60px_rgba(15,120,150,0.25)] sm:col-span-2"
                    : "min-h-[160px] border border-[#0f7896]/12 bg-white text-[#071014] shadow-[0_16px_40px_rgba(15,120,150,0.09)] hover:-translate-y-1 hover:border-[#0f7896]/30"
                }`}
              >
                {/* Close */}
                {isActive && (
                  <button
                    onClick={() => setActiveCard(null)}
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white hover:text-[#0f7896]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* Title */}
                <h3
                  className={`font-semibold tracking-[-0.04em] ${
                    isActive
                      ? "text-2xl text-left"
                      : "text-xl text-center my-auto"
                  }`}
                >
                  {course.title}
                </h3>

                {/* Expanded */}
                {isActive && (
  <div className="mt-7 grid gap-3 sm:grid-cols-2">
    {course.points.map((point, index) => (
      <div
        key={point}
        className="relative overflow-hidden rounded-[18px] border border-white/18 bg-white p-4 text-[#071014] shadow-[0_10px_26px_rgba(0,0,0,0.08)]"
      >
        {/* Accent corner */}
        <div className="absolute right-0 top-0 h-12 w-12 rounded-bl-[22px] bg-[#0f7896]/10" />

        <div className="flex items-start gap-3">
          {/* Number */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f7896] text-sm font-bold text-white">
            {index + 1}
          </div>

          {/* Text */}
          <p className="text-lg font-bold leading-7 tracking-[-0.03em] text-[#071014]">
            {point}
          </p>
        </div>
      </div>
    ))}
  </div>
)}

                {/* Explore */}
                {!isActive && (
                  <button
                    onClick={() => setActiveCard(course.title)}
                    className="mt-auto mx-auto inline-flex items-center gap-2 rounded-full border border-[#0f7896]/20 px-4 py-2 text-sm font-semibold text-[#0f7896] transition duration-300 group-hover:bg-[#0f7896] group-hover:text-white"
                  >
                    Explore
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}