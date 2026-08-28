# PayPal Checkout setup

## Environment

Configure these variables on the server (and in `.env.local` for local testing):

```dotenv
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_WEBHOOK_ID=your_sandbox_webhook_id
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Only `PAYPAL_CLIENT_ID` is returned to the browser. Never create a `NEXT_PUBLIC_` secret variable. Switch to production by changing `PAYPAL_MODE=live` and replacing all three PayPal values with live-app values.

## Firestore data

No backfill is required. Checkout creates these collections on demand:

- `purchases`: the PayPal order ID is stored on the purchase; completion is transactional.
- `paypalOrders`: documents are keyed by order ID, enforcing order uniqueness.
- `paypalCaptures`: documents are keyed by capture ID, preventing reuse.
- `paypalWebhookEvents`: documents are keyed by event ID, preventing duplicate webhook work.
- `courseEntitlements`: documents are keyed by `{userId}_{courseId}` and contain server-checked access dates.

The current queries use Firestore's automatic single-field indexes, so there is no composite index deployment step.

## Sandbox webhook

In the PayPal Developer Dashboard, open the Sandbox app, add a webhook pointing to:

`https://YOUR_PUBLIC_ORIGIN/api/paypal/webhook`

Subscribe to `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, and `PAYMENT.CAPTURE.REFUNDED`. Copy its webhook ID to `PAYPAL_WEBHOOK_ID`. Localhost must be exposed through an HTTPS tunnel for PayPal to call it.

## End-to-end £1 test

1. In Firestore, create or select an active course.
2. Create an active pricing plan with currency `GBP`, a version priced at `1.00`, a positive duration, and that course ID in `accessScopes.courseIds`. Do not apply a coupon for this test.
3. Add the Sandbox environment values above and restart the app with `npm run dev`.
4. Sign in as a normal test user, open `/pricing`, select the £1 plan, and continue to `/checkout`.
5. Click the PayPal button and approve with a PayPal Sandbox personal (buyer) account. Do not use the Sandbox business account as the buyer.
6. Wait for “Payment successful.” Confirm one `purchases` record is `COMPLETED`, one matching `paypalCaptures` record exists, and `{userId}_{courseId}` in `courseEntitlements` has a future `accessEndsAt`.
7. Confirm the user can access the course and receives one confirmation email. Refresh/replay the capture request or resend the webhook and verify the expiry and email are not duplicated.
8. Verify history with `GET /api/purchases` using the same Firebase bearer token. Verify admin history with `GET /api/admin/purchases` using an allowed admin token.
