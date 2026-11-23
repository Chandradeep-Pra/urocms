import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { PayPalError } from "./paypalService";

export const paymentJson = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
export async function readPaymentJson(request: Request, maximum = 8192): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new PayPalError("JSON_REQUIRED", 415);
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maximum)) throw new PayPalError("REQUEST_TOO_LARGE", 413);
  const reader = request.body?.getReader(); if (!reader) throw new PayPalError("INVALID_REQUEST", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new PayPalError("REQUEST_TOO_LARGE", 413); }
      chunks.push(value);
    }
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch (error) { if (error instanceof PayPalError) throw error; throw new PayPalError("INVALID_REQUEST", 400); }
  finally { reader.releaseLock(); }
}
export function paymentId(value: unknown, name = "ID") {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new PayPalError(`INVALID_${name}`, 400);
  return value;
}
export async function limitPaymentRequests(uid: string, action: string, maximum = 20) {
  const minute = Math.floor(Date.now() / 60000);
  const id = createHash("sha256").update(`${action}:${uid}:${minute}`).digest("hex");
  const ref = getAdminDb().collection("paypalRequestLimits").doc(id);
  await getAdminDb().runTransaction(async tx => {
    const count = Number((await tx.get(ref)).data()?.count || 0);
    if (count >= maximum) throw new PayPalError("TOO_MANY_REQUESTS", 429);
    tx.set(ref, { count: count + 1, expiresAt: new Date((minute + 10) * 60000) });
  });
}
export function internalPaymentAuthorized(request: Request) {
  const expected = process.env.PAYPAL_RECONCILE_SECRET?.trim() || "", supplied = request.headers.get("x-paypal-reconcile-secret") || "";
  if (expected.length < 32 || supplied.length > 512) return false;
  return timingSafeEqual(createHash("sha256").update(expected).digest(), createHash("sha256").update(supplied).digest());
}
export function paymentErrorResponse(error: unknown) {
  const known = error instanceof PayPalError, code = known ? error.message : "PAYMENT_UNAVAILABLE", status = known ? error.status : 503;
  console.warn("paypal_payment_failure", { code: known ? code : "INTERNAL_ERROR", status });
  const response = paymentJson({ error: status >= 500 ? "Payments are temporarily unavailable. Please retry the same payment or contact support." : code,
    code, pending: status >= 500 || code === "PAYMENT_PENDING" }, status);
  if (status === 429) response.headers.set("Retry-After", "60");
  return response;
}
