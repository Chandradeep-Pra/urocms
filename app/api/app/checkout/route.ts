import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";

function isSafeCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  const planId = String(req.nextUrl.searchParams.get("planId") || "").trim();
  const versionId = String(req.nextUrl.searchParams.get("versionId") || "").trim();
  if (!planId || !versionId) {
    return NextResponse.json({ error: "Plan and version are required" }, { status: 400 });
  }

  const planDoc = await getAdminDb().collection("pricingPlans").doc(planId).get();
  if (!planDoc.exists || planDoc.data()?.isActive === false) {
    return NextResponse.json({ error: "Plan is unavailable" }, { status: 404 });
  }

  const plan = planDoc.data() ?? {};
  const versions = Array.isArray(plan.versions) ? plan.versions : [];
  const version = versions.find(
    (item: Record<string, unknown>) => String(item?.id || "") === versionId,
  );
  if (!version) {
    return NextResponse.json({ error: "Plan version is unavailable" }, { status: 404 });
  }

  const checkoutUrl = String(version.embeddedLink || plan.embeddedLink || "").trim();
  if (!checkoutUrl || !isSafeCheckoutUrl(checkoutUrl)) {
    return NextResponse.json({ error: "Checkout is not configured for this plan" }, { status: 409 });
  }

  return NextResponse.json({
    plan: {
      id: planDoc.id,
      name: String(plan.name || "Selected course"),
      description: String(plan.description || ""),
    },
    version: {
      id: String(version.id || ""),
      months: Number(version.months || 0),
      durationLabel: String(version.durationLabel || ""),
      currency: String(plan.currency || "GBP"),
      price: Number(version.discountedPrice ?? version.price ?? 0),
    },
    checkoutUrl,
    user: {
      uid: auth.user.uid,
      email: auth.user.email,
      name: auth.user.name,
    },
  });
}
