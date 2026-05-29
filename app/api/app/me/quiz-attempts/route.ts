import { NextRequest, NextResponse } from "next/server";
import { getQuizAttemptsCollection } from "@/lib/server/candidateProgress";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const snapshot = await getQuizAttemptsCollection(auth.user.uid)
      .orderBy("submittedAt", "desc")
      .limit(100)
      .get();

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Candidate quiz attempts error:", error);
    return NextResponse.json({ error: "Failed to load quiz attempts" }, { status: 500 });
  }
}
