import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { absoluteUrl, siteConfig } from "@/lib/site";

const contactEmail = "ankitgoel042@gmail.com";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Urologics, an FRCS Urology preparation platform with courses, quizzes, mocks, AI viva practice, and mentor-led learning.",
  alternates: {
    canonical: "/privacy-policy",
  },
  openGraph: {
    title: "Urologics Privacy Policy",
    description:
      "How Urologics collects, uses, stores, and protects information for app-based FRCS Urology preparation.",
    url: absoluteUrl("/privacy-policy"),
    images: [
      {
        url: absoluteUrl(siteConfig.defaultOgImage),
        width: 500,
        height: 500,
        alt: "Urologics logo",
      },
    ],
  },
};

const sections = [
  {
    title: "1. Information We Collect",
    body: [
      "Account information such as your name, email address, login provider, user ID, and guest access email when you choose to continue as a guest.",
      "Profile information such as your display name, profile photo, country, phone number, and other details you choose to add.",
      "Learning activity such as courses opened, video progress, bookmarks, quiz answers, mock exam attempts, scores, AI viva attempts, feedback reports, and learning history.",
      "Device and app information such as device type, operating system, app version, push notification token, crash logs, diagnostics, and basic usage events needed to operate and improve the app.",
      "Media and permission-based information such as profile images, microphone input for AI viva practice, and camera access where a viva feature requires it.",
    ],
  },
  {
    title: "2. How We Use Information",
    body: [
      "To create and manage your account, authenticate access, and provide guest access where available.",
      "To deliver courses, videos, chapter quizzes, mocks, AI viva sessions, feedback, scoring, bookmarks, and progress tracking.",
      "To check free or premium access and show content according to your subscription or entitlement.",
      "To send important app notifications, learning reminders, announcements, and support messages where permitted.",
      "To keep the app secure, fix issues, improve performance, and understand which learning features are useful to students.",
    ],
  },
  {
    title: "3. AI Viva, Microphone, and Camera",
    body: [
      "AI Viva uses your spoken responses and viva session activity to generate follow-up questions, feedback, scoring, and reports.",
      "Microphone access is requested only when needed for viva or voice-based features. Camera access may be requested for viva-related setup or experience checks.",
      "Do not share sensitive personal, patient-identifiable, or confidential clinical information during AI viva practice.",
    ],
  },
  {
    title: "4. Third-Party Services",
    body: [
      "We may use trusted service providers for authentication, cloud database, file storage, push notifications, app hosting, analytics, video playback, image hosting, payments, and AI processing.",
      "These providers may include services such as Firebase or Google Cloud, Cloudinary, Expo, YouTube or other video providers, payment providers, hosting providers, and AI service providers used to deliver the app features.",
      "These services process information only as needed to provide, secure, and improve Urologics.",
    ],
  },
  {
    title: "5. Sharing of Information",
    body: [
      "We do not sell your personal information.",
      "We may share information with service providers that help operate the app, comply with law, prevent fraud or abuse, process payments, provide support, or protect the rights and safety of Urologics and its users.",
    ],
  },
  {
    title: "6. Data Retention",
    body: [
      "We keep account, learning, quiz, mock, and viva data for as long as your account is active or as long as needed to provide the service, meet legal requirements, resolve disputes, and maintain security.",
      "You can initiate account deletion inside the Urologics mobile app from Profile > Delete Account. If you cannot access the app, you may request deletion from the account deletion page or by contacting us. Some information may be retained where required for legal, security, payment, or audit reasons.",
    ],
  },
  {
    title: "7. Your Choices and Rights",
    body: [
      "You can update your profile information in the app where supported.",
      "You can disable push notifications, microphone, camera, or photo permissions from your device settings.",
      "You can request access, correction, or deletion of your personal data by contacting us at the email below.",
    ],
  },
  {
    title: "8. Children",
    body: [
      "Urologics is designed for medical professionals and candidates preparing for postgraduate urology exams. It is not intended for children under 13 years of age.",
    ],
  },
  {
    title: "9. Security",
    body: [
      "We use reasonable technical and organisational measures to protect information. However, no internet or mobile app service can be guaranteed to be completely secure.",
    ],
  },
  {
    title: "10. Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. The updated version will be posted on this page with a revised date.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-white px-4 py-8 text-[#071014] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-[#0f7896]/15 bg-white px-4 py-2 text-sm font-semibold text-[#0f7896] shadow-sm transition hover:border-[#0f7896]/35 hover:bg-cyan-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Urologics
        </Link>

        <section className="mt-10 rounded-[28px] border border-[#0f7896]/12 bg-white p-6 shadow-[0_24px_70px_rgba(15,120,150,0.12)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0f7896]">
            Urologics
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#071014] sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm font-medium text-[#071014]/55">
            Last updated: June 1, 2026
          </p>
          <p className="mt-6 text-base leading-8 text-[#071014]/70">
            Urologics is an FRCS and postgraduate urology preparation platform
            providing app-based courses, videos, tests, mock exams, AI viva
            practice, feedback, and mentor-led preparation. This Privacy Policy
            explains how we collect, use, store, and protect information when
            you use our website, mobile app, and related services.
          </p>
        </section>

        <div className="mt-8 space-y-5">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-[24px] border border-[#0f7896]/10 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-bold text-[#071014]">
                {section.title}
              </h2>
              <div className="mt-4 space-y-3">
                {section.body.map((item) => (
                  <p key={item} className="text-sm leading-7 text-[#071014]/70">
                    {item}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-[24px] border border-[#0f7896]/12 bg-[#0f7896] p-6 text-white shadow-[0_24px_70px_rgba(15,120,150,0.2)]">
          <h2 className="text-xl font-bold">Contact Us</h2>
          <p className="mt-3 text-sm leading-7 text-white/80">
            For privacy questions, data access, correction, or account deletion
            requests, contact Urologics at:
          </p>
          <a
            href={`mailto:${contactEmail}`}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0f7896] transition hover:bg-cyan-50"
          >
            <Mail className="h-4 w-4" />
            {contactEmail}
          </a>
        </section>
      </div>
    </main>
  );
}
