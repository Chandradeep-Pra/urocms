import { NextRequest, NextResponse } from "next/server";
import { FREE_CHAPTER_PREVIEW_LIMIT, getTierModules } from "@/lib/appAccess";
import { requireAppUser } from "@/lib/server/appSession";

export async function POST(req: NextRequest) {
<<<<<<< Updated upstream
  try {
    const authHeader = req.headers.get("authorization");

    console.log("Authorization header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No Bearer token found");
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];

    console.log("Token length:", token?.length);

    const decoded = await adminAuth.verifyIdToken(token);
    console.log("Decoded UID:", decoded.uid);

    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    console.log("User exists:", userDoc.exists);

    if (!userDoc.exists) {
  const defaultTier = decoded.firebase.sign_in_provider === "anonymous"
    ? "guest"
    : "free";

  await adminDb.collection("users").doc(decoded.uid).set({
    email: decoded.email ?? null,
    tier: defaultTier,
    source: decoded.firebase.sign_in_provider,
    createdAt: new Date().toISOString(),
  });
=======
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;
>>>>>>> Stashed changes

  return NextResponse.json({
    valid: true,
    tier: auth.user.tier,
    email: auth.user.email,
    googleAccessEmail: auth.user.googleAccessEmail,
    policy: {
      freeChapterPreviewLimit: FREE_CHAPTER_PREVIEW_LIMIT,
      modules: getTierModules(auth.user.tier),
    },
  });
}
<<<<<<< Updated upstream

    return NextResponse.json({
      valid: true,
      tier: userDoc.data()?.tier ?? "guest",
      email: userDoc.data()?.email ?? null,
    });

  } catch (err) {
    console.error("VALIDATION ERROR:", err);
    return NextResponse.json({ valid: false }, { status: 401 });
  }
}

=======
>>>>>>> Stashed changes
