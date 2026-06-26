import { getMockDetails } from "@/lib/server/mockService";
import { CACHE_HEADERS, jsonWithApiMetrics, publicJsonResponse } from "@/lib/server/apiMetrics";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = performance.now();
  try {
    const { id } = await context.params;
    const mock = await getMockDetails(id);

    if (mock.accessType !== "public") {
      return jsonWithApiMetrics(
        { error: "This mock is not publicly available." },
        {
          status: 404,
          route: "/api/public/mocks/[id]",
          method: "GET",
          startedAt,
          headers: {
            "Cache-Control": CACHE_HEADERS.privateNoStore,
          },
        }
      );
    }

    return publicJsonResponse(
      { mock },
      {
        route: "/api/public/mocks/[id]",
        method: "GET",
        startedAt,
        itemCount: Array.isArray(mock.questions) ? mock.questions.length : null,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch public mock";
    const status = message === "Mock not found" ? 404 : 500;
    console.error("Public mock fetch error:", error);
    return jsonWithApiMetrics(
      { error: message },
      {
        status,
        route: "/api/public/mocks/[id]",
        method: "GET",
        startedAt,
        headers: {
          "Cache-Control": CACHE_HEADERS.privateNoStore,
        },
      }
    );
  }
}
