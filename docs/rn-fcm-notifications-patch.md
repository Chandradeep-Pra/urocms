# RN FCM Notifications Patch

## Objective

Enable real device push notifications in the React Native app using Firebase Cloud Messaging, backed by the notification system now implemented in UroCMS.

This patch covers:

- device token registration
- backend notification publishing
- FCM push delivery
- foreground/background handling in RN
- logout cleanup

## What Is Already Implemented In Backend

The backend now supports:

- notification feed storage
- automatic notification creation when:
  - daily quiz is posted
  - grand mock is posted
  - new AI viva case is posted
  - new announcement is posted
  - custom admin notification is published
- FCM push dispatch to registered devices
- invalid token deactivation

## Source Files

Backend push system:

- [C:\Users\HP\Downloads\urocms\lib\firebaseAdmin.ts](C:\Users\HP\Downloads\urocms\lib\firebaseAdmin.ts)
- [C:\Users\HP\Downloads\urocms\lib\server\notificationService.ts](C:\Users\HP\Downloads\urocms\lib\server\notificationService.ts)
- [C:\Users\HP\Downloads\urocms\lib\server\deviceTokenService.ts](C:\Users\HP\Downloads\urocms\lib\server\deviceTokenService.ts)

Device registration API:

- [C:\Users\HP\Downloads\urocms\app\api\app\devices\register\route.ts](C:\Users\HP\Downloads\urocms\app\api\app\devices\register\route.ts)

App notifications feed:

- [C:\Users\HP\Downloads\urocms\app\api\app\notifications\route.ts](C:\Users\HP\Downloads\urocms\app\api\app\notifications\route.ts)

Automatic notification triggers:

- [C:\Users\HP\Downloads\urocms\app\api\daily-quiz\route.ts](C:\Users\HP\Downloads\urocms\app\api\daily-quiz\route.ts)
- [C:\Users\HP\Downloads\urocms\app\api\mocks\route.ts](C:\Users\HP\Downloads\urocms\app\api\mocks\route.ts)
- [C:\Users\HP\Downloads\urocms\app\api\viva-cases\route.ts](C:\Users\HP\Downloads\urocms\app\api\viva-cases\route.ts)
- [C:\Users\HP\Downloads\urocms\app\api\announcements\route.ts](C:\Users\HP\Downloads\urocms\app\api\announcements\route.ts)
- [C:\Users\HP\Downloads\urocms\app\api\notifications\route.ts](C:\Users\HP\Downloads\urocms\app\api\notifications\route.ts)

## How The System Works

### Backend Flow

1. Admin creates content or custom notification
2. Backend calls `publishNotification(...)`
3. Notification is saved in Firestore
4. Backend loads active registered device tokens
5. Backend sends FCM push to those devices
6. Invalid/unregistered tokens are marked inactive automatically

### RN Flow

1. App requests notification permission
2. App gets FCM token
3. App sends token to backend
4. Device becomes eligible for push
5. App handles push when:
   - app is foreground
   - app is background
   - app is opened from notification tap

## Required RN Dependencies

You need Firebase Messaging in the React Native app.

Typical packages:

- `@react-native-firebase/app`
- `@react-native-firebase/messaging`

If using Notifee or another local-display helper, that can sit on top, but it is optional for this backend patch.

## Backend API Contract

## 1. Register Device

Endpoint:

- `POST /api/app/devices/register`

Headers:

```http
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

Body:

```json
{
  "token": "<fcm_token>",
  "platform": "android",
  "appVersion": "1.0.0",
  "deviceName": "Pixel 8"
}
```

Response:

```json
{
  "success": true,
  "deviceId": "device_doc_id",
  "created": true
}
```

Notes:

- duplicate token registration for same user is updated, not duplicated
- valid platforms:
  - `android`
  - `ios`
  - `web`

## 2. Unregister Device

Endpoint:

- `DELETE /api/app/devices/register`

Headers:

```http
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

Body:

```json
{
  "token": "<fcm_token>"
}
```

Response:

```json
{
  "success": true,
  "found": true
}
```

Use this on logout if possible.

## 3. Notifications Feed

Endpoint:

- `GET /api/app/notifications`

Headers:

```http
Authorization: Bearer <firebase_id_token>
```

