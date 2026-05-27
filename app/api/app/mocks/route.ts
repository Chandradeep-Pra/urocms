import { NextRequest, NextResponse } from "next/server";
import { getMockAccess } from "@/lib/appAccess";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  const mockAccess = getMockAccess(auth.user.tier);

  try {
    const snapshot = await adminDb.collection("mocks").orderBy("createdAt", "desc").get();

    const mocks = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        attemptsCount: Array.isArray(data.attempts)
          ? data.attempts.length
          : data.attemptsCount ?? 0,
        ...data,
        access: {
          tier: auth.user.tier,
          allowed: mockAccess.allowed,
          mode: mockAccess.mode,
          previewLimit: mockAccess.previewLimit ?? null,
          requiredTier: mockAccess.requiredTier ?? null,
          reason: mockAccess.reason ?? null,
        },
      };
    });

    return NextResponse.json({ tier: auth.user.tier, mocks });
  } catch (error) {
    console.error("App mocks fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch mocks" }, { status: 500 });
  }
}
