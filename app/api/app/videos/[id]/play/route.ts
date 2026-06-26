import { NextRequest } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { resolvePlayableVideoForUser } from "@/lib/server/appVideoService";
import { privateJsonResponse } from "@/lib/server/apiMetrics";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = performance.now();
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const params = await context.params;
    const result = await resolvePlayableVideoForUser({
      videoId: params.id,
      user: auth.user,
    });

    return privateJsonResponse(result, {
      route: "/api/app/videos/[id]/play",
      method: "GET",
      startedAt,
      userId: auth.user.uid,
    });
  } catch (error: any) {
    const message = error.message || "Failed to prepare video playback";
    const status =
      message === "Video not found"
        ? 404
        : error.status || (message === "Paid access required" ? 403 : 500);

    console.error("App video play error:", error);
    return privateJsonResponse(
      { error: message },
      {
        status,
        route: "/api/app/videos/[id]/play",
        method: "GET",
        startedAt,
        userId: auth.user.uid,
      }
    );
  }
}
