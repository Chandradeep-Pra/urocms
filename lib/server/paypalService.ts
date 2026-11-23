import "server-only";

import { createHash } from "node:crypto";

export class PayPalError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}
export type PayPalCapture = { id: string; status: string; amount: { currency_code: string; value: string }; create_time?: string; update_time?: string; final_capture?: boolean };
export type PayPalOrder = {
  id: string; status: string; create_time?: string;
  purchase_units?: Array<{ reference_id?: string; custom_id?: string; payee?: { merchant_id?: string }; amount?: { currency_code: string; value: string };
    payments?: { captures?: PayPalCapture[]; refunds?: Array<{ id: string; status: string; amount: { currency_code: string; value: string }; create_time?: string }> } }>;
};
export function paypalEnvironment(): "sandbox" | "live" {
  const configured = process.env.PAYPAL_MODE?.trim().toLowerCase() || "sandbox";
  const mode = configured === "production" ? "live" : configured;
  if (mode !== "sandbox" && mode !== "live") throw new PayPalError("INVALID_PAYPAL_MODE", 503);
  return mode;
}
export function paypalSandboxAllowed() {
  return paypalEnvironment() === "sandbox";
}
export function paypalConfig() {
  const environment = paypalEnvironment();
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim(), clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  if (!clientId || !clientSecret) throw new PayPalError("PAYPAL_NOT_READY", 503);
  // Bind attempts to the configured app without requiring a separately entered merchant ID.
  const accountKey = createHash("sha256").update(`${environment}:${clientId}`).digest("hex");
  return { environment, clientId, clientSecret, accountKey, webhookId,
    payLaterEnabled: process.env.PAYPAL_PAY_LATER_ENABLED?.trim().toLowerCase() !== "false",
    baseUrl: environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com" };
}
export function paypalPublicConfig() {
  try {
    const config = paypalConfig();
    return { enabled: true, environment: config.environment, clientId: config.clientId, payLaterEnabled: config.payLaterEnabled };
  } catch { return { enabled: false, environment: "sandbox" as const, clientId: "", payLaterEnabled: false }; }
}
let cachedToken: { key: string; token: string; expires: number } | undefined;
async function accessToken() {
  const config = paypalConfig(), key = `${config.environment}:${config.clientId}:${config.clientSecret}`;
  if (cachedToken?.key === key && cachedToken.expires > Date.now() + 60000) return { token: cachedToken.token, baseUrl: config.baseUrl };
  try {
    const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, { method: "POST", headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded",
    }, body: "grant_type=client_credentials", cache: "no-store", signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    if (!response.ok || typeof body.access_token !== "string") throw new PayPalError("PAYPAL_AUTHENTICATION_FAILED", 503);
    cachedToken = { key, token: body.access_token, expires: Date.now() + Math.min(Number(body.expires_in) || 300, 28800) * 1000 };
    return { token: cachedToken.token, baseUrl: config.baseUrl };
  } catch (error) { if (error instanceof PayPalError) throw error; throw new PayPalError("PAYPAL_UNAVAILABLE", 503); }
}
export async function paypalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token, baseUrl } = await accessToken();
  try {
    const response = await fetch(`${baseUrl}${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers } });
    const body = await response.json();
    if (!response.ok) throw new PayPalError(response.status === 404 ? "PAYPAL_RESOURCE_NOT_FOUND" : "PAYPAL_REQUEST_FAILED", response.status >= 500 ? 503 : 409);
    return body as T;
  } catch (error) { if (error instanceof PayPalError) throw error; throw new PayPalError("PAYPAL_UNAVAILABLE", 503); }
}
export function createPayPalOrder(input: { amount: { currency_code: string; value: string }; purchaseId: string; description: string }) {
  paypalConfig();
  return paypalFetch<PayPalOrder>("/v2/checkout/orders", { method: "POST", headers: { "PayPal-Request-Id": input.purchaseId, Prefer: "return=representation" },
    body: JSON.stringify({ intent: "CAPTURE", purchase_units: [{ reference_id: input.purchaseId, custom_id: input.purchaseId, description: input.description.slice(0, 127),
      amount: input.amount }], payment_source: { paypal: { experience_context: { shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" } } } }) });
}
export const getPayPalOrder = (id: string) => paypalFetch<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(id)}`);
export const getPayPalCapture = (id: string) => paypalFetch<PayPalCapture>(`/v2/payments/captures/${encodeURIComponent(id)}`);
export const capturePayPalOrder = (id: string, requestId: string) => paypalFetch<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(id)}/capture`, {
  method: "POST", headers: { "PayPal-Request-Id": requestId, Prefer: "return=representation" }, body: "{}",
});
export async function verifyPayPalWebhook(headers: Headers, event: Record<string, unknown>) {
  const { webhookId } = paypalConfig();
  if (!webhookId) throw new PayPalError("PAYPAL_WEBHOOK_NOT_CONFIGURED", 503);
  const fields = { auth_algo: headers.get("paypal-auth-algo"), cert_url: headers.get("paypal-cert-url"), transmission_id: headers.get("paypal-transmission-id"),
    transmission_sig: headers.get("paypal-transmission-sig"), transmission_time: headers.get("paypal-transmission-time") };
  if (Object.values(fields).some(v => !v || v.length > 1024)) throw new PayPalError("INVALID_WEBHOOK_SIGNATURE", 400);
  let cert: URL; try { cert = new URL(fields.cert_url!); } catch { throw new PayPalError("INVALID_WEBHOOK_SIGNATURE", 400); }
  if (cert.protocol !== "https:" || cert.username || cert.password || cert.port || !["api.paypal.com", "api.sandbox.paypal.com", "api-m.paypal.com", "api-m.sandbox.paypal.com"].includes(cert.hostname)) throw new PayPalError("INVALID_WEBHOOK_SIGNATURE", 400);
  const result = await paypalFetch<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST", body: JSON.stringify({ ...fields, webhook_id: webhookId, webhook_event: event }),
  });
  if (result.verification_status !== "SUCCESS") throw new PayPalError("INVALID_WEBHOOK_SIGNATURE", 400);
}
