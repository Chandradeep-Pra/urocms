# React Native Payment Query Integration

Use this flow when a user needs help with a plan, coupon, or payment. The submitted query appears in UROCMS Admin → Content → Notifications, and the user receives a confirmation email.

The user should only type the query. Fill the user, plan, version, coupon, and platform automatically from the current RN session and checkout state.

## Endpoint

```http
POST https://urologics.co.uk/api/payment-queries
Content-Type: application/json
```

## Request

```json
{
  "name": "Student Name",
  "email": "student@example.com",
  "query": "My coupon is not working for this plan.",
  "planId": "PLAN_ID",
  "versionId": "VERSION_ID",
  "couponCode": "WELCOME10",
  "platform": "mobile"
}
```

`name`, `email`, `query`, `planId`, and `versionId` are required. `couponCode` is optional.

## Automatically populated values

| API field | RN source |
|---|---|
| `name` | Authenticated user profile |
| `email` | Authenticated user profile |
| `planId` | Currently selected plan |
| `versionId` | Currently selected duration/version |
| `couponCode` | Coupon already entered on checkout |
| `platform` | Always `mobile` |
| `query` | The only value entered by the user |

## API function

```ts
const API_URL = "https://urologics.co.uk";

type PaymentQueryInput = {
  name: string;
  email: string;
  query: string;
  planId: string;
  versionId: string;
  couponCode?: string;
};

type PaymentQueryResponse = {
  success: true;
  message: "Payment query raised";
  queryId: string;
  planName: string;
  couponName: string;
  emailSent: boolean;
  checkoutUrl: string;
  followUpScheduled: boolean;
};

export async function raisePaymentQuery(
  input: PaymentQueryInput,
): Promise<PaymentQueryResponse> {
  const response = await fetch(`${API_URL}/api/payment-queries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...input,
      couponCode: input.couponCode?.trim() || "",
      platform: "mobile",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to raise payment query");
  }

  return data;
}
```

## Screen usage

```ts
const [paymentQuery, setPaymentQuery] = useState("");
const [submitting, setSubmitting] = useState(false);

async function submitPaymentQuery() {
  if (!paymentQuery.trim()) {
    Alert.alert("Payment Query", "Please enter your query.");
    return;
  }

  try {
    setSubmitting(true);

    // Automatically use values already available in the app.
    const result = await raisePaymentQuery({
      name: user.displayName || userProfile.name,
      email: user.email || userProfile.email,
      query: paymentQuery.trim(),
      planId: selectedPlan.id,
      versionId: selectedVersion.id,
      couponCode: enteredCouponCode,
    });

    setPaymentQuery("");
    Alert.alert(
      "Query Submitted",
      result.emailSent
        ? `Your reference is ${result.queryId}. A confirmation email has been sent to ${user.email}.`
        : `Your reference is ${result.queryId}. Your query was saved successfully.`,
    );
  } catch (error) {
    Alert.alert(
      "Unable to Submit Query",
      error instanceof Error ? error.message : "Please try again.",
    );
  } finally {
    setSubmitting(false);
  }
}
```

Example form—the user enters only the query:

```tsx
<View>
  <Text>Payment support for {selectedPlan.name}</Text>
  <Text>{selectedVersion.durationLabel}</Text>

  {enteredCouponCode ? <Text>Coupon: {enteredCouponCode}</Text> : null}

  <TextInput
    value={paymentQuery}
    onChangeText={setPaymentQuery}
    placeholder="Describe the payment or coupon problem"
    multiline
  />

  <Button
    title={submitting ? "Submitting..." : "Raise Query"}
    onPress={submitPaymentQuery}
    disabled={submitting || !paymentQuery.trim()}
  />
</View>
```

Display the selected plan, version, and coupon for confirmation, but do not ask the user to enter them again.

Disable the submit button while `submitting` is `true` to prevent duplicate queries.

## Successful response

```json
{
  "success": true,
  "message": "Payment query raised",
  "queryId": "QUERY_ID",
  "planName": "Urologics Elite Viva",
  "couponName": "WELCOME10",
  "emailSent": true,
  "checkoutUrl": "https://urologics.co.uk/checkout?planId=PLAN_ID&versionId=VERSION_ID&queryId=QUERY_ID",
  "followUpScheduled": true
}
```

If `emailSent` is `false`, the query was still saved for the admin team. Show the reference number, but do not claim that the email was sent.

When `followUpScheduled` is `true`, the user receives another email approximately one minute later. That email links to `checkoutUrl`. The website asks the user to sign in when necessary, validates the plan and version, and then shows the exact payment button configured for that course version.

The RN app must send:

- The authenticated user's `name` and `email`
- The selected plan's Firestore `planId`
- The selected duration's `versionId`
- The entered `couponCode`, when available
- The user's payment `query`

Do not send a checkout/payment URL from RN. The server retrieves the authoritative checkout URL from the selected plan version.

Check that the automatic values exist before submitting:

```ts
if (!user || !selectedPlan || !selectedVersion) {
  Alert.alert("Unable to Raise Query", "User or checkout information is missing.");
  return;
}
```

```ts
const confirmation = result.emailSent
  ? `Reference: ${result.queryId}. A confirmation email was sent.`
  : `Reference: ${result.queryId}. Your query was saved successfully.`;
```
