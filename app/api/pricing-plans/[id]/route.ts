import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

type PlanSelection = {
  chapterIds: string[];
  videoIds: string[];
  quizIds: string[];
  mockIds: string[];
  vivaCaseIds: string[];
};

function normalizeSelection(selection: Partial<PlanSelection> | undefined): PlanSelection {
  return {
    chapterIds: Array.isArray(selection?.chapterIds) ? selection!.chapterIds : [],
    videoIds: Array.isArray(selection?.videoIds) ? selection!.videoIds : [],
    quizIds: Array.isArray(selection?.quizIds) ? selection!.quizIds : [],
    mockIds: Array.isArray(selection?.mockIds) ? selection!.mockIds : [],
    vivaCaseIds: Array.isArray(selection?.vivaCaseIds) ? selection!.vivaCaseIds : [],
  };
}

function countSelection(selection: PlanSelection) {
  return {
    chapters: selection.chapterIds.length,
    videos: selection.videoIds.length,
    quizzes: selection.quizIds.length,
    mocks: selection.mockIds.length,
    vivaCases: selection.vivaCaseIds.length,
    total:
      selection.chapterIds.length +
      selection.videoIds.length +
      selection.quizIds.length +
      selection.mockIds.length +
      selection.vivaCaseIds.length,
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const tag = String(body.tag ?? "").trim();
    const price = Number(body.price ?? 0);
    const expiryMonths = Number(body.expiryMonths ?? 0);
    const selection = normalizeSelection(body.selectedContent);

    if (!name) {
      return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Price must be a valid number" }, { status: 400 });
    }

    if (!Number.isFinite(expiryMonths) || expiryMonths <= 0) {
      return NextResponse.json({ error: "Expiry months must be greater than 0" }, { status: 400 });
    }

    await adminDb.collection("pricingPlans").doc(id).update({
      name,
      description,
      tag,
      price,
      expiryMonths,
      currency: "GBP",
      isActive: body.isActive !== false,
      selectedContent: selection,
      contentCounts: countSelection(selection),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pricing plan update error:", error);
    return NextResponse.json({ error: "Failed to update pricing plan" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await adminDb.collection("pricingPlans").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pricing plan delete error:", error);
    return NextResponse.json({ error: "Failed to delete pricing plan" }, { status: 500 });
  }
}
