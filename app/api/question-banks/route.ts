// Get route

import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("questionBanks")
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    const banks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ banks });

  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch banks" },
      { status: 500 }
    );
  }
}

// Post route
export async function POST(req: NextRequest) {
    try{
        const { title, section } = await req.json();

        if(!title || !section){
            return NextResponse.json({ error: "Title and section are required" }, { status: 400 });
        }

        const docRef = await adminDb.collection("questionBanks").add({
            title,
            section,
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
        return new Response(JSON.stringify({ error: "Failed to create question bank" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        }); 
    }
}