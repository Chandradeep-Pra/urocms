import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = normalizeText(body.name);
    const email = normalizeText(body.email).toLowerCase();
    const country = normalizeText(body.country);
    const phone = normalizeText(body.phone);
    const title = normalizeText(body.title);
    const currentInstitute = normalizeText(body.currentInstitute);
    const note = normalizeText(body.note);

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: "Name, email, and number are required" },
        { status: 400 }
      );
    }

    const payload = {
      name,
      email,
      country,
      phone,
      title,
      currentInstitute,
      note,
      source: "landing-page",
      createdAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection("joinlist").add(payload);

    return NextResponse.json({
      success: true,
      id: docRef.id,
    });
  } catch (error) {
    console.error("Joinlist error:", error);
    return NextResponse.json(
      { error: "Failed to join waitlist" },
      { status: 500 }
    );
  }
}
