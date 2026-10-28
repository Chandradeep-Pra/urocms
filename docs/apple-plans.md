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

### Purchase verification

See [Apple purchase security and rollout](apple-purchase-security.md) for the complete implementation, credentials, notification setup, database rules, testing, and operational requirements.

- POST /api/plans/apple/account: authenticated account binding and configuration preflight. Returns a server-generated appAccountToken UUID, which must be passed to StoreKit before purchase.
- POST /api/plans/apple/verify: authenticated, rate-limited verification. Accepts productId and numeric transactionId. The backend obtains current signed transaction information from Apple, verifies it using Apple's official library, checks ownership against the stored account token, and only then records a completed purchase. Client prices, purchase dates, success flags, and receipt claims are not authoritative.
- GET /api/plans/apple/account: authenticated purchase history and consent preference.
- PATCH /api/plans/apple/account: explicit consumption-information consent or withdrawal.
- POST /api/plans/apple/notifications: public Apple webhook authenticated by Apple's signed payload, not a Firebase bearer token. Handles refund/revocation state, reversals and consented consumption requests.

Access is derived from verified, environment-separated purchase records on authenticated server requests. Duplicate callbacks and restoration do not add access time. Legacy unverified Apple records are excluded and require controlled reconciliation. Existing PayPal and manual membership records are not rewritten by the new Apple fulfillment flow.
