import { NextRequest, NextResponse } from "next/server";
import { canAccessMocks } from "@/lib/appAccess";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
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
    const snapshot = await adminDb.collection("mocks").orderBy("createdAt", "desc").get();

    const mocks = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        attemptsCount: Array.isArray(data.attempts)
          ? data.attempts.length
          : data.attemptsCount ?? 0,
        ...data,
      };
    });

    return NextResponse.json({ tier: auth.user.tier, mocks });
  } catch (error) {
    console.error("App mocks fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch mocks" }, { status: 500 });
  }
}
