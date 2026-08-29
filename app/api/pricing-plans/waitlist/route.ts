import { NextRequest, NextResponse } from "next/server";
import {
  createPlanMaterialRequest,
  createPricingPlanWaitlistEntry,
  parsePricingPlanWaitlistInput,
  validatePricingPlanWaitlistInput,
} from "@/lib/server/pricingService";
import { requireAppUser } from "@/lib/server/appSession";
import { sendPlanMaterialRequestConfirmationEmail } from "@/lib/server/emailService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.requestType === "course-material") {
      const auth = await requireAppUser(req);
      if ("response" in auth) return auth.response;
      const planId = String(body.planId || "").trim();
      const requestedCourseMaterial = String(body.requestedCourseMaterial || "").trim();
      if (!planId || !requestedCourseMaterial) {
        return NextResponse.json({ error: "Please describe the course material you need" }, { status: 400 });
      }
      if (!auth.user.email) {
        return NextResponse.json({ error: "Your account needs an email address" }, { status: 400 });
      }
      const result = await createPlanMaterialRequest({
        planId,
        userId: auth.user.uid,
        name: auth.user.name?.trim() || "Member",
        email: auth.user.email,
        requestedCourseMaterial,
      });
      try {
        await sendPlanMaterialRequestConfirmationEmail({
          to: auth.user.email,
          name: auth.user.name,
          planName: result.planName,
          requestedCourseMaterial,
          requestId: result.id,
        });
      } catch (emailError) {
        console.error("Plan material request email failed", {
          requestId: result.id,
          error: emailError instanceof Error ? emailError.message : "unknown",
        });
      }
      return NextResponse.json({ success: true, id: result.id });
    }

    const input = parsePricingPlanWaitlistInput(body);
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
