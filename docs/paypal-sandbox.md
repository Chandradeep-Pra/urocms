# PayPal Checkout setup

## Environment

Configure only these PayPal variables on the server:

```dotenv
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
```

Only `PAYPAL_CLIENT_ID` is returned to the browser. Never expose the client secret or create a `NEXT_PUBLIC_` secret variable. The client ID and secret must come from the same PayPal Sandbox REST app.

## Firestore schema

No backfill is required. Checkout creates these collections on demand:

- `purchases`: purchase snapshots and lifecycle status.
- `paypalOrders`: documents keyed by PayPal order ID, enforcing order uniqueness.
- `paypalCaptures`: documents keyed by PayPal capture ID, preventing reuse.
- `courseEntitlements`: documents keyed by `{userId}_{courseId}`, with active status and access dates.

The current queries use Firestore's automatic single-field indexes, so no composite-index deployment is required.

## End-to-end £1 Sandbox test

1. In Firestore, create or select an active course.
2. Create an active pricing plan with a version priced at `1.00`, a positive duration, and that course ID in `accessScopes.courseIds`. Do not apply a coupon for this test.
3. Add the three Sandbox environment variables and restart or redeploy the app.
4. Sign in as a normal test user, open `/pricing`, select the £1 plan, and continue to `/checkout`.
5. Click the PayPal button and approve with a PayPal Sandbox personal buyer account. Do not use the Sandbox business merchant account as the buyer.
6. Wait for “Payment successful.” Confirm one `purchases` record is `COMPLETED`, one matching `paypalCaptures` record exists, and `{userId}_{courseId}` in `courseEntitlements` has `status: ACTIVE` and a future `accessEndsAt`.
7. Confirm the user can access the course and receives one confirmation email. Replay the capture request and verify that expiry and email are not duplicated.
8. Verify user history with `GET /api/purchases` using the same Firebase bearer token. Verify admin history with `GET /api/admin/purchases` using an allowed admin token.

## Switching to Live later

Change `PAYPAL_MODE=live`, replace the client ID and secret with credentials from the same live PayPal app, restart/redeploy, and run a low-value real transaction. The service automatically changes its API base from `https://api-m.sandbox.paypal.com` to `https://api-m.paypal.com`.

## Future webhook work

Webhook support is intentionally excluded from this phase. A later implementation should add a signature-verified webhook endpoint, a PayPal webhook ID environment variable, event-ID deduplication, denial/refund handling, and call the existing transactional `completePurchase` function for completed captures.
