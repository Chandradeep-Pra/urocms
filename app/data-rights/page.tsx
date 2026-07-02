import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, Mail, ShieldCheck } from "lucide-react";
import { absoluteUrl, siteConfig } from "@/lib/site";

const dataRightsMailUrl = "mailto:ankitgoel042@gmail.com?subject=Urologics%3A%20Data%20Rights%20Request";

export const metadata: Metadata = {
  title: "Data Rights and Download My Data",
  description: "How Urologics users can request access, correction, deletion, restriction, objection, portability, or a copy of their data.",
  alternates: { canonical: "/data-rights" },
  openGraph: {
    title: "Urologics Data Rights",
    description: "Request access to, correction of, deletion of, or a portable copy of your Urologics data.",
    url: absoluteUrl("/data-rights"),
    images: [{ url: absoluteUrl(siteConfig.defaultOgImage), width: 500, height: 500, alt: "Urologics logo" }],
  },
};

const rights = [
  "Access the personal data we hold about you.",
  "Request correction of inaccurate or incomplete information.",
  "Request deletion of your account and associated data, subject to limited legal, security, payment, or audit retention requirements.",
  "Request a portable copy of data you provided to us, where technically feasible and legally applicable.",
  "Object to or request restriction of certain processing activities.",
  "Withdraw consent where processing is based on consent, such as optional permissions or communications.",
];

const downloadItems = [
  "Account and profile details linked to your Urologics account.",
  "Learning progress, quiz attempts, mock attempts, bookmarks, and viva attempt metadata where available.",
  "Device notification records linked to your account where retained.",
  "Support or request information you have sent to us where retained.",
];

export default function DataRightsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-white px-4 py-8 text-[#071014] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#0f7896]/15 bg-white px-4 py-2 text-sm font-semibold text-[#0f7896] shadow-sm transition hover:border-[#0f7896]/35 hover:bg-cyan-50"><ArrowLeft className="h-4 w-4" />Back to Urologics</Link>
        <section className="mt-10 rounded-[28px] border border-[#0f7896]/12 bg-white p-6 shadow-[0_24px_70px_rgba(15,120,150,0.12)] sm:p-10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f7896]/10 text-[#0f7896]"><ShieldCheck className="h-5 w-5" /></div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#071014] sm:text-5xl">Data Rights and Download My Data</h1>
          <p className="mt-4 text-sm font-medium text-[#071014]/55">Last updated: July 2, 2026</p>
          <p className="mt-6 text-base leading-8 text-[#071014]/70">This page explains how you can exercise privacy rights, including requesting a copy of your data for access or portability purposes. We may need to verify your identity before completing a request.</p>
        </section>
        <section className="mt-8 rounded-[24px] border border-[#0f7896]/10 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-[#071014]">Your Rights</h2><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-[#071014]/70">{rights.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section className="mt-5 rounded-[24px] border border-[#0f7896]/10 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><Download className="mt-1 h-5 w-5 text-[#0f7896]" /><div><h2 className="text-xl font-bold text-[#071014]">Download My Data</h2><p className="mt-3 text-sm leading-7 text-[#071014]/70">You can request a copy of personal data associated with your Urologics account. Where applicable, we will provide the data in a structured, commonly used electronic format.</p><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-[#071014]/70">{downloadItems.map((item) => <li key={item}>{item}</li>)}</ul></div></div></section>
        <section className="mt-5 rounded-[24px] border border-[#0f7896]/10 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-[#071014]">How to Make a Request</h2><p className="mt-3 text-sm leading-7 text-[#071014]/70">Email us from the address linked to your Urologics account and tell us what you need: access, correction, deletion, download my data, restriction, objection, or another privacy request. If you cannot email from the account address, we may ask for additional verification before disclosing or changing data.</p><a href={dataRightsMailUrl} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0f7896] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0b6078]"><Mail className="h-4 w-4" />Request or Download My Data</a></section>
        <section className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-6"><h2 className="text-xl font-bold text-[#071014]">Limits and Retention</h2><p className="mt-3 text-sm leading-7 text-[#071014]/70">Some requests may be limited where information must be retained for legal, payment, fraud prevention, security, dispute, or audit reasons. We will explain if a request cannot be completed in full.</p></section>
      </div>
    </main>
  );
}
