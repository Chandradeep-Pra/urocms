import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import { requireAppUser } from "@/lib/server/appSession";
import { getPublicMockResults } from "@/lib/server/mockService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await context.params;
    const doc = await getAdminDb().collection("mocks").doc(id).get();
    if (!doc.exists) return NextResponse.json({ error: "Mock not found" }, { status: 404 });
    const data = doc.data() ?? {};
    if (data.accessType !== "public") {
      const access = (await buildAppContentAccessContext(auth.user)).getMockAccess({ id, type: String(data.type || "mock"), accessType: String(data.accessType || "restricted") });
      if (!access.allowed || access.mode === "locked") return NextResponse.json({ error: "This mock is locked" }, { status: 403 });
    }
    return NextResponse.json(await getPublicMockResults(id, true), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("App mock results error:", error);
    return NextResponse.json({ error: "Failed to load mock results" }, { status: 500 });
  }
}
