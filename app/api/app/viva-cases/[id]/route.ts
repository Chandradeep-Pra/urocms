import { NextRequest, NextResponse } from "next/server";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import { requireAppUser } from "@/lib/server/appSession";
import {
  getPublicVivaCaseById,
  getVivaCaseById,
} from "@/lib/server/vivaService";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const vivaCase = await getVivaCaseById(id);
    const accessContext = await buildAppContentAccessContext(auth.user);
    const access = accessContext.getVivaAccess({
      id,
      folderId: vivaCase?.folderId ? String(vivaCase.folderId) : null,
      accessType: vivaCase?.accessType === "public" ? "public" : "restricted",
    });

    if (!access.allowed || access.mode === "locked") {
      return NextResponse.json(
        {
          error: access.reason || "Viva case is not included in your current courses",
        },
        { status: 403 }
      );
    }

    const publicCase =
      vivaCase?.accessType === "public"
        ? await getPublicVivaCaseById(id).catch(() => null)
        : null;

    return NextResponse.json({
      case: publicCase ?? vivaCase,
      access: {
        tier: auth.user.tier,
        allowed: true,
        mode: access.mode,
        reason: access.reason,
        courseIds: access.courseIds,
      },
      vivaCredit: accessContext.vivaCredit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch viva case";
    console.error("App viva case fetch error:", error);
    return NextResponse.json(
      { error: message },
      { status: message === "Case not found" ? 404 : 500 }
    );
  }
}
