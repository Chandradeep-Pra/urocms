import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendCouponCheckoutFollowUpEmail } from "@/lib/server/emailService";

let tasksClientPromise: Promise<import("@google-cloud/tasks").CloudTasksClient> | null = null;

function getTasksClient() {
  if (!tasksClientPromise) {
    tasksClientPromise = import("@google-cloud/tasks").then(({ CloudTasksClient }) => {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

      return new CloudTasksClient({
        projectId,
        ...(clientEmail && privateKey
          ? {
              credentials: {
                client_email: clientEmail,
                private_key: privateKey,
              },
            }
          : {}),
      });
    });
  }
  return tasksClientPromise;
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://urologics.co.uk").replace(/\/$/, "");
}

export function buildCourseCheckoutUrl(params: {
  planId: string;
  versionId: string;
  queryId?: string;
}) {
  const url = new URL("/checkout", getSiteUrl());
  url.searchParams.set("planId", params.planId);
  url.searchParams.set("versionId", params.versionId);
  if (params.queryId) url.searchParams.set("queryId", params.queryId);
  return url.toString();
}

export async function schedulePaymentQueryFollowUp(queryId: string) {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
  const location = process.env.PAYMENT_QUERY_TASK_LOCATION || "europe-west2";
  const queue = process.env.PAYMENT_QUERY_TASK_QUEUE || "payment-query-followups";
  const secret = process.env.PAYMENT_QUERY_TASK_SECRET?.trim();
  const handlerUrl =
    process.env.PAYMENT_QUERY_TASK_URL?.trim() ||
    `${getSiteUrl()}/api/internal/payment-query-followup`;

  if (!projectId || !secret) {
    throw new Error("Payment query task scheduling is not configured");
  }

  const tasksClient = await getTasksClient();
  const parent = tasksClient.queuePath(projectId, location, queue);
  const [task] = await tasksClient.createTask({
    parent,
    task: {
      scheduleTime: { seconds: Math.floor(Date.now() / 1000) + 45 },
      httpRequest: {
        httpMethod: "POST",
        url: handlerUrl,
        headers: {
          "Content-Type": "application/json",
          "X-Payment-Query-Task-Secret": secret,
        },
        body: Buffer.from(JSON.stringify({ queryId })).toString("base64"),
      },
    },
  });

  return { taskName: task.name || null, scheduledFor: new Date(Date.now() + 45_000) };
}

export async function sendPaymentQueryFollowUp(queryId: string) {
  const ref = getAdminDb().collection("paymentQueries").doc(queryId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("Payment query not found");
  const data = snapshot.data() ?? {};

  if (data.followUpEmail?.sent === true) {
    return { alreadySent: true };
  }

  const planId = String(data.planId || "");
  const versionId = String(data.versionId || "");
  if (!planId || !versionId) throw new Error("Payment query has no checkout destination");

  const checkoutUrl = buildCourseCheckoutUrl({ planId, versionId, queryId });
  await sendCouponCheckoutFollowUpEmail({
    to: String(data.email || ""),
    name: String(data.name || ""),
    planName: String(data.planName || "Selected course"),
    couponName: String(data.couponName || data.couponCode || "Not provided"),
    checkoutUrl,
  });

  await ref.set(
    {
      checkoutUrl,
      followUpEmail: {
        sent: true,
        sentAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { alreadySent: false, checkoutUrl };
}
