# React Native Coupon Integration

This integration verifies that a coupon is attached to the selected plan and calculates the discounted price. Only one coupon can be applied at a time.

## 1. Types

```ts
export type CouponSuccess = {
  applied: true;
  message: "Coupon Applied";
  platform: "mobile";
  plan: {
    id: string;
    name: string;
  };
  version: {
    id: string;
    months: number;
  };
  coupon: {
    id: string;
    code: string;
    description: string;
    discountType: "percent" | "amount";
    discountValue: number;
  };
  pricing: {
    currency: string;
    originalPrice: number;
    discountAmount: number;
    discountedPrice: number;
  };
};

export type CouponFailure = {
  message: "Coupon cannot be applied, please try again";
};
```

## 2. Verify a coupon

```ts
const API_URL = "https://urologics.co.uk";

export async function verifyMobileCoupon(input: {
  planId: string;
  versionId: string;
  couponCode: string;
}): Promise<CouponSuccess | CouponFailure> {
  const response = await fetch(`${API_URL}/api/verify-coupon-mob`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    return data as CouponFailure;
  }

  return data as CouponSuccess;
}
```

Usage:

```ts
const result = await verifyMobileCoupon({
  planId: selectedPlan.id,
  versionId: selectedVersion.id,
  couponCode: couponCode.trim(),
});

if ("applied" in result && result.applied) {
  setAppliedCoupon(result.coupon);
  setCheckoutPrice(result.pricing.discountedPrice);
  Alert.alert("Coupon Applied", `You saved £${result.pricing.discountAmount}`);
} else {
  setAppliedCoupon(null);
  setCheckoutPrice(selectedVersion.price);
  Alert.alert("Coupon", result.message);
}
```

When a user enters another coupon, replace the previous result. Do not combine coupon discounts in the app.

## 3. Raise a payment query

Show a **Raise Query** button in the payment-help section when needed.

```ts
export async function raisePaymentQuery(input: {
  name: string;
  email: string;
  query: string;
  planId: string;
  couponCode?: string;
}) {
  const response = await fetch(`${API_URL}/api/payment-queries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...input,
      platform: "mobile",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Unable to raise payment query");
  }

  return data;
}
```

Example:

```ts
const result = await raisePaymentQuery({
  name: user.name,
  email: user.email,
  query: paymentQuery,
  planId: selectedPlan.id,
  couponCode,
});

Alert.alert("Query Submitted", `Reference: ${result.queryId}`);
```

The API retrieves the plan and coupon names from Firestore, saves the query for the UROCMS admin Notifications screen, and emails a confirmation to the supplied address.

## 4. Recommended checkout state

Keep these values in the checkout screen:

```ts
const [couponCode, setCouponCode] = useState("");
const [appliedCoupon, setAppliedCoupon] = useState<CouponSuccess["coupon"] | null>(null);
const [checkoutPrice, setCheckoutPrice] = useState(selectedVersion.price);
const [verifyingCoupon, setVerifyingCoupon] = useState(false);
```

Always use the price returned by the verification API after a successful verification. Re-verify the coupon immediately before creating or opening the final payment checkout.
