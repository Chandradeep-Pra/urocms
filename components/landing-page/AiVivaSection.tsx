import Image from "next/image";
import { Check, Sparkles } from "lucide-react";

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
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          

          <h2 className="mt-5 max-w-2xl text-5xl font-semibold tracking-[-0.06em] text-[#071014] sm:text-6xl">
            Urologics <span className="text-[#0f7896]">AI Viva</span>
          </h2>

          <p className="mt-5 max-w-xl text-lg leading-8 text-[#071014]/65">
            Practice viva with examiner-style scenarios, AI feedback, and a focused
            preparation flow built for real exam confidence.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {aiVivaPoints.map((point, index) => (
              <div
                key={point}
                className="flex items-start gap-3 rounded-2xl border border-[#0f7896]/10 bg-cyan-50/70 p-4"
              >
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    index % 3 === 0
                      ? "bg-[#0f7896]"
                      : index % 3 === 1
                      ? "bg-[#e6a63a]"
                      : "bg-[#7c6ee6]"
                  }`}
                >
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>

                <p className="text-sm font-medium leading-6 text-[#071014]/75">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-10 ml-6">

          <div className="relative overflow-hidden rounded-[32px] border border-[#0f7896]/14 bg-cyan-50 p-3 shadow-[0_22px_70px_rgba(15,120,150,0.16)]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[24px] bg-white">
              <Image
                src="/my-mentor-ai.jpeg"
                alt="Urologics AI Viva laptop preview"
                fill
                className="object-contain object-center"
                sizes="(max-width: 1024px) 100vw, 52vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}