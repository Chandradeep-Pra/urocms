import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { absoluteUrl, siteConfig } from "@/lib/site";

const deletionMailUrl =
  "mailto:ankitgoel042@gmail.com?subject=Urologics%3A%20Account%20Deletion%20Request";

export const metadata: Metadata = {
  title: "Account Deletion",
  description:
    "How Urologics users can delete their account and request removal of associated profile and learning data.",
  alternates: {
    canonical: "/account-deletion",
  },
  openGraph: {
    title: "Urologics Account Deletion",
    description:
      "Delete your Urologics account from inside the mobile app or request deletion from the web.",
    url: absoluteUrl("/account-deletion"),
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

export default function AccountDeletionPage() {
  return (
    <main className="min-h-screen bg-cyan-50 px-4 py-8 text-[#071014] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f7896] transition hover:text-[#0b6078]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Urologics
        </Link>

        <section className="mt-8 overflow-hidden rounded-[32px] border border-[#0f7896]/12 bg-white shadow-[0_20px_60px_rgba(15,120,150,0.12)]">
          <div className="border-b border-[#0f7896]/10 px-6 py-8 sm:px-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f7896]/10 text-[#0f7896]">
              <Trash2 className="h-5 w-5" />
            </div>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Account Deletion
            </h1>
            <p className="mt-4 text-base leading-7 text-[#071014]/68">
              Urologics lets users initiate account deletion from inside the mobile app.
              You can also contact support from this page if you cannot access your account.
            </p>
          </div>

          <div className="space-y-6 px-6 py-7 sm:px-8">
            <div className="rounded-3xl bg-cyan-50 p-5">
              <h2 className="text-lg font-bold">Delete from the app</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#071014]/72">
                <li>Open the Urologics app and sign in to the account you want to delete.</li>
                <li>Go to Profile.</li>
                <li>Tap Delete Account.</li>
                <li>Confirm the deletion prompt.</li>
              </ol>
            </div>

            <div className="rounded-3xl border border-[#0f7896]/12 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-[#0f7896]" />
                <div>
                  <h2 className="text-lg font-bold">What is deleted</h2>
                  <p className="mt-2 text-sm leading-6 text-[#071014]/72">
                    Account deletion removes your Firebase sign-in account, Urologics profile,
                    saved items, device records, learning progress, quiz attempts, mock attempts,
                    viva attempts, and related account statistics from active user-facing systems
                    where technically and legally possible.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#0f7896]/12 p-5">
              <h2 className="text-lg font-bold">What may be retained</h2>
              <p className="mt-2 text-sm leading-6 text-[#071014]/72">
                Some limited records may be retained where required for legal, tax, accounting,
                payment, refund, fraud-prevention, security, dispute, audit, backup, or platform
                integrity reasons. Retained records are kept only for as long as reasonably needed
                for those purposes and may not remain visible in the app after deletion.
              </p>
              <p className="mt-3 text-sm leading-6 text-[#071014]/72">
                If you purchased access through a third-party payment provider or app store, their
                own transaction, refund, and account records may be retained according to their
                policies.
              </p>
            </div>

            <div className="rounded-3xl border border-[#0f7896]/12 p-5">
              <h2 className="text-lg font-bold">If the app is inaccessible</h2>
              <p className="mt-2 text-sm leading-6 text-[#071014]/72">
                If you cannot open the app, cannot sign in, or cannot access the profile deletion
                control, email us from the address linked to your Urologics account. We may ask for
                reasonable verification before deleting or disclosing account data.
              </p>
              <a
                href={deletionMailUrl}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0f7896] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0b6078]"
              >
                <Mail className="h-4 w-4" />
                Request Account Deletion
              </a>
            </div>

            <div className="rounded-3xl border border-[#0f7896]/12 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-[#0f7896]" />
                <div>
                  <h2 className="text-lg font-bold">Deletion confirmation</h2>
                  <p className="mt-2 text-sm leading-6 text-[#071014]/72">
                    Once your request is verified and processed, we will confirm deletion or explain
                    if any limited information must be retained for legal, security, payment, or
                    audit reasons.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}
