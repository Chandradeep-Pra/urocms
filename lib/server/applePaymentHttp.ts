import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { ApplePaymentError } from "./appleStoreServer";

/** Read with a hard byte limit, including requests without Content-Length. */
export async function readAppleJson(request: Request, maxBytes = 16384): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ApplePaymentError("JSON_REQUIRED", 415);
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new ApplePaymentError("REQUEST_TOO_LARGE", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApplePaymentError("INVALID_REQUEST", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new ApplePaymentError("REQUEST_TOO_LARGE", 413); }
      chunks.push(value);
    }
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApplePaymentError) throw error;
    throw new ApplePaymentError("INVALID_REQUEST", 400);
  } finally { reader.releaseLock(); }
}

/** Firestore makes limits effective across all server instances. TTL cleanup may remove expired records. */
export async function limitAppleRequests(userId: string, action: string, maximum = 30) {
  const minute = Math.floor(Date.now() / 60000);
  const id = createHash("sha256").update(`${action}:${userId}:${minute}`).digest("hex");
  const ref = getAdminDb().collection("appleRequestLimits").doc(id);
  await getAdminDb().runTransaction(async tx => {
    const snap = await tx.get(ref);
    const count = Number(snap.data()?.count || 0);
    if (count >= maximum) throw new ApplePaymentError("TOO_MANY_REQUESTS", 429);
    tx.set(ref, { count: count + 1, expiresAt: new Date((minute + 10) * 60000) });
  });
}
export function appleErrorResponse(error: unknown) {
  const known = error instanceof ApplePaymentError;
  const code = known ? error.code : "APPLE_UNAVAILABLE";
  const status = known ? error.status : 503;
  // Do not log receipts, signed payloads, credentials, email addresses, or provider error bodies.
  console.warn("apple_payment_failure", { code, status });
  return NextResponse.json({ error: status === 503 ? "Purchase verification is temporarily unavailable. Your purchase has not been lost; please retry or restore purchases." : code, code },
    { status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) } });
}
