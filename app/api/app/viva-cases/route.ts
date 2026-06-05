import { NextRequest, NextResponse } from "next/server";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import { listVivaCases } from "@/lib/server/vivaService";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const accessContext = await buildAppContentAccessContext(auth.user);
    const allCases = await listVivaCases();
    const cases = allCases.map((item: any) => {
      const access = accessContext.getVivaAccess({
        id: String(item.id),
        folderId: item?.folderId ? String(item.folderId) : null,
        accessType: item?.accessType === "public" ? "public" : "restricted",
      });

      return {
        ...item,
        accessType: item?.accessType === "public" ? "public" : "restricted",
        access: {
          tier: auth.user.tier,
          allowed: access.allowed,
          mode: access.mode,
          requiredTier: access.mode === "locked" ? "course-access" : null,
          reason: access.reason,
          courseGranted: access.courseIds.length > 0,
          isPublic: item?.accessType === "public",
          courseIds: access.courseIds,
        },
      };
    });

    return NextResponse.json({
      tier: auth.user.tier,
      cases,
      vivaCredit: accessContext.vivaCredit,
    });
  } catch (error) {
    console.error("App viva cases fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}
