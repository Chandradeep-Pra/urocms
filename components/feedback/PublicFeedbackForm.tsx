"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

type PublicFeedbackFormProps = {
  form: {
    id: string;
    title: string;
    description: string;
    token: string;
    isActive: boolean;
    allowMultipleResponses: boolean;
  };
};

type SubmitState = {
  fullName: string;
  email: string;
  currentInstitute: string;
  currentRole: string;
  examTrack: string;
  feedback: string;
};

const initialState: SubmitState = {
  fullName: "",
  email: "",
  currentInstitute: "",
  currentRole: "",
  examTrack: "",
  feedback: "",
};

export default function PublicFeedbackForm({ form }: PublicFeedbackFormProps) {
  const [state, setState] = useState<SubmitState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof SubmitState>(key: K, value: SubmitState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    try {
      setSubmitting(true);
      const res = await fetch(`/api/public/feedback/${form.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Unable to submit feedback");
      }

      setSubmitted(true);
      setState(initialState);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit feedback"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-cyan-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-[32px] border border-[#0f7896]/12 bg-white shadow-[0_22px_60px_rgba(15,120,150,0.10)]">
          <div className="border-b border-[#0f7896]/10 bg-white px-6 py-8 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0f7896]">
              Candidate Feedback
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#071014] sm:text-4xl">
              {form.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              {form.description || "Please share your feedback using the form below."}
            </p>
            {!form.isActive ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This feedback link is currently deactivated.
              </div>
            ) : null}
          </div>

          <div className="px-6 py-8 sm:px-8">
            {submitted ? (
              <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-8 text-center">
                <h2 className="text-2xl font-semibold text-[#071014]">
                  Thank you for your feedback
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Your response has been submitted successfully.
                </p>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Full Name"
                    value={state.fullName}
                    onChange={(value) => update("fullName", value)}
                    required
                    disabled={!form.isActive || submitting}
                  />
                  <Field
                    label="Email"
                    type="email"
                    value={state.email}
                    onChange={(value) => update("email", value)}
                    required
                    disabled={!form.isActive || submitting}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Current Institute / Trust"
                    value={state.currentInstitute}
                    onChange={(value) => update("currentInstitute", value)}
                    required
                    disabled={!form.isActive || submitting}
                  />
                  <Field
                    label="Current Role"
                    value={state.currentRole}
                    onChange={(value) => update("currentRole", value)}
                    disabled={!form.isActive || submitting}
                  />
                </div>

                <Field
                  label="Exam Track"
                  value={state.examTrack}
                  onChange={(value) => update("examTrack", value)}
                  placeholder="FRCS Section 1 / Section 2 / FEBU / Other"
                  disabled={!form.isActive || submitting}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900">Feedback</label>
                  <textarea
                    className="min-h-[160px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0f7896] focus:ring-2 focus:ring-[#0f7896]/15"
                    value={state.feedback}
                    onChange={(e) => update("feedback", e.target.value)}
                    placeholder="Tell us about your experience with the course, mocks, viva practice, and what helped you most."
                    required
                    disabled={!form.isActive || submitting}
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={!form.isActive || submitting}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-[#0f7896] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0c6279] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </button>

                {!form.allowMultipleResponses ? (
                  <p className="text-xs text-slate-500">
                    This link accepts one response per email address.
                  </p>
                ) : null}
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-900">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-[#0f7896] focus:ring-2 focus:ring-[#0f7896]/15"
      />
    </div>
  );
}
