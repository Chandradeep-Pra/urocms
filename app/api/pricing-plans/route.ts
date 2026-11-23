import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  createPricingPlan,
  loadPricingAdminData,
  loadPublicPricingData,
  parsePricingPlanInput,
  validatePricingPlanInput,
} from "@/lib/server/pricingService";

export async function GET(req: NextRequest) {
  const admin = req.nextUrl.searchParams.get("admin") === "1";
  if (admin) {
    const { response } = await requireAdminSession(req);
    if (response) return response;
  }
  try {
    const data = admin ? await loadPricingAdminData() : await loadPublicPricingData();
    return NextResponse.json(data, { headers: { "Cache-Control": admin ? "private, no-store" : "no-store" } });
  } catch (error) {
    console.error("Pricing plans fetch error:", error);
    return NextResponse.json({ error: "Failed to load pricing plans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const input = parsePricingPlanInput(await req.json());
    const validationError = validatePricingPlanInput(input);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const id = await createPricingPlan(input);
    revalidatePath("/pricing");
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Pricing plan create error:", error);
    const message = error instanceof Error ? error.message : "Failed to create pricing plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
