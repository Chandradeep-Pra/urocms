import { NextRequest, NextResponse } from "next/server";
import {
  createPricingPlanWaitlistEntry,
  parsePricingPlanWaitlistInput,
  validatePricingPlanWaitlistInput,
} from "@/lib/server/pricingService";

export async function POST(req: NextRequest) {
  try {
    const input = parsePricingPlanWaitlistInput(await req.json());
    const validationError = validatePricingPlanWaitlistInput(input);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const id = await createPricingPlanWaitlistEntry(input);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Pricing plan waitlist error:", error);
    const message = error instanceof Error ? error.message : "Failed to join waitlist";
    const status = message.includes("not found") || message.includes("only available") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
