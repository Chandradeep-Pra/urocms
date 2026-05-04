"use client";

import { useState } from "react";
import { ArrowUpRight, Presentation, GraduationCap, MessagesSquare, Users2, X, Check } from "lucide-react";

const liveCourses = [
  {
    title: "Section 1 (FRCS / FEBU) - Live Online Course",
    icon: Presentation,
    points: ["Live interactive sessions", "Structured syllabus", "Exam-focused teaching"],
  },
  {
    title: "Section 2 (FRCS / FEBU) - Live Online Course",
    icon: GraduationCap,
    points: ["Advanced topics", "Viva preparation", "Clinical discussions"],
  },
  {
    title: "Section 1 Test x Discussion",
    icon: MessagesSquare,
    points: ["Test-based learning", "Discussion sessions", "Doubt solving"],
  },
  {
    title: "Section 2 Viva in Dreams",
    icon: Users2,
    points: ["Simulated viva", "Real exam feel", "Confidence building"],
  },
  {
    title: "Live One to One Session",
    icon: Presentation,
    points: ["Personal mentoring", "Flexible schedule", "Custom preparation"],
  },
];


export function FaceToFaceSection() {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  return (
    <section className="bg-cyan-50 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        
        {/* Header */}
        <div className="mb-12 flex flex-col items-center text-center">
          <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[#071014] sm:text-5xl">
            Face to Face Live Online Classes
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
                  <div className="mt-6 space-y-3">
                    {course.points.map((point) => (
                      <div key={point} className="flex items-start gap-3">
                        <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#0f7896]">
                          <Check className="h-3 w-3" />
                        </div>
                        <p className="text-sm text-white/90">{point}</p>
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