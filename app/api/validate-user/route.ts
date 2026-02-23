import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

// export async function POST(req: NextRequest) {
//   try {
//     const authHeader = req.headers.get("authorization");

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return NextResponse.json({ valid: false }, { status: 401 });
//     }

//     const token = authHeader.split("Bearer ")[1];

//     // 🔐 Verify Firebase ID token
//     const decoded = await adminAuth.verifyIdToken(token);
//     const uid = decoded.uid;

//     // 🔍 Check Firestore
//     const userDoc = await adminDb.collection("users").doc(uid).get();

//     if (!userDoc.exists) {
//       return NextResponse.json({ valid: false }, { status: 401 });
//     }

//     const data = userDoc.data();

//     return NextResponse.json({
//       valid: true,
//       tier: data?.tier ?? "guest",
//     });

//   } catch (err) {
//     return NextResponse.json({ valid: false }, { status: 401 });
//   }
// }

export async function POST(req: NextRequest) {
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

  return NextResponse.json({
    valid: true,
    tier: defaultTier,
  });
}

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

