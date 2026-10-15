"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { landingFaqs } from "./faq-data";

const highlightedTerms = [
  "https://urologics.co.uk",
  "Urologics AI Mentor",
  "Urologics",
  "Dr Ankit Goel",
  "FRCS Urology Gold Medalist",
  "FRCS Urology",
  "FRCS",
  "FEBU",
  "AI-powered viva practice",
  "question banks",
  "mock examinations",
  "live interactive lectures",
  "recorded sessions",
];
const termPattern = new RegExp(
  `(${[...highlightedTerms]
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})`,
  "gi",
);
const terms = new Set(highlightedTerms.map((term) => term.toLowerCase()));

function HighlightedText({ text }: { text: string }) {
  return text.split(termPattern).map((part, index) => {
    if (part === "https://urologics.co.uk") {
      return (
        <a key={index} href={part} className="break-words font-semibold text-[#0f7896] underline decoration-[#0f7896]/35 underline-offset-4 hover:decoration-[#0f7896]">
          {part}
        </a>
      );
    }
    return terms.has(part.toLowerCase()) ? (
      <strong key={index} className="font-semibold text-[#0f7896]">{part}</strong>
    ) : part;
  });
}

export function FaqSection() {
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const id = useId();
  const reducedMotion = useReducedMotion();

  return (
    <section id="faqs" aria-labelledby={`${id}-heading`} className="px-4 pb-16 pt-2 sm:px-6 sm:pb-24">
      <div className="mx-auto max-w-4xl">
        <header className="mb-7 sm:mb-9">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0f7896]">FAQs</p>
          <h2 id={`${id}-heading`} className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#071014] sm:text-4xl">
            Frequently asked questions
          </h2>
        </header>

        <div className="space-y-3">
          {landingFaqs.map((faq, index) => {
            const expanded = openQuestion === index;
            const questionId = `${id}-question-${index}`;
            const answerId = `${id}-answer-${index}`;
            return (
              <article key={faq.question} className="overflow-hidden rounded-2xl border border-[#0f7896]/15 border-r-4 border-r-[#0f7896] bg-white">
                <h3>
                  <button
                    id={questionId}
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={answerId}
                    onClick={() => setOpenQuestion(expanded ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-base font-medium leading-6 text-[#071014] transition-colors hover:bg-[#0f7896]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f7896] sm:px-6"
                  >
                    <span><HighlightedText text={faq.question} /></span>
                    <motion.span aria-hidden="true" animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.2 }} className="shrink-0 text-[#0f7896]">
                      <ChevronDown className="h-5 w-5" />
                    </motion.span>
                  </button>
                </h3>
                <motion.div
                  id={answerId}
                  role="region"
                  aria-labelledby={questionId}
                  aria-hidden={!expanded}
                  inert={!expanded}
                  initial={false}
                  animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm leading-7 text-[#071014]/70 sm:px-6 sm:pb-6 sm:text-base sm:leading-8">
                    <HighlightedText text={faq.answer} />
                  </p>
                </motion.div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
