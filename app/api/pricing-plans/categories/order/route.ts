import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { updatePricingCategorySortOrder } from "@/lib/server/pricingService";

export async function PATCH(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const body = await req.json();
    const category = String(body?.category ?? "").trim();
    const categorySortOrder = Number(body?.categorySortOrder);
    await updatePricingCategorySortOrder(category, categorySortOrder);
    revalidatePath("/pricing");
    return NextResponse.json({ success: true, category, categorySortOrder });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update category order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
