export type ApplePlanPricing = {
  enabled: boolean;
  price: number | null;
  currency: "GBP";
  productId: string;
};

export function parseApplePlanPricing(value: unknown): ApplePlanPricing {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    enabled: data.enabled === true,
    price: data.price === null || data.price === undefined || String(data.price).trim() === "" ? null : Number(data.price),
    currency: "GBP",
    productId: String(data.productId ?? "").trim(),
  };
}

export function validateApplePlanPricing(apple: ApplePlanPricing): string | null {
  if (apple.price !== null && (!Number.isFinite(apple.price) || apple.price < 0)) {
    return "iOS price must be a non-negative number";
  }
  if (apple.productId && !/^[A-Za-z0-9._-]{1,255}$/.test(apple.productId)) {
    return "App Store product ID must contain only letters, numbers, dots, hyphens or underscores";
  }
  if (apple.enabled && (apple.price === null || !apple.productId)) {
    return "An iOS price and App Store product ID are required to enable an Apple plan version";
  }
  return null;
}
