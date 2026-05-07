import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("vivaFolders")
      .orderBy("createdAt", "asc")
      .get();

    const folders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("Failed to fetch viva folders:", error);
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body?.title || "").trim();
    const description = String(body?.description || "").trim();

    if (!title) {
      return NextResponse.json({ error: "Folder title is required" }, { status: 400 });
    }

    const duplicate = await adminDb
      .collection("vivaFolders")
      .where("title", "==", title)
      .limit(1)
      .get();

    if (!duplicate.empty) {
      return NextResponse.json({ error: "Folder already exists" }, { status: 409 });
    }

    const docRef = await adminDb.collection("vivaFolders").add({
      title,
      description,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      folder: {
        id: docRef.id,
        title,
        description,
      },
    });
  } catch (error) {
    console.error("Failed to create viva folder:", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
