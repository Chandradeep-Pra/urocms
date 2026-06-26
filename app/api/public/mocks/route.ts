import { listMocks } from "@/lib/server/mockService";
import { CACHE_HEADERS, jsonWithApiMetrics, publicJsonResponse } from "@/lib/server/apiMetrics";

export async function GET() {
  const startedAt = performance.now();
  try {
    const mocks = (await listMocks()).filter((mock) => mock.accessType === "public");
    return publicJsonResponse(
      { mocks },
      {
        route: "/api/public/mocks",
        method: "GET",
        startedAt,
        itemCount: mocks.length,
      }
    );
  } catch (error) {
    console.error("Public mocks fetch error:", error);
    return jsonWithApiMetrics(
      { error: "Failed to fetch public mocks" },
      {
        status: 500,
        route: "/api/public/mocks",
        method: "GET",
        startedAt,
        headers: {
          "Cache-Control": CACHE_HEADERS.privateNoStore,
        },
      }
    );
  }
}