Response:

```json
{
  "count": 10,
  "notifications": [
    {
      "id": "notification_1",
      "kind": "daily-quiz",
      "title": "New Daily Quiz Posted",
      "body": "Today's daily quiz is now live.",
      "sourceId": "2026-05-17",
      "sourceType": "dailyQuiz",
      "deepLink": "/daily-quiz",
      "audience": "all",
      "isPublished": true,
      "publishedAt": {
        "_seconds": 1747440000
      }
    }
  ]
}
```

Use this for:

- in-app notifications center
- unread badge logic
- notification history

## FCM Payload Shape

Pushes are sent with:

### Notification payload

```ts
{
  title: string;
  body: string;
}
```

### Data payload

```ts
{
  notificationId: string;
  deepLink: string;
  title: string;
  body: string;
}
```

RN should primarily read:

- `remoteMessage.data.notificationId`
- `remoteMessage.data.deepLink`

## RN Implementation Plan

## Step 1. Request Permission

On app startup after login, request notification permission.

Example:

```ts
import messaging from "@react-native-firebase/messaging";

export async function requestNotificationPermission() {
  const status = await messaging().requestPermission();
  const enabled =
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL;

  return enabled;
}
```

On Android, also ensure the app handles runtime notification permission for newer Android versions if applicable.

## Step 2. Get FCM Token

Example:

```ts
import messaging from "@react-native-firebase/messaging";

export async function getFcmToken() {
  return messaging().getToken();
}
```

## Step 3. Register Token With Backend

After login and permission grant:

1. get Firebase auth ID token
2. get FCM token
3. send token to backend

Example:

```ts
export async function registerDeviceForPush(params: {
  token: string;
  platform: "android" | "ios";
  appVersion?: string;
  deviceName?: string;
}) {
  return apiFetch("/api/app/devices/register", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
```

## Step 4. Refresh Token On Change

FCM token can rotate.

RN must subscribe to token refresh:

```ts
import messaging from "@react-native-firebase/messaging";

export function subscribeToFcmTokenRefresh(
  onRefresh: (token: string) => Promise<void> | void
) {
  return messaging().onTokenRefresh(async (token) => {
    await onRefresh(token);
  });
}
```

When token changes:

- call `POST /api/app/devices/register` again with the new token

## Step 5. Foreground Notification Handling

When app is open in foreground, FCM notification may not always show a system banner automatically the way you want.

Recommended behavior:

- listen to foreground messages
- show an in-app banner / toast / modal
- refresh notifications feed

Example:

```ts
import messaging from "@react-native-firebase/messaging";

export function subscribeToForegroundNotifications(
  onMessageReceived: (payload: any) => void
) {
  return messaging().onMessage(async (remoteMessage) => {
    onMessageReceived(remoteMessage);
  });
}
```

Recommended UI action:

- show a toast
- update notification badge
- optionally refetch `/api/app/notifications`

## Step 6. Background / Quit Tap Handling

You must handle notification taps when app is backgrounded or closed.

### App opened from background notification tap

```ts
import messaging from "@react-native-firebase/messaging";

export function subscribeToNotificationOpen(
  onOpen: (remoteMessage: any) => void
) {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    onOpen(remoteMessage);
  });
}
```

### App opened from quit state

```ts
import messaging from "@react-native-firebase/messaging";

export async function getInitialNotificationIfAny() {
  return messaging().getInitialNotification();
}
```

## Step 7. Deep Link Navigation

The backend already sends `deepLink` in push data.

RN should map it to navigation behavior.

Examples:

- `/daily-quiz`
  - open daily quiz screen
- `/announcements`
  - open announcements screen
- `/grand-mocks/:id`
  - open mocks detail page if supported
- `/ai-viva/:id`
  - open viva case detail page if supported

Recommended helper:

```ts
export function handleNotificationDeepLink(
  deepLink: string | undefined,
  navigate: (screen: string, params?: Record<string, unknown>) => void
) {
  if (!deepLink) return;

  if (deepLink === "/daily-quiz") {
    navigate("DailyQuiz");
    return;
  }

  if (deepLink === "/announcements") {
    navigate("Announcements");
    return;
  }

  if (deepLink.startsWith("/grand-mocks/")) {
    const id = deepLink.split("/grand-mocks/")[1];
    navigate("GrandMockDetail", { id });
    return;
  }

  if (deepLink.startsWith("/ai-viva/")) {
    const id = deepLink.split("/ai-viva/")[1];
    navigate("VivaCaseDetail", { id });
  }
}
```

