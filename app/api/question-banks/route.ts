// Get route

import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const snapshot = await adminDb
      .collection("questionBanks")
      .where("isActive", "==", true)
      .get();

    const banks = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a: any, b: any) => {
        const aSeconds =
          typeof a?.createdAt === "object" && a?.createdAt?._seconds
            ? a.createdAt._seconds
            : 0;
        const bSeconds =
          typeof b?.createdAt === "object" && b?.createdAt?._seconds
            ? b.createdAt._seconds
            : 0;

        return bSeconds - aSeconds;
      });

    return NextResponse.json({ banks });

  } catch (err) {
    console.error("Fetch question banks error:", err);
    return NextResponse.json(
      { error: "Failed to fetch banks" },
      { status: 500 }
    );
  }
}

// Post route
export async function POST(req: NextRequest) {
    const { response } = await requireAdminSession(req);
    if (response) return response;

    try{
        const { title, section } = await req.json();
        const normalizedTitle = String(title || "").trim();
        const normalizedSection = String(section || "").trim();
        const allowedSections = new Set(["section1", "section2"]);

        if(!normalizedTitle || !normalizedSection){
            return NextResponse.json({ error: "Title and section are required" }, { status: 400 });
        }

        if (!allowedSections.has(normalizedSection)) {
            return NextResponse.json({ error: "Invalid section selected" }, { status: 400 });
        }

        const docRef = await adminDb.collection("questionBanks").add({
            title: normalizedTitle,
            section: normalizedSection,
            questionCount: 0,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json(
            {
                success: true,
                id: docRef.id,
            }
        );
    }catch(error){
        console.error("Create bank error:", error);
        const message =
          error instanceof Error && error.message
            ? `Failed to create question bank: ${error.message}`
            : "Failed to create question bank";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
