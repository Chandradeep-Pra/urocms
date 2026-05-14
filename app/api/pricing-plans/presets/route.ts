import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { frcsPricingPresets } from "@/lib/pricingPresets";
import { requireAdminSession } from "@/lib/server/adminAccess";

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const batch = adminDb.batch();

    for (const preset of frcsPricingPresets) {
      const existing = await adminDb
        .collection("pricingPlans")
        .where("presetKey", "==", preset.presetKey)
        .limit(1)
        .get();

      const ref = existing.empty
        ? adminDb.collection("pricingPlans").doc()
        : existing.docs[0].ref;

      batch.set(
        ref,
        {
          presetKey: preset.presetKey,
          name: preset.name,
          category: preset.category,
          description: preset.description,
          tag: preset.tag ?? "",
          price: preset.price,
          expiryMonths: preset.expiryMonths,
          durationLabel: preset.durationLabel ?? "",
          billingLabel: preset.billingLabel ?? "",
          availabilityNote: preset.availabilityNote ?? "",
          featureBullets: preset.featureBullets,
          sortOrder: preset.sortOrder,
          currency: "GBP",
          isActive: true,
          selectedContent: {
            chapterIds: [],
            videoIds: [],
            quizIds: [],
            mockIds: [],
            vivaCaseIds: [],
          },
          accessScopes: {
            chapterGroupIds: [],
            videoSectionIds: [],
            vivaFolderIds: [],
          },
          contentCounts: {
            chapters: 0,
            videos: 0,
            quizzes: 0,
            mocks: 0,
            vivaCases: 0,
            total: 0,
          },
          vivaMinutes: preset.vivaMinutes ?? 0,
          updatedAt: FieldValue.serverTimestamp(),
          ...(existing.empty ? { createdAt: FieldValue.serverTimestamp() } : {}),
        },
        { merge: true }
      );
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      imported: frcsPricingPresets.length,
    });
  } catch (error) {
    console.error("Pricing presets seed error:", error);
    return NextResponse.json({ error: "Failed to import FRCS pricing presets" }, { status: 500 });
  }
}
