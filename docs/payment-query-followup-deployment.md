# Payment Query Follow-up Deployment

The one-minute apology email uses Google Cloud Tasks so it remains reliable when the Next.js server restarts.

## Create the queue

```bash
gcloud services enable cloudtasks.googleapis.com
gcloud tasks queues create payment-query-followups --location=europe-west2
```

The deployed application's service account needs permission to create tasks in this queue, normally `roles/cloudtasks.enqueuer`.

## Environment variables

```text
PAYMENT_QUERY_TASK_LOCATION=europe-west2
PAYMENT_QUERY_TASK_QUEUE=payment-query-followups
PAYMENT_QUERY_TASK_SECRET=use-a-long-random-secret
PAYMENT_QUERY_TASK_URL=https://urologics.co.uk/api/internal/payment-query-followup
NEXT_PUBLIC_SITE_URL=https://urologics.co.uk
```

`FIREBASE_PROJECT_ID`, `EMAIL_USER`, and `EMAIL_PASS` must also remain configured.

After a query is saved, the API schedules a task for about 45 seconds later. The task is server-side, so it continues even when the RN app is closed. The task sends an apology email linking to:

```text
https://urologics.co.uk/checkout?planId=...&versionId=...&queryId=...
```

The checkout page checks Firebase Authentication. Logged-out users are sent through `/login` and returned to the same checkout page after signing in.
