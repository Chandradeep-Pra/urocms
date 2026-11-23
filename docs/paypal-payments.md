# PayPal Pay Later implementation and activation

The website uses PayPal's one-time Orders v2 checkout. PayPal's branded Pay in 3 finances the buyer; the merchant receives one capture for the full order. There are no merchant-managed subscriptions or installment charges.

Both the main site's `/checkout` and the learner web app's `/web/checkout` use the same attempt, quote and capture contract. The learner app forwards bounded, bearer-authenticated requests to this backend and never accepts a browser payment-success claim as proof of payment.

Standard payments are available when the server has a matching `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`. Set `PAYPAL_MODE=live` for real payments (`production` remains a supported alias), or `sandbox` for test payments. `PAYPAL_PAYMENTS_ENABLED` and `PAYPAL_SECURITY_READY` no longer gate checkout or course access. Never put credentials, webhook IDs or scheduler secrets in public environment variables.

A manually configured merchant ID is not required. Orders omit the payee so PayPal uses the account associated with the authenticated credentials. The server saves PayPal's returned recipient ID and checks it against later order/capture processing. Attempts also retain a fingerprint of the configured app and environment, preventing an attempt from switching between app credentials.

Copy the placeholders from [the server configuration template](paypal.env.example) into the appropriate environment/secrets service.

## Setup to complete in PayPal

