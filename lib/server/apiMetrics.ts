import { NextResponse } from "next/server";

type JsonResponseOptions = {
  status?: number;
  headers?: HeadersInit;
  route: string;
  method?: string;
  startedAt: number;
  userId?: string | null;
  itemCount?: number | null;
};

export const CACHE_HEADERS = {
  publicContent: "public, s-maxage=3600, stale-while-revalidate=86400",
  privateNoStore: "private, no-store",
} as const;

function shouldLogApiMetrics() {
  return process.env.API_DEBUG_METRICS === "true";
}

function getJsonByteSize(payload: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(payload), "utf8");
  } catch {
    return null;
  }
}

export function jsonWithApiMetrics(
  payload: unknown,
  options: JsonResponseOptions
) {
  const status = options.status ?? 200;
  const byteSize = getJsonByteSize(payload);
  const durationMs = Math.round(performance.now() - options.startedAt);

  if (shouldLogApiMetrics()) {
    console.log("[api-metrics]", {
      method: options.method ?? "GET",
      route: options.route,
      status,
      durationMs,
      responseBytes: byteSize,
      userId: options.userId ?? undefined,
      itemCount: options.itemCount ?? undefined,
    });
  }

  return NextResponse.json(payload, {
    status,
    headers: options.headers,
  });
}

export function privateJsonResponse(
  payload: unknown,
  options: Omit<JsonResponseOptions, "headers">
) {
  return jsonWithApiMetrics(payload, {
    ...options,
    headers: {
      "Cache-Control": CACHE_HEADERS.privateNoStore,
    },
  });
}

export function publicJsonResponse(
  payload: unknown,
  options: Omit<JsonResponseOptions, "headers">
) {
  return jsonWithApiMetrics(payload, {
    ...options,
    headers: {
      "Cache-Control": CACHE_HEADERS.publicContent,
    },
  });
}
