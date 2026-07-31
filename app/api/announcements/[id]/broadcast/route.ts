import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { sendAnnouncementEmail } from "@/lib/server/emailService";

export const maxDuration = 300;

type BroadcastRecipient = {
  name: string;
  email: string;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return normalizeString(value).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function loadRecipients() {
  const snapshot = await getAdminDb().collection("users").get();
  const recipients = new Map<string, BroadcastRecipient>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data() ?? {};
    if (data.isShadowDuplicate === true) return;

    const email = normalizeEmail(data.email || data.googleAccessEmail);
    if (!isValidEmail(email) || recipients.has(email)) return;

    recipients.set(email, {
      email,
      name:
        normalizeString(data.name) ||
        normalizeString(data.displayName) ||
        "Member",
    });
  });

  return Array.from(recipients.values()).sort((left, right) =>
    left.email.localeCompare(right.email)
  );
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  const { id } = await context.params;
  const announcementDoc = await getAdminDb().collection("announcements").doc(id).get();

  if (!announcementDoc.exists) {
    return Response.json({ error: "Announcement not found" }, { status: 404 });
  }

  const announcement = announcementDoc.data() ?? {};
  const title = normalizeString(announcement.title) || "Urologics Announcement";
  const description =
    normalizeString(announcement.description) ||
    normalizeString(announcement.subtitle) ||
    "A new announcement has been published on Urologics.";
  const recipients = await loadRecipients();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      void (async () => {
        let sent = 0;
        let failed = 0;

        sendEvent({ type: "start", total: recipients.length });

        for (let index = 0; index < recipients.length; index += 1) {
          const recipient = recipients[index];
          sendEvent({
            type: "sending",
            index: index + 1,
            total: recipients.length,
            name: recipient.name,
            email: recipient.email,
          });

          try {
            await sendAnnouncementEmail({
              to: recipient.email,
              name: recipient.name,
              title,
              description,
            });
            sent += 1;
            sendEvent({
              type: "sent",
              sent,
              failed,
              email: recipient.email,
            });
          } catch (error) {
            failed += 1;
            console.error(`Announcement email failed for ${recipient.email}:`, error);
            sendEvent({
              type: "failed",
              sent,
              failed,
              email: recipient.email,
            });
          }
        }

        await announcementDoc.ref.set(
          {
            emailBroadcast: {
              total: recipients.length,
              sent,
              failed,
              completedAt: new Date(),
            },
          },
          { merge: true }
        );

        sendEvent({
          type: "complete",
          total: recipients.length,
          sent,
          failed,
        });
        controller.close();
      })().catch((error) => {
        console.error("Announcement broadcast error:", error);
        sendEvent({
          type: "error",
          message: error instanceof Error ? error.message : "Email broadcast failed",
        });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
