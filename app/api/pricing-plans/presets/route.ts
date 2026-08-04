import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { importPricingPresets } from "@/lib/server/pricingService";

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const result = await importPricingPresets();
    revalidatePath("/pricing");
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Pricing presets seed error:", error);
    return NextResponse.json({ error: "Failed to import FRCS pricing presets" }, { status: 500 });
  }
}
