# Coupon API Integration

Plans can have multiple eligible coupons, but only one coupon can be applied to a purchase. An optional marketing coupon is displayed automatically on the app or website.

## Verify from React Native

```http
POST /api/verify-coupon-mob
Content-Type: application/json
```

```json
{
  "planId": "PLAN_ID",
  "versionId": "VERSION_ID",
  "couponCode": "WELCOME10"
}
```

## Verify from the website

Use the same request with:

```http
POST /api/verify-coupon-web
```

Successful response:

```json
{
  "applied": true,
  "message": "Coupon Applied",
  "pricing": {
    "currency": "GBP",
    "originalPrice": 199,
    "discountAmount": 19.9,
    "discountedPrice": 179.1
  }
}
```

Failed response:

```json
{
  "message": "Coupon not verified"
}
```

The React Native endpoint always returns this failure. Mobile users should use the payment-query flow. The web endpoint continues to verify eligible coupons.

## Raise a payment query

```http
POST /api/payment-queries
Content-Type: application/json
```

```json
{
  "name": "Student Name",
  "email": "student@example.com",
  "query": "My coupon was accepted but the checkout price did not change.",
  "planId": "PLAN_ID",
  "couponCode": "WELCOME10",
  "platform": "mobile"
}
```
