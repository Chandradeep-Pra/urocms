import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { absoluteUrl, siteConfig } from "@/lib/site";

const contactEmail = "ankitgoel042@gmail.com";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Terms and Conditions for using Urologics courses, quizzes, mock exams, AI viva practice, and related services.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Urologics Terms and Conditions",
    description: "Terms for using Urologics educational content, member access, assessments, and AI viva practice.",
    url: absoluteUrl("/terms"),
    images: [{ url: absoluteUrl(siteConfig.defaultOgImage), width: 500, height: 500, alt: "Urologics logo" }],
  },
};

const sections = [
  ["1. About Urologics", ["Urologics provides medical education and exam preparation resources, including courses, videos, quizzes, mock exams, AI viva practice, progress tracking, and related learning tools.", "By using Urologics, you agree to these Terms and any additional policies linked from our website or mobile app."]],
  ["2. Educational Use Only", ["Urologics content is provided for education, revision, and examination preparation only. It is not medical advice and must not be used as a substitute for professional clinical judgment, diagnosis, treatment, or emergency guidance.", "You remain responsible for your own clinical decisions, examination preparation, and use of any learning material."]],
  ["3. Accounts and Security", ["You are responsible for keeping your login details secure and for all activity under your account.", "You must provide accurate account and profile information and keep it updated where the app allows.", "You must not share, sell, transfer, or misuse your account access."]],
  ["4. Paid Access, Payments, and Refunds", ["Some content or features may require free registration, paid membership, course enrolment, manual course assignment, or other entitlement checks.", "Access terms, pricing, promotions, included features, duration, and availability may change from time to time. We will make reasonable efforts to keep key access information clear before purchase or enrolment.", "You are responsible for checking the plan, course, duration, price, and included access before making a payment or requesting enrolment.", "Payments may be processed through third-party providers, payment links, app stores, or other external platforms. Their payment, cancellation, chargeback, tax, and refund processes may also apply.", "Refunds, if any, are handled according to the applicable purchase terms, payment provider rules, consumer law requirements, and any written refund commitment made at the time of purchase."]],
  ["5. Acceptable Use", ["You must not copy, redistribute, scrape, resell, publish, or commercially exploit Urologics content without written permission.", "You must not attempt to bypass access controls, disrupt the service, reverse engineer protected features, upload malicious content, or use the platform unlawfully.", "You must not submit patient-identifiable, confidential, or sensitive clinical information into quizzes, AI viva practice, feedback forms, support messages, or other free-text fields."]],
  ["6. Intellectual Property", ["Urologics content, branding, questions, explanations, videos, layouts, software, and related materials are owned by Urologics or its licensors unless stated otherwise.", "You receive a limited, personal, non-transferable right to use the service for learning and exam preparation while your account or entitlement remains active."]],
  ["7. AI Viva and Automated Feedback", ["AI viva and automated feedback features are intended as learning aids. They may be incomplete, inaccurate, or unsuitable for particular clinical or examination contexts.", "You should review AI-generated feedback critically and should not rely on it as professional medical, legal, or regulatory advice."]],
  ["8. Suspension or Termination", ["We may suspend or terminate access if we reasonably believe an account is being misused, shared unlawfully, used to infringe intellectual property, used to attack the service, or used in breach of these Terms.", "You may stop using Urologics at any time and may request account deletion through the app or account deletion page."]],
  ["9. Changes and Service Updates", ["We may update content, features, pricing, availability, and these Terms from time to time. The latest version will be posted on this page.", "We may need to interrupt or modify the service for maintenance, security, technical, legal, or operational reasons."]],
  ["10. Contact", ["For questions about these Terms, contact us using the email below."]],
] as const;

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-white px-4 py-8 text-[#071014] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#0f7896]/15 bg-white px-4 py-2 text-sm font-semibold text-[#0f7896] shadow-sm transition hover:border-[#0f7896]/35 hover:bg-cyan-50"><ArrowLeft className="h-4 w-4" />Back to Urologics</Link>
        <section className="mt-10 rounded-[28px] border border-[#0f7896]/12 bg-white p-6 shadow-[0_24px_70px_rgba(15,120,150,0.12)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0f7896]">Urologics</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#071014] sm:text-5xl">Terms and Conditions</h1>
          <p className="mt-4 text-sm font-medium text-[#071014]/55">Last updated: July 2, 2026</p>
          <p className="mt-6 text-base leading-8 text-[#071014]/70">These Terms explain the rules for using Urologics. They should be read together with our Privacy Policy, Medical Disclaimer, and Data Rights pages.</p>
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
          <h2 className="text-xl font-bold">Contact Us</h2>
          <a href={`mailto:${contactEmail}`} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0f7896] transition hover:bg-cyan-50"><Mail className="h-4 w-4" />{contactEmail}</a>
        </section>
      </div>
    </main>
  );
}
