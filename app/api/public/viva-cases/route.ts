import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("vivaCases")
      .where("isActive", "==", true)
      .where("accessType", "==", "public")
      .orderBy("createdAt", "desc")
      .get();

    const cases = snapshot.docs.map((doc) => {
      const data = doc.data();
      const {
        allowedUser,
        courseAllowedUserMap,
        attempts,
        publicParticipants,
        attemptsCount,
        ...safeCase
      } = data as Record<string, unknown>;

      return {
        id: doc.id,
        ...safeCase,
      };
    });

    return NextResponse.json({ cases });
  } catch (error) {
    console.error("Public viva cases fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch public viva cases" },
      { status: 500 }
    );
  }
}
