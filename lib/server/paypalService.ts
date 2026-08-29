type PayPalMoney = { currency_code: string; value: string };

export class PayPalError extends Error {
  constructor(message: string, public status = 502, public details?: unknown) {
    super(message);
  }
}

function config() {
  const mode = process.env.PAYPAL_MODE?.trim().toLowerCase() || "sandbox";
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new PayPalError("PayPal is not configured", 503);
  return {
    clientId,
    clientSecret,
    baseUrl: mode === "live" || mode === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com",
  };
}

async function accessToken() {
  const { clientId, clientSecret, baseUrl } = config();
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    console.error("PayPal authentication failed", { status: response.status });
    throw new PayPalError("Unable to authenticate with PayPal", 502);
  }
  return { token: String(body.access_token), baseUrl };
}

async function paypalFetch(path: string, init: RequestInit = {}) {
  const { token, baseUrl } = await accessToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("PayPal API request failed", { path, status: response.status, debugId: body.debug_id });
    throw new PayPalError("PayPal could not process the request", response.status >= 500 ? 502 : 409, body);
  }
  return body;
}

export async function createPayPalOrder(input: {
  amount: PayPalMoney;
  purchaseId: string;
  description: string;
}) {
  return paypalFetch("/v2/checkout/orders", {
    method: "POST",
    headers: { "PayPal-Request-Id": input.purchaseId },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: input.purchaseId,
        custom_id: input.purchaseId,
        description: input.description.slice(0, 127),
        amount: input.amount,
      }],
    }),
  });
}

export async function getPayPalOrder(orderId: string) {
  return paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
}

export async function capturePayPalOrder(orderId: string, requestId: string) {
  return paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: { "PayPal-Request-Id": requestId },
    body: "{}",
  });
}
