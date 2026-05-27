import { notFound } from "next/navigation";
import PublicFeedbackForm from "@/components/feedback/PublicFeedbackForm";
import { findFeedbackFormByToken } from "@/lib/server/feedbackFormService";

export default async function FeedbackTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const form = await findFeedbackFormByToken(token);

  if (!form) {
    notFound();
  }

  return (
    <PublicFeedbackForm
      form={{
        id: form.id,
        title: form.title,
        description: form.description,
        token: form.token,
        isActive: form.isActive,
        allowMultipleResponses: form.allowMultipleResponses,
      }}
    />
  );
}
