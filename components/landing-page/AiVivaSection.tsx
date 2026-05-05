import Image from "next/image";
import { Check } from "lucide-react";

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
    <section id="ai-viva" className="overflow-hidden bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">

        {/* Centered Heading */}
        <div className="mb-16 text-center">
          <h2 className="text-5xl font-semibold tracking-[-0.06em] text-[#071014] sm:text-6xl">
            Urologics <span className="text-[#0f7896]">AI Viva</span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#071014]/65">
            Practice viva with examiner-style scenarios, AI feedback, and a focused
            preparation flow built for real exam confidence.
          </p>
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
                  className="group rounded-[24px] border border-[#0f7896]/10 bg-white p-6 shadow-[0_14px_36px_rgba(15,120,150,0.08)] transition hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(15,120,150,0.12)]"
                >
                  {/* Big text */}
                  <p className="text-lg font-semibold leading-7 tracking-[-0.02em] text-[#071014] sm:text-xl">
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
          </div>
        </div>
      </div>
    </section>
  );
}