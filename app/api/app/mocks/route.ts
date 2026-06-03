import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const accessContext = await buildAppContentAccessContext(auth.user);
    const snapshot = await adminDb.collection("mocks").orderBy("createdAt", "desc").get();

    const mocks = snapshot.docs.map((doc) => {
      const data = doc.data();
      const access = accessContext.getMockAccess({
        id: doc.id,
        type: String(data.type || "mock"),
        accessType: String(data.accessType || "restricted"),
      });

      return {
        id: doc.id,
        ...data,
        accessType: String(data.accessType || "restricted"),
        attemptsCount: Array.isArray(data.attempts)
          ? data.attempts.length
          : data.attemptsCount ?? 0,
        access: {
          tier: auth.user.tier,
          allowed: access.allowed,
          mode: access.mode,
          previewLimit: access.previewLimit ?? null,
          requiredTier: null,
          reason: access.reason ?? null,
          courseIds: access.courseIds,
        },
      };
    });

    return NextResponse.json({ tier: auth.user.tier, mocks });
  } catch (error) {
    console.error("App mocks fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch mocks" }, { status: 500 });
  }
}