1. Configure `PAYPAL_MODE=live` and matching **live** `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` for real payments. For testing, use sandbox mode with matching sandbox credentials instead.
2. Sandbox access is available only while the backend runs in sandbox mode. Live mode ignores sandbox ledger grants; no separate Firebase-project or tester-allowlist flags are required. Prefer a separate Firebase project for sandbox testing.
3. Register the reachable HTTPS webhook URL **`https://YOUR-HOST/api/paypal/webhook`** on the matching live or sandbox REST application, and save its `PAYPAL_WEBHOOK_ID`. Subscribe to:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.DECLINED`
   - `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`
   - `CUSTOMER.DISPUTE.CREATED`, `CUSTOMER.DISPUTE.UPDATED`, `CUSTOMER.DISPUTE.RESOLVED`
4. Protect Firestore client access and review service-account IAM as described below. Webhooks require `PAYPAL_WEBHOOK_ID` from the matching PayPal application; missing webhook configuration does not disable standard checkout.
5. Pay Later defaults to enabled; set `PAYPAL_PAY_LATER_ENABLED=false` to disable it globally. Existing duration versions without a Pay Later field default to enabled; an explicit `false` in Plan Creator disables it for that version. PayPal decides actual merchant and buyer eligibility. The current Pay in 3 flow uses a final GBP total between £20 and £3,000. The SDK's `buyer-country=GB` override is sandbox-only; live mode never forces the buyer's country.
6. Configure a scheduler to POST to **`/api/internal/paypal-reconcile`** every minute using the server-only `x-paypal-reconcile-secret` header. Set its matching `PAYPAL_RECONCILE_SECRET` to a cryptographically random value of at least 32 characters. Calls are bounded batches, safe to repeat. If the traffic regularly fills a batch, increase worker frequency/capacity and alert on backlog age.
7. Complete the real sandbox tests below. Then configure a separate live application/webhook and confirm that the merchant account, website, currency and sector qualify for UK Pay Later. A successful subscription API read is not evidence of Pay Later eligibility.

PayPal's official SDK decides which financing offers are available. A merchant's Pay Later setting controls the dedicated entry point and messaging, not the options PayPal may independently show inside its wallet. Retain the standard checkout alternative. Do not replace PayPal's financing copy, legal links or branded payment button with custom marketing text.

## Data and authority

- `purchases`: server-calculated immutable price/plan snapshot, integer `amountMinor`, currency, owner, environment, receiving merchant, checkout intent, attempt fingerprint, order/capture references, provider payment time, verification time, access period, refund/review state and recovery schedule. `verificationVersion=3` distinguishes this implementation. An unknown create outcome is persisted before calling PayPal; retries use its original request ID, never a new charge attempt.
- `paypalOrders` and `paypalCaptures`: unique order/capture ownership mappings. Capture references cannot be reused by another purchase. A successful browser callback alone does not grant access.
- `paypalRefunds`: verified refund entries keyed by environment and refund ID. Duplicate notifications cannot increment the refund total twice.
- `paypalEvents`: signature-verified, durable webhook inbox with minimal resource identifiers, processing state, attempts, retry time and safe error code. Unrelated valid events are ignored; unrecognized related transactions remain retryable for review. Raw payer/card/contact details are not saved.
- `paypalMailOutbox`: recoverable receipt delivery. SMTP delivery is at least once if a process crashes after sending but before recording success; payment and access completion remain  idempotent.
- `paypalReminders`: customer-owned dates, timezone, dismissal preferences and `source=customer`. These records never change payment or entitlement state.
- `paypalRequestLimits`: shared request counters with `expiresAt`. Configure Firestore TTL on this field to clean up old counters. Enable database backups and appropriate retention for accounting records separately.

`checkoutIntent=paylater` records an untrusted checkout choice, not confirmed financing. `financingStatus=not_available` explicitly avoids claiming that the buyer obtained a Pay in 3 loan. The merchant APIs used here do not expose the buyer's actual loan schedule or repayment status. Dates are supplied and editable by the customer; no scraped credentials, receipts or PayPal consumer sessions are used.

Customer purchase responses use an explicit field allowlist. Financial records are never writable through the reminder endpoint. API responses are private/no-store. The admin purchase API includes payment review flags for operations; it is not a refund initiation endpoint.

`GET /api/pricing-plans` remains compatible with the public web/mobile catalog but returns an explicit public projection and only active, explicitly non-secret coupons. It never returns waitlist details or the private content catalog. Plan Creator requests `?admin=1`, which requires administrator authentication for its full editor payload. The separate coupon administration endpoint requires administrator authentication too.

## Access and refund behavior

New verified PayPal grants are calculated from the server-owned purchase ledger on authenticated requests. They overlay manual/legacy and Apple grants without rewriting those grants. Calendar months clamp to the last valid day. Repeated callbacks cannot add access time.

Full refunds and reversals exclude only the affected grant. Remaining grants are recomputed in payment-date order, so a refunded earlier renewal does not leave its duration behind. Partial refunds and disputes preserve access and flag the purchase for administrator review. A delayed completed event cannot reactivate a refunded/reversed purchase. Legacy purchases remain readable and their existing access is preserved; they are not silently relabelled as version-3 verified payments.

The capture route, verified approval webhook and recovery job can finish an already-approved order. Pending/declined captures never grant access. The creation kill switch stops new orders; webhook verification and recovery of existing captures continue using the matching configured app.

## Database security prerequisite

Review the deployed rules rather than assuming a local file protects the project. This repository does not own the deployed Firestore rules.

All direct client reads/writes must be denied for `paypalOrders`, `paypalCaptures`, `paypalRefunds`, `paypalEvents`, `paypalMailOutbox`, `paypalReminders`, `paypalRequestLimits` and financial `purchases` records. Customers/admins read through authenticated server endpoints. Pricing mutations, course membership and authorization fields must be server-managed as well. Protect `users.tier`, `activePlanId`, `activePlanStatus`, `planExpiresAt`, `activeCourseIds`, identity pointers and admin/source flags. `paypalPlanIds` and `applePlanIds` are derived by the server and never trusted from profile documents.

For example, merge explicit denials for these collections into the project's rules, **and remove any overlapping wildcard allow that would override those denials**. Firestore allows access if any matching rule permits it. Firebase Admin SDK writes use IAM and bypass client rules. Use a dedicated service account with only the necessary database, scheduler and secret access.

## Reminder behavior

After checkout, customers may optionally copy their two upcoming dates from PayPal. They can also manage those dates on the learner Overview in the `testing-zone` web app. The card appears from three local calendar days before a saved date through that date; after the date passes it disappears without labelling the installment overdue. Dates are evaluated in the customer's saved IANA timezone. Dates, dismissals and disabling are owner-authorized; loan amounts and paid/missed statuses are not invented. PayPal remains the source for repayment status and changes.

## Verification and production gate

Automated checks: `node --test tests/paypal-payments.test.cjs`, TypeScript checks and targeted ESLint, plus local browser checks with simulated PayPal/Firebase responses. These tests cannot certify the merchant account, a real Pay in 3 approval, deployed Firestore rules or external webhook delivery.

Before live activation, demonstrate a real sandbox approval/capture, delivered signature-verified webhook, recovery after closing checkout, duplicate event delivery, an actual full/partial refund, and unauthorized client writes rejected by the Firestore rules emulator/deployed rules. Confirm the scheduler drains the inbox/outbox and unresolved attempts. Verify refund/reversal access on an account that also has an independent manual or Apple grant. Monitor the age of unprocessed `paypalEvents`, due `nextReconcileAt` records and `reviewRequired` / `refundReviewRequired` / `disputeReviewRequired` flags. Escalate unknown create outcomes older than five hours rather than creating a replacement automatically.

No purchase was charged and no PayPal account settings or database rules were changed during the compatibility update. The local and production environment files use live mode with Pay Later enabled; live OAuth authentication was verified separately from payment capture.

### Framework security release prerequisite

The backend production build reported a security warning for the existing Next.js 16.4.3 dependency. The learner app currently uses 16.1.1. The [official November 2026 security release](https://nextjs.org/blog/november-2026-security-release) provides fixes in 16.4.5 for the active release line. Upgrade both apps to a supported patched release and rerun their checks before payment activation. Framework dependencies and lockfiles have not been changed by this payment implementation. A successful build retry does not fix these advisories.

## References

- https://developer.paypal.com/sdk/js/v5/configuration
- https://developer.paypal.com/sdk/js/v5/reference/
- https://developer.paypal.com/pay-later/overview
- https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post/
- https://developer.paypal.com/api/rest/webhooks/event-names/
- https://www.paypal.com/uk/cshelp/article/questions-about-pay-in-3-repayments---help1099
