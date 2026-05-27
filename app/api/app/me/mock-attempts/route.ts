import { NextRequest, NextResponse } from "next/server";
import { getMockAttemptsCollection } from "@/lib/server/candidateProgress";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const snapshot = await getMockAttemptsCollection(auth.user.uid)
      .orderBy("submittedAt", "desc")
      .get();

    const rawItems = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<Record<string, unknown> & { id: string }>;

    const mockIds = Array.from(
      new Set(
        rawItems
          .map((item) => String(item.mockId || "").trim())
          .filter(Boolean)
      )
    );

    const mockMetaMap = new Map<string, { title?: string; description?: string }>();
    await Promise.all(
      mockIds.map(async (mockId) => {
        const doc = await adminDb.collection("mocks").doc(mockId).get();
        const data = doc.data() ?? {};
        const title = String(data?.title || data?.quiz?.title || "").trim();
        const description = String(data?.description || data?.quiz?.description || "").trim();
        if (title || description) {
          mockMetaMap.set(mockId, { title, description });
        }
      })
    );

    const items = rawItems.map((item) => {
      const mockId = String(item.mockId || "").trim();
      const meta = mockMetaMap.get(mockId);

      return {
        ...item,
        mockTitle:
          String(item.mockTitle || "").trim() ||
          meta?.title ||
          "Mock Assessment",
        mockDescription:
          String(item.mockDescription || "").trim() ||
          meta?.description ||
          null,
      };
    });

    return NextResponse.json({
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Mock attempts fetch error:", error);
    return NextResponse.json({ error: "Failed to load mock attempts" }, { status: 500 });
  }
}
