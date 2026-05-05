import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const aiVivaLoginUrl = `/login?redirect=${encodeURIComponent(
  "https://testing-zone-five.vercel.app/ai-viva/cases"
)}`;

const aiVivaPoints = [
  "AI UROLOGY MENTOR",
  "Experiment different examiners temperament",
  "Choose your examiner from the credits",
  "More than 100+ AI Viva Scenarios",
  "Personalised feedback scoring after each viva",
  "Monitor your progress during FRCS preparation",
];

export function AiVivaSection() {
  return (
    <section id="ai-viva" className="overflow-hidden bg-gradient-to-b from-cyan-50/30 to-white px-6 py-24">
      <div className="mx-auto max-w-7xl">

        {/* Centered Heading */}
        <div className="mb-20 text-center">
          <h2 className="text-5xl font-extrabold tracking-tight text-[#071014] sm:text-6xl">
            Urologics <span className="bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent">AI Viva</span>
          </h2>
        </div>

        {/* Content */}
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">

          {/* LEFT → BIG CARDS */}
          <div className="grid gap-4 sm:grid-cols-2">
            {aiVivaPoints.map((point, index) => {
              const colors = ["#0f7896", "#e6a63a", "#7c6ee6"];
              const color = colors[index % 3];

              return (
                <div
                  key={point}
                  className="group rounded-[28px] border border-slate-100/80 bg-white/80 backdrop-blur-sm p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_48px_rgba(15,120,150,0.12)] hover:border-[#0f7896]/20"
                >
                  {/* Big text */}
                  <p className="text-lg font-bold leading-snug tracking-[-0.02em] text-[#071014] sm:text-xl">
                    {point}
                  </p>

                  {/* subtle accent line */}
                  <div
                    className="mt-5 h-1.5 w-10 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              );
            })}
          </div>

          {/* RIGHT → IMAGE */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-[32px] shadow-[0_22px_70px_rgba(15,120,150,0.16)]">
              <Image
                src="/my-mentor-ai.jpeg"
                alt="Urologics AI Viva laptop preview"
                width={1200}
                height={800}
                className="h-auto w-full object-contain"
              />
            </div>
            <div className="mt-7 flex justify-center">
              <Link
                href={aiVivaLoginUrl}
                className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#0f7896] to-[#1294ba] px-8 py-4 text-base font-extrabold text-white shadow-[0_16px_42px_rgba(15,120,150,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_58px_rgba(15,120,150,0.36)]"
              >
                Try AI Viva Now
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/18 transition group-hover:translate-x-0.5 group-hover:bg-white/25">
                  <ArrowUpRight className="h-5 w-5" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
