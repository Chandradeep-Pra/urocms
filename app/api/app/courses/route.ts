import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";

function normalizeCourseAccessTier(value: unknown) {
  return value === "members" ? "members" : value === "paid" ? "members" : "free";
}

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const snapshot = await adminDb
      .collection("courses")
      .where("showOnApp", "==", true)
      .orderBy("createdAt", "asc")
      .get();

    const courses = snapshot.docs
      .map((doc) => {
        const data = doc.data() ?? {};
        const accessTier = normalizeCourseAccessTier(data.accessTier);
        const isAllowed =
          accessTier === "free"
            ? auth.user.tier !== "guest"
            : auth.user.activeCourseIds.includes(doc.id);

        return {
          id: doc.id,
          title: String(data.title || ""),
          description: String(data.description || ""),
          slug: String(data.slug || ""),
          accessTier,
          showOnApp: true,
          sectionCount: Array.isArray(data.sections) ? data.sections.length : 0,
          sections: Array.isArray(data.sections) ? data.sections : [],
          access: {
            allowed: isAllowed,
            required:
              accessTier === "free" ? "free-account" : "course-membership",
          },
        };
      })
      .filter((course) => course.access.allowed);

    return NextResponse.json({
      tier: auth.user.tier,
      activeCourseIds: auth.user.activeCourseIds,
      courses,
    });
  } catch (error) {
    console.error("App courses fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
