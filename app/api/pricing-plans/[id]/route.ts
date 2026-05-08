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

type PlanAccessScopes = {
  chapterGroupIds: string[];
  videoSectionIds: string[];
  vivaFolderIds: string[];
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

function normalizeAccessScopes(scopes: Partial<PlanAccessScopes> | undefined): PlanAccessScopes {
  return {
    chapterGroupIds: Array.isArray(scopes?.chapterGroupIds) ? scopes.chapterGroupIds : [],
    videoSectionIds: Array.isArray(scopes?.videoSectionIds) ? scopes.videoSectionIds : [],
    vivaFolderIds: Array.isArray(scopes?.vivaFolderIds) ? scopes.vivaFolderIds : [],
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
    const durationLabel = String(body.durationLabel ?? "").trim();
    const billingLabel = String(body.billingLabel ?? "").trim();
    const availabilityNote = String(body.availabilityNote ?? "").trim();
    const category = String(body.category ?? "").trim();
    const sortOrder = Number(body.sortOrder ?? 0);
    const vivaMinutes = Number(body.vivaMinutes ?? 0);
    const featureBullets = Array.isArray(body.featureBullets)
      ? body.featureBullets.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [];
    const selection = normalizeSelection(body.selectedContent);
    const accessScopes = normalizeAccessScopes(body.accessScopes);

    if (!name) {
      return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Price must be a valid number" }, { status: 400 });
    }

    if ((!Number.isFinite(expiryMonths) || expiryMonths <= 0) && !durationLabel) {
      return NextResponse.json(
        { error: "Add a valid expiry in months or a custom duration label" },
        { status: 400 }
      );
    }

    await adminDb.collection("pricingPlans").doc(id).update({
      name,
      description,
      tag,
      price,
      expiryMonths: Number.isFinite(expiryMonths) && expiryMonths > 0 ? expiryMonths : 0,
      durationLabel,
      billingLabel,
      availabilityNote,
      category,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      vivaMinutes: Number.isFinite(vivaMinutes) && vivaMinutes > 0 ? vivaMinutes : 0,
      featureBullets,
      currency: "GBP",
      isActive: body.isActive !== false,
      selectedContent: selection,
      accessScopes,
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
