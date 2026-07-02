import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Mail } from "lucide-react";
import { absoluteUrl, siteConfig } from "@/lib/site";

const contactEmail = "ankitgoel042@gmail.com";

export const metadata: Metadata = {
  title: "Medical Disclaimer",
  description: "Medical and educational disclaimer for Urologics exam preparation content, quizzes, mock exams, and AI viva practice.",
  alternates: { canonical: "/medical-disclaimer" },
  openGraph: {
    title: "Urologics Medical Disclaimer",
    description: "Urologics is for medical education and exam preparation only and is not medical advice.",
    url: absoluteUrl("/medical-disclaimer"),
    images: [{ url: absoluteUrl(siteConfig.defaultOgImage), width: 500, height: 500, alt: "Urologics logo" }],
  },
};

const sections = [
  ["Educational Use Only", ["Urologics is designed for medical education, examination preparation, and professional learning. It does not provide medical advice, diagnosis, treatment, prescribing advice, patient-specific recommendations, emergency advice, or a doctor-patient relationship.", "Content may include clinical scenarios, explanations, AI viva prompts, model answers, images, and references. These are learning materials only and may not reflect every local guideline, regulatory requirement, patient factor, or clinical pathway."]],
  ["No Substitute for Clinical Judgment", ["Users must rely on their own professional judgment, local policies, current clinical guidelines, supervising clinicians, and appropriate specialist advice when making real-world clinical decisions.", "Never delay or disregard professional medical advice because of content viewed in Urologics."]],
  ["AI Viva and Automated Feedback", ["AI viva features and automated scoring are learning aids. They can be inaccurate, incomplete, outdated, or unsuitable for a particular examination or clinical context.", "Do not submit patient-identifiable information, confidential clinical records, or sensitive personal data during AI viva practice or in free-text responses."]],
  ["Content Accuracy and Updates", ["We aim to provide high-quality educational material, but medical knowledge, examination standards, and clinical guidelines change over time.", "We do not guarantee that all content is complete, current, error-free, or suitable for a particular exam sitting, jurisdiction, hospital, or training programme."]],
  ["Emergencies", ["Urologics must not be used for emergencies or urgent clinical decision-making. In a medical emergency, contact local emergency services or the appropriate clinical team immediately."]],
] as const;

export default function MedicalDisclaimerPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-white px-4 py-8 text-[#071014] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#0f7896]/15 bg-white px-4 py-2 text-sm font-semibold text-[#0f7896] shadow-sm transition hover:border-[#0f7896]/35 hover:bg-cyan-50"><ArrowLeft className="h-4 w-4" />Back to Urologics</Link>
        <section className="mt-10 rounded-[28px] border border-amber-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,120,150,0.12)] sm:p-10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><AlertTriangle className="h-5 w-5" /></div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#071014] sm:text-5xl">Medical Disclaimer</h1>
          <p className="mt-4 text-sm font-medium text-[#071014]/55">Last updated: July 2, 2026</p>
          <p className="mt-6 text-base leading-8 text-[#071014]/70">Urologics is an educational platform. It is not a clinical decision support system and must not be used for patient care decisions.</p>
        </section>
        <div className="mt-8 space-y-5">
          {sections.map(([title, body]) => (
            <section key={title} className="rounded-[24px] border border-[#0f7896]/10 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#071014]">{title}</h2>
              <div className="mt-4 space-y-3">{body.map((item) => <p key={item} className="text-sm leading-7 text-[#071014]/70">{item}</p>)}</div>
            </section>
          ))}
        </div>
        <section className="mt-8 rounded-[24px] border border-[#0f7896]/12 bg-[#0f7896] p-6 text-white shadow-[0_24px_70px_rgba(15,120,150,0.2)]">
          <h2 className="text-xl font-bold">Questions?</h2>
          <a href={`mailto:${contactEmail}`} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0f7896] transition hover:bg-cyan-50"><Mail className="h-4 w-4" />{contactEmail}</a>
        </section>
      </div>
    </main>
  );
}
