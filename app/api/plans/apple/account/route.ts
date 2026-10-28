import { NextRequest, NextResponse } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { getAppleAccount, setAppleConsumptionConsent, listApplePurchases } from "@/lib/server/applePurchaseLedger";
import { assertAppleConfigured, ApplePaymentError } from "@/lib/server/appleStoreServer";
import { readAppleJson, limitAppleRequests, appleErrorResponse } from "@/lib/server/applePaymentHttp";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req); if ("response" in auth) return auth.response;
  if (!auth.user.email) return NextResponse.json({ error: "Sign in to view purchases." }, { status: 403 });
  try {
    await limitAppleRequests(auth.user.uid, "purchases", 60);
    const [account, purchases] = await Promise.all([getAppleAccount(auth.user.uid), listApplePurchases(auth.user.uid)]);
    return NextResponse.json({ purchases, consumptionConsent: account.consumptionConsent === true }, { headers });
  } catch (error) { return appleErrorResponse(error); }
}
export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req); if ("response" in auth) return auth.response;
  if (!auth.user.email) return NextResponse.json({ error: "Sign in to purchase." }, { status: 403 });
  try {
    await limitAppleRequests(auth.user.uid, "account");
    assertAppleConfigured();
    const account = await getAppleAccount(auth.user.uid);
    return NextResponse.json({ appAccountToken: account.appAccountToken }, { headers });
  } catch (error) { return appleErrorResponse(error); }
}
export async function PATCH(req: NextRequest) {
  const auth = await requireAppUser(req); if ("response" in auth) return auth.response;
  if (!auth.user.email) return NextResponse.json({ error: "Sign in to change this preference." }, { status: 403 });
  try {
    await limitAppleRequests(auth.user.uid, "consent", 10);
    const body = await readAppleJson(req, 1024);
    if (typeof body.consumptionConsent !== "boolean") throw new ApplePaymentError("INVALID_CONSENT", 400);
    await setAppleConsumptionConsent(auth.user.uid, body.consumptionConsent);
    return NextResponse.json({ consumptionConsent: body.consumptionConsent }, { headers });
  } catch (error) { return appleErrorResponse(error); }
}
