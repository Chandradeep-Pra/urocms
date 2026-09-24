# Apple plan catalog

## Admin setup

In Plan Creator, each duration has a separate Apple / iOS section:

- Available on Apple: explicit opt-in; existing plans remain unpublished on Apple.
- iOS price (GBP): reference price independent of the web price and coupons.
- App Store product ID: exact ID from App Store Connect for this duration.

Save the plan manually. Both a reference price and product ID are required to
publish a duration. The CMS does not create products or change prices in App
Store Connect. Sandbox uses the product information from App Store Connect;
there is no special CMS sandbox product ID.

## Native catalog API

- `GET /api/plans/apple`: `{ platform: "apple", plans: [...] }`
- `GET /api/plans/apple/{planId}`: `{ platform: "apple", plan: {...} }`

These public, read-only endpoints expose active plans with explicitly enabled,
valid Apple versions. Unavailable plans return 404 from the detail endpoint.
Errors return 500, not a misleading empty catalog. Responses are not cached.
Web pricing and checkout APIs are unchanged.

Each plan includes `id`, `name`, `description`, `category`, `categorySortOrder`,
`sortOrder`, `tag`, `featureBullets`, `vivaMinutes`, and `versions`.
Each version includes `id`, `months`, `durationLabel`, `productId`, `price`,
`currency`, `priceSource: "cms-reference"`, and `purchaseProvider: "app-store"`.
Web checkout links, coupon data, private records and content delivery URLs are
not returned.

## Native purchase integration and verification

Fetch StoreKit products using the returned product IDs. Display StoreKit's
localized `displayPrice` and actual subscription terms at purchase time, not
the CMS reference price or web billing label. Products missing from StoreKit
must not have an enabled purchase button. Use StoreKit for purchase and restore,
including pending, cancelled, failed and verified outcomes.

### Purchase verification endpoint: `POST /api/plans/apple/verify`
- Authentication: Required (`requireAppUser`, bearer token)
- Body:
  ```json
  {
    "productId": "com.urologics.app.membership.3m",
    "transactionId": "2000000123456789",
    "transactionDate": 1727179200000,
    "purchaseToken": "optional-jws-or-receipt"
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "alreadyCompleted": false,
    "planId": "frcs-plan",
    "accessEndsAt": "2026-12-24T12:00:00.000Z"
  }
  ```

The server resolves the plan and duration by the verified `productId`, ensures
the transaction is not claimed by another user account, updates the user's tier
to `paid`, attaches the active plan and course entitlements, and records the purchase
in Firestore. After receiving `success: true`, the native client calls `finishTransaction`
to finalize the transaction with Apple.

References:
- https://developer.apple.com/documentation/storekit/product/displayprice
- https://developer.apple.com/help/app-store-connect/test-in-app-purchases/overview-of-testing-in-sandbox
