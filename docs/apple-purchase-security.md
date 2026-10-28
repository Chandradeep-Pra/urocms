# Apple purchase verification and refund rollout

Implementation date: 28 October 2026. Source changes alone do not enable production purchases or establish higher-price eligibility. Complete the configuration and real-device validation below before release.

## Payment and access boundary

StoreKit reports a purchase to the app. The app sends only identifiers as claims; the server fetches current transaction information from Apple's App Store Server API and verifies Apple's certificate chain, signature, bundle, environment, product, purchase type, purchase date and ownership token. Access is granted only from this verified result. A failed/unavailable verification remains retryable and never creates a completed purchase. Finish the StoreKit transaction only after backend success.

The app calls POST /api/plans/apple/account before opening checkout. This prevents starting a new charge when server credentials are absent. It cannot guarantee provider availability after the payment; failed verification can be retried through Restore Purchases.

The installed, exact server-library version is @apple/app-store-server-library 3.1.0. Public Apple root certificates are bundled in appleRootCertificates.ts; no root is accepted from the client. Online certificate checks are enabled. Refresh the dependency and trust anchors as part of maintenance, reviewing changes before updating.

## Server credentials

Create an **In-App Purchase** key in App Store Connect > Users and Access > Integrations > In-App Purchase. Configure the backend's secret store with APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID and APPLE_IAP_PRIVATE_KEY. Keep the private key out of git, mobile builds, public environment variables, logs and client responses. Do not assume the EAS submission API key is an In-App Purchase key.

For sandbox review/TestFlight only, set APPLE_SANDBOX_USER_IDS to the canonical Urologics account IDs used by testers and Apple reviewers. Sandbox records have separate IDs, and provide access only to these explicitly allowlisted users. Production accounts cannot claim sandbox payments. Never globally allow sandbox transactions as production purchases.

APPLE_IAP_SECURITY_READY defaults off. Set it to true only after the database write restrictions are verified and the credentials are installed in an isolated sandbox/test environment. Complete the device tests there before enabling the production deployment. Until the flag is enabled, checkout and Apple-derived access fail closed. This is a security-readiness switch, not a routine response to a temporary Apple outage; existing verified access remains available during provider outages while the switch is enabled.

## App Store Connect

1. Map the two new product IDs to the correct enabled six- and twelve-month plan versions and content scopes. Duplicate active product mappings fail closed. Price records use Apple's verified actual paid amount/currency, not the CMS reference price.
2. After deploying the backend, set **App Information > App Store Server Notifications** production and sandbox URLs to https://urologics.co.uk/api/plans/apple/notifications and select Version 2. Both URLs may use the same endpoint: signed environment and account checks separate them.
3. Send Apple's test notification and confirm successful receipt. Verify a real sandbox purchase, restore, refund and reversal, not only a test event.
4. Update App Privacy disclosures to reflect purchase/account records and optional sharing with Apple, as applicable to the app's full data practices.
5. Upload a new iOS binary containing account-token binding and Profile > Apple Purchases. Existing binaries do not attach these tokens; never bypass account binding to make their purchases appear valid.

## Firestore security rules — release prerequisite

All reads and writes to appleAccounts, appleAccountTokens, appleTransactions, appleNotifications and appleRequestLimits must be server-only. The Firebase Admin SDK uses server IAM, not client rules. The same applies to client writes to purchases, courseEntitlements, pricingPlans, course memberUserIds/memberAccessGrants, and membership fields such as users.tier, activePlanId, activePlanStatus, planExpiresAt and activeCourseIds. Profile updates must be restricted to an explicit allowlist of non-membership fields; identity pointers and authorization/source flags must also remain server-managed. applePlanIds is always derived on the server and never accepted from a profile document.

Merge these restrictions into the actual existing rules, preserving legitimate administrator permissions and other app data. **An overlapping broad allow rule overrides a deny-only snippet**, so adding a deny block beneath an allow-all rule does not protect data. Do not replace the whole ruleset without inspecting the app's legitimate client reads/writes.

