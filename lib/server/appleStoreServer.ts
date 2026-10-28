import "server-only";
import { createPrivateKey } from "node:crypto";
import {
  AppStoreServerAPIClient, APIException, Environment, SignedDataVerifier, VerificationException, VerificationStatus,
  Type, type JWSTransactionDecodedPayload, type ConsumptionRequest,
} from "@apple/app-store-server-library";
import { appleRootCertificates } from "./appleRootCertificates";

export class ApplePaymentError extends Error {
  constructor(public readonly code: string, public readonly status = 400) { super(code); }
}
export const appleBundleId = "com.urologics.app";
export const appleAppId = 6777512648;
export const appleSecurityReady = () => process.env.APPLE_IAP_SECURITY_READY === "true";
export const isTransactionId = (value: unknown): value is string => typeof value === "string" && /^\d{1,30}$/.test(value);
export const isProductId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9._-]{1,100}$/.test(value);
export const sandboxAllowed = (uid: string) => (process.env.APPLE_SANDBOX_USER_IDS || "").split(",").map(v => v.trim()).filter(Boolean).includes(uid);
export const transactionKey = (environment: string, id: string) => `${environment === Environment.PRODUCTION ? "production" : "sandbox"}_${id}`;

export async function bounded<T>(operation: Promise<T>, milliseconds = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ApplePaymentError("APPLE_UNAVAILABLE", 503)), milliseconds);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}
const verifiers = new Map<Environment, SignedDataVerifier>();
function verifier(environment: Environment) {
  let value = verifiers.get(environment);
  if (!value) {
    value = new SignedDataVerifier(appleRootCertificates, true, environment, appleBundleId, appleAppId);
    verifiers.set(environment, value);
  }
  return value;
}
export function assertAppleConfigured() {
  if (!appleSecurityReady() || !process.env.APPLE_IAP_PRIVATE_KEY?.trim() || !process.env.APPLE_IAP_KEY_ID?.trim() || !process.env.APPLE_IAP_ISSUER_ID?.trim()) throw new ApplePaymentError("APPLE_NOT_CONFIGURED", 503);
  try {
    const key = createPrivateKey(process.env.APPLE_IAP_PRIVATE_KEY.replace(/\\n/g, "\n"));
    if (key.asymmetricKeyType !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "prime256v1"
      || !/^[A-Z0-9]{10}$/.test(process.env.APPLE_IAP_KEY_ID.trim())
      || !/^[0-9a-f-]{36}$/i.test(process.env.APPLE_IAP_ISSUER_ID.trim())) throw new Error();
  } catch { throw new ApplePaymentError("APPLE_NOT_CONFIGURED", 503); }
}
function client(environment: Environment) {
  assertAppleConfigured();
  const key = process.env.APPLE_IAP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const keyId = process.env.APPLE_IAP_KEY_ID?.trim();
  const issuerId = process.env.APPLE_IAP_ISSUER_ID?.trim();
  if (!key || !keyId || !issuerId) throw new ApplePaymentError("APPLE_NOT_CONFIGURED", 503);
  return new AppStoreServerAPIClient(key, keyId, issuerId, appleBundleId, environment);
}
function isRetryableVerification(error: unknown) {
  return error instanceof ApplePaymentError && error.status === 503
    || error instanceof VerificationException && error.status === VerificationStatus.RETRYABLE_VERIFICATION_FAILURE;
}

/** Only call on data already verified by Apple's SignedDataVerifier. */
export function validateAppleTransaction(data: JWSTransactionDecodedPayload, id: string, productId: string, allowSandbox: boolean) {
  if (data.bundleId !== appleBundleId || data.transactionId !== id || data.productId !== productId
    || data.type !== Type.NON_RENEWING_SUBSCRIPTION || data.inAppOwnershipType !== "PURCHASED"
    || ![Environment.PRODUCTION, ...(allowSandbox ? [Environment.SANDBOX] : [])].includes(data.environment as Environment)) {
    throw new ApplePaymentError("INVALID_APPLE_TRANSACTION", 403);
  }
  if (!Number.isSafeInteger(data.purchaseDate) || data.purchaseDate! <= 0 || data.purchaseDate! > Date.now() + 300000
    || !Number.isSafeInteger(data.signedDate) || data.signedDate! <= 0 || data.signedDate! > Date.now() + 300000
    || !isTransactionId(data.originalTransactionId) || !data.appAccountToken
    || !Number.isSafeInteger(data.price) || data.price! <= 0 || !/^[A-Z]{3}$/.test(data.currency || "")) {
    throw new ApplePaymentError("INVALID_APPLE_TRANSACTION", 403);
  }
  return data;
}

/** Resolve current transaction state from Apple; never trust the client's receipt or success flag. */
export async function fetchAppleTransaction(id: string, productId: string, userId: string) {
  if (!isTransactionId(id) || !isProductId(productId)) throw new ApplePaymentError("INVALID_PURCHASE", 400);
  for (const environment of [Environment.PRODUCTION, ...(sandboxAllowed(userId) ? [Environment.SANDBOX] : [])]) {
    let signed: string | undefined;
    try {
      signed = (await bounded(client(environment).getTransactionInfo(id))).signedTransactionInfo;
    } catch (error) {
      if (error instanceof APIException && error.httpStatusCode === 404) continue;
      if (error instanceof ApplePaymentError) throw error;
      throw new ApplePaymentError("APPLE_UNAVAILABLE", 503);
    }
    if (!signed) throw new ApplePaymentError("INVALID_APPLE_TRANSACTION", 403);
    let decoded: JWSTransactionDecodedPayload;
    try { decoded = await bounded(verifier(environment).verifyAndDecodeTransaction(signed)); }
    catch (error) {
      if (isRetryableVerification(error)) throw new ApplePaymentError("APPLE_UNAVAILABLE", 503);
      throw new ApplePaymentError("INVALID_APPLE_SIGNATURE", 403);
    }
    return validateAppleTransaction(decoded, id, productId, sandboxAllowed(userId));
  }
  throw new ApplePaymentError("APPLE_TRANSACTION_NOT_FOUND", 404);
}

export async function verifyAppleNotification(signedPayload: string) {
  for (const environment of [Environment.PRODUCTION, Environment.SANDBOX]) {
    try {
      const decoded = await bounded(verifier(environment).verifyAndDecodeNotification(signedPayload));
      if (!decoded.notificationUUID || !/^[A-Za-z0-9-]{1,100}$/.test(decoded.notificationUUID)
        || !Number.isSafeInteger(decoded.signedDate) || decoded.signedDate! > Date.now() + 300000) {
        throw new ApplePaymentError("INVALID_APPLE_NOTIFICATION", 400);
      }
      const signed = decoded.data?.signedTransactionInfo;
      const transaction = signed ? await bounded(verifier(environment).verifyAndDecodeTransaction(signed)) : null;
      return { notification: decoded, transaction, environment };
    } catch (error) {
      if (isRetryableVerification(error)) throw new ApplePaymentError("APPLE_UNAVAILABLE", 503);
    }
  }
  throw new ApplePaymentError("INVALID_APPLE_SIGNATURE", 403);
}

export async function sendAppleConsumption(environment: Environment, id: string, consumption: ConsumptionRequest) {
  await bounded(client(environment).sendConsumptionInformation(id, consumption));
}
