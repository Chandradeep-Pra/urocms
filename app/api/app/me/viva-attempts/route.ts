import { NextRequest, NextResponse } from "next/server";
import { getVivaAttemptsCollection } from "@/lib/server/candidateProgress";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const snapshot = await getVivaAttemptsCollection(auth.user.uid)
      .orderBy("submittedAt", "desc")
      .get();

    const rawItems = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<Record<string, unknown> & { id: string }>;

    const caseIds = Array.from(
      new Set(
        rawItems
          .map((item) => String(item.caseId || "").trim())
          .filter(Boolean)
      )
    );

    const caseTitleMap = new Map<string, string>();
    await Promise.all(
      caseIds.map(async (caseId) => {
        const doc = await adminDb.collection("vivaCases").doc(caseId).get();
        const data = doc.data() ?? {};
        const title = String(data?.case?.title || data?.title || "").trim();
        if (title) {
          caseTitleMap.set(caseId, title);
        }
      })
    );

    const items = rawItems.map((item) => ({
      ...item,
      caseTitle:
        String(item.caseTitle || "").trim() ||
        caseTitleMap.get(String(item.caseId || "").trim()) ||
        "AI Viva Case",
    }));

    return NextResponse.json({
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Viva attempts fetch error:", error);
    return NextResponse.json({ error: "Failed to load viva attempts" }, { status: 500 });
  }
}