## Suggested RN Service Functions

```ts
export async function registerPushDevice(payload: {
  token: string;
  platform: "android" | "ios";
  appVersion?: string;
  deviceName?: string;
}) {
  return apiFetch("/api/app/devices/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function unregisterPushDevice(token: string) {
  return apiFetch("/api/app/devices/register", {
    method: "DELETE",
    body: JSON.stringify({ token }),
  });
}

export async function getNotificationsFeed() {
  return apiFetch("/api/app/notifications");
}
```

## Suggested App Bootstrap Flow

After user login:

1. validate user session
2. request notification permission
3. get FCM token
4. register token with backend
5. fetch notifications feed
6. subscribe to:
   - token refresh
   - foreground messages
   - background-open events

## Suggested Notification Bootstrap Hook

```ts
import { useEffect } from "react";
import messaging from "@react-native-firebase/messaging";

export function usePushNotifications() {
  useEffect(() => {
    let unsubscribeForeground: (() => void) | undefined;
    let unsubscribeOpened: (() => void) | undefined;

    async function setup() {
      const allowed = await requestNotificationPermission();
      if (!allowed) return;

      const fcmToken = await messaging().getToken();
      await registerPushDevice({
        token: fcmToken,
        platform: "android",
      });

      unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
        console.log("Foreground message", remoteMessage);
      });

      unsubscribeOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log("Opened from background", remoteMessage);
      });

      const initial = await messaging().getInitialNotification();
      if (initial) {
        console.log("Opened from quit state", initial);
      }

      messaging().onTokenRefresh(async (nextToken) => {
        await registerPushDevice({
          token: nextToken,
          platform: "android",
        });
      });
    }

    setup();

    return () => {
      unsubscribeForeground?.();
      unsubscribeOpened?.();
    };
  }, []);
}
```

## Logout Behavior

On logout:

1. get current FCM token if available
2. call unregister endpoint
3. then sign out Firebase auth

Example:

```ts
import messaging from "@react-native-firebase/messaging";

export async function cleanupPushOnLogout() {
  try {
    const token = await messaging().getToken();
    if (token) {
      await unregisterPushDevice(token);
    }
  } catch {
    // ignore cleanup failure
  }
}
```

## Recommended RN UI Behavior

### Foreground

When notification arrives while app is open:

- show toast/banner
- increment notification badge locally
- refresh `/api/app/notifications`

### Background

When user taps the push:

- route using `deepLink`
- optionally mark locally as seen

### Notifications Center

Use:

- `GET /api/app/notifications`

to render:

- title
- body
- published time
- source type

## Error Handling

### Register API `401`

Meaning:

- Firebase auth token missing or invalid

Action:

- ensure user is logged in before registering FCM token

### Register API `400`

Meaning:

- missing FCM token

Action:

- retry after re-fetching token

### No Push Received

Check:

1. device token is registered
2. notification permission was granted
3. backend actually created notification
4. `notifications` collection shows push delivery stats
5. FCM project config is correct in RN app

## Important Notes

### 1. Current Audience Behavior

Right now push notifications are sent to all active registered devices.

That means:

- daily quiz
- grand mock
- AI viva
- announcement
- custom notification

all go to the full active device set.

Audience filtering by tier or plan is not implemented yet.

### 2. Notifications Feed And Push Are Separate

Push is for instant delivery.

Feed is for persistent history.

RN should use both:

- push for immediacy
- feed for list/history state

### 3. Invalid Tokens Are Cleaned Automatically

If Firebase reports:

- invalid registration token
- token not registered

backend marks that token inactive automatically.

## Expected Outcome

After this patch, the RN app should:

- register each logged-in device with backend
- receive real FCM push notifications
- handle foreground and background notification flows
- navigate using deep links from payload
- show a notification history screen using `/api/app/notifications`

This is the full RN patch required for device push notifications to work with the current backend implementation.
