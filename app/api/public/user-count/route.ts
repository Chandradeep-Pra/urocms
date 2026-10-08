import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getAdminDb().collection("users").count().get();
    return Response.json(
      { count: snapshot.data().count },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Public user count error:", error);
    return Response.json({ error: "Failed to load user count" }, { status: 500 });
  }
}
