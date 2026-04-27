import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { canAccessMocks } from "@/lib/appAccess";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  if (!canAccessMocks(auth.user.tier)) {
    return tierLockedResponse({
      feature: "mocks",
      tier: auth.user.tier,
      requiredTier: "paid",
      reason: "Mocks are available only for paid users.",
    });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const marks = body?.marks;

    if (marks === undefined || marks === null) {
      return NextResponse.json({ error: "Marks are required" }, { status: 400 });
    }

    const mockRef = adminDb.collection("mocks").doc(id);
    const mockDoc = await mockRef.get();

    if (!mockDoc.exists) {
      return NextResponse.json({ error: "Mock not found" }, { status: 404 });
    }

    const mockData = mockDoc.data();
    const existingAttempts = Array.isArray(mockData?.attempts) ? mockData.attempts : [];
    const normalizedMarks = typeof marks === "number" ? marks : Number(marks);

    if (Number.isNaN(normalizedMarks)) {
      return NextResponse.json({ error: "Invalid marks" }, { status: 400 });
    }

    const nextAttempt = {
      candidate: {
        uid: auth.user.uid,
        name: body?.name || auth.user.name || "Paid User",
        email: auth.user.email || "",
      },
      marks: normalizedMarks,
      createdAt: new Date().toISOString(),
    };

    const attempts = [...existingAttempts, nextAttempt];

    await mockRef.update({
      attempts,
      attemptsCount: attempts.length,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      attemptsCount: attempts.length,
      attempt: nextAttempt,
    });
  } catch (error) {
    console.error("App mock attempt submit error:", error);
    return NextResponse.json({ error: "Failed to submit mock attempt" }, { status: 500 });
  }
}