The deployment credentials available during implementation could not read the live rules (HTTP 403). No live rules were changed or independently verified. Review them in Firebase Console and test forged direct client writes against an emulator before enabling payments. Do not represent the production system as fully verified until this is complete.

Enable Firestore TTL on appleRequestLimits.expiresAt to clean up short-lived rate-limit counters. The counters enforce limits across server instances; TTL deletion timing is not relied on for correctness. The per-account history limit is 1,000 records and fails closed for manual reconciliation above that threshold.

## Access and refunds

Apple transaction records are namespaced by environment and keyed by Apple's transaction ID. Replays are idempotent; current Apple state is fetched again even for a duplicate verification. Account tokens are server-generated UUIDs and must match Apple's signed transaction. Never grant a tokenless historical transaction to the first requester. Reconcile legacy records only after verifying original ownership and Apple's transaction state; legacy records are not treated as proof of payment.

The new flow does not mutate the aggregate PayPal/manual user membership fields. Authenticated access resolution adds only currently valid verified Apple grants. Known legacy Apple-only grants are excluded. Independent completed website purchases and explicit course member grants remain separate. Ambiguous old assignments need support review; do not bulk-delete user or course documents.

Expiry uses the verified purchase date and calendar duration, with month-end clamping. Separate paid periods for the same plan are combined in purchase-date order; repeated restoration does not start a new period. A full refund removes that purchase's contribution. A partial refund retains the corresponding proportion of that purchase period; a reversal restores its original contribution without granting new time. Other valid purchases and manual course memberships remain intact.

Notifications are signature-verified before use. State updates and processed notification IDs are stored atomically, and stale signed snapshots cannot overwrite newer ones. Refunds arriving before fulfillment leave a tombstone so a delayed purchase callback cannot re-grant access. Failed processing returns an error for Apple's retry; never return a success response before durable handling. A refund request submission is not a refund decision and does not revoke access by itself.

The installed mobile bridge opens the native refund sheet for the latest transaction of a product. The app checks that Apple's latest transaction matches the selected verified purchase before opening it. Older purchases or another App Store account require customer support rather than silently targeting another transaction.

## Consumption information and monitoring

Sharing is opt-in, defaults off, is versioned and can be withdrawn. On CONSUMPTION_REQUEST the server rechecks consent before sharing only delivery status and the sample-provided flag for the specified transaction. No course usage percentage is fabricated. The request is sent through Apple's current V2 API. Customers may contact Apple at privacy.apple.com about data already shared. Apple receives no report when consent is absent.

Set alerts on the structured apple_payment_failure log, especially account mismatches, repeated invalid signatures, 429 limits, and 503 provider/configuration failures. Logs omit private keys, full signed payloads and personal contact details. App Store Server Notifications should be monitored for delivery failures. Provider retries and current-state verification protect normal delivery interruptions; periodically review missed notifications/refund history operationally, especially after prolonged outages.

## Verification before release

- Automated tests cover forged signatures, wrong identifiers/ownership/environment, failures before fulfillment, concurrent duplicates, old/expired restores, calendar expiry, refund/reversal ordering, pre-fulfillment refunds, partial refunds, sandbox isolation, consent withdrawal, bounded request parsing and persistent rate limits.
- Test direct unauthorized writes against the actual Firestore rules.
- On an iPhone/iPad TestFlight build, test both plans, cancellation, pending payment, connection loss after payment, restoration and access refresh, native refund submission, Apple-approved refund and refund reversal.
- Prove that a website purchase and explicit manual assignment remain usable after refunding an Apple purchase. Test new verified paid access rather than assuming a success screen grants courses.

Website integrated PayPal capture checks provider completion before calling completePurchase. The Android app currently opens external payment links; native Google Play Billing and automatic verification of arbitrary external payment links are not implemented by this Apple work. Manual course assignment remains an explicitly trusted administrator action.
