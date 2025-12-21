# Web Push Module

## Overview

The Web Push module enables browser push notifications for VendHub Manager. It allows users to receive notifications even when the browser is closed, using the Web Push Protocol and Service Workers.

## Key Features

- Browser push notifications (Chrome, Firefox, Safari)
- Subscription management per user/device
- Notification delivery tracking
- Graceful handling of expired subscriptions
- Multi-device support

## Entity

### PushSubscription

**File**: `backend/src/modules/web-push/entities/push-subscription.entity.ts`

```typescript
@Entity('push_subscriptions')
@Index(['user_id'])
@Index(['endpoint'], { unique: true })
export class PushSubscription extends BaseEntity {
  user_id: string;           // User who subscribed
  endpoint: string;          // Push service endpoint URL
  p256dh: string;            // P256DH key for encryption
  auth: string;              // Auth secret for encryption
  user_agent: string;        // Browser/device info
  last_sent_at: Date;        // Last notification sent
  is_active: boolean;        // Subscription active status
}
```

## How Web Push Works

### Subscription Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEB PUSH SUBSCRIPTION FLOW                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User clicks "Enable Notifications"                          │
│         │                                                        │
│         ▼                                                        │
│  2. Browser requests notification permission                     │
│         │                                                        │
│         ▼                                                        │
│  3. Service Worker registers with push service                   │
│         │ (FCM for Chrome, Mozilla for Firefox)                  │
│         ▼                                                        │
│  4. Push service returns subscription with:                      │
│         • endpoint (push service URL)                            │
│         • keys: { p256dh, auth }                                 │
│         │                                                        │
│         ▼                                                        │
│  5. Frontend sends subscription to backend                       │
│         │                                                        │
│         ▼                                                        │
│  6. Backend stores in push_subscriptions table                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Notification Delivery Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 NOTIFICATION DELIVERY FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Backend event triggers notification                          │
│         │                                                        │
│         ▼                                                        │
│  2. Web Push service encrypts payload using p256dh + auth       │
│         │                                                        │
│         ▼                                                        │
│  3. Sends encrypted payload to push service endpoint            │
│         │ (e.g., fcm.googleapis.com/fcm/send/...)               │
│         ▼                                                        │
│  4. Push service delivers to user's browser                     │
│         │                                                        │
│         ▼                                                        │
│  5. Service Worker receives push event                          │
│         │                                                        │
│         ▼                                                        │
│  6. Service Worker shows notification                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

```env
# Web Push VAPID Keys
WEB_PUSH_VAPID_PUBLIC_KEY=BNxxx...
WEB_PUSH_VAPID_PRIVATE_KEY=xxx...
WEB_PUSH_VAPID_SUBJECT=mailto:admin@vendhub.com
```

### Generate VAPID Keys

```typescript
import * as webPush from 'web-push';

const vapidKeys = webPush.generateVAPIDKeys();
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
```

## API Endpoints

```
POST   /api/web-push/subscribe      Subscribe to push notifications
DELETE /api/web-push/unsubscribe    Unsubscribe from notifications
GET    /api/web-push/vapid-key      Get VAPID public key
POST   /api/web-push/test           Send test notification
```

## DTOs

### SubscribeDto

```typescript
class SubscribeDto {
  @IsString()
  endpoint: string;

  @IsString()
  p256dh: string;

  @IsString()
  auth: string;

  @IsOptional()
  @IsString()
  user_agent?: string;
}
```

## Service Methods

### WebPushService

| Method | Description |
|--------|-------------|
| `subscribe()` | Register new push subscription |
| `unsubscribe()` | Remove subscription |
| `sendNotification()` | Send notification to user |
| `sendToAll()` | Send notification to all users |
| `removeExpiredSubscriptions()` | Clean up invalid subscriptions |
| `getVapidPublicKey()` | Get public VAPID key |

## Usage Examples

### Frontend - Request Permission

```typescript
async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}
```

### Frontend - Subscribe

```typescript
async function subscribeToNotifications() {
  const registration = await navigator.serviceWorker.ready;

  // Get VAPID public key from backend
  const vapidKey = await fetch('/api/web-push/vapid-key')
    .then(res => res.json())
    .then(data => data.publicKey);

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  // Send subscription to backend
  await fetch('/api/web-push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
      auth: arrayBufferToBase64(subscription.getKey('auth')),
      user_agent: navigator.userAgent,
    }),
  });
}
```

### Service Worker

```javascript
// service-worker.js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};

  const options = {
    body: data.body,
    icon: '/icons/notification-icon.png',
    badge: '/icons/badge-icon.png',
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
    tag: data.tag,
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

### Backend - Send Notification

```typescript
async sendNotification(userId: string, payload: NotificationPayload): Promise<void> {
  const subscriptions = await this.subscriptionRepository.find({
    where: { user_id: userId, is_active: true },
  });

  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload),
        {
          vapidDetails: {
            subject: process.env.WEB_PUSH_VAPID_SUBJECT,
            publicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY,
            privateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY,
          },
        }
      );

      // Update last sent timestamp
      subscription.last_sent_at = new Date();
      await this.subscriptionRepository.save(subscription);
    } catch (error) {
      if (error.statusCode === 410) {
        // Subscription expired, remove it
        subscription.is_active = false;
        await this.subscriptionRepository.save(subscription);
      } else {
        this.logger.error(`Failed to send push: ${error.message}`);
      }
    }
  }
}
```

## Notification Payload

```typescript
interface NotificationPayload {
  title: string;           // Notification title
  body: string;            // Message body
  icon?: string;           // Icon URL
  badge?: string;          // Badge icon URL
  url?: string;            // Click destination URL
  tag?: string;            // Group notifications
  requireInteraction?: boolean;  // Persist until clicked
  actions?: Array<{
    action: string;
    title: string;
  }>;
}
```

## Example Notifications

### Task Assignment

```typescript
await this.webPushService.sendNotification(operatorId, {
  title: 'Новая задача',
  body: `Пополнение для аппарата M-001`,
  icon: '/icons/task-icon.png',
  url: `/tasks/${taskId}`,
  tag: 'task-assignment',
  actions: [
    { action: 'view', title: 'Просмотреть' },
    { action: 'dismiss', title: 'Отклонить' },
  ],
});
```

### Low Stock Alert

```typescript
await this.webPushService.sendNotification(managerId, {
  title: '⚠️ Низкий запас',
  body: `Аппарат M-003: осталось 5 товаров`,
  icon: '/icons/warning-icon.png',
  url: `/machines/${machineId}`,
  requireInteraction: true,
});
```

## Handling Expired Subscriptions

```typescript
@Cron('0 3 * * *')  // Daily at 3 AM
async cleanupExpiredSubscriptions(): Promise<void> {
  // Remove subscriptions not used in 90 days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  await this.subscriptionRepository
    .createQueryBuilder()
    .update()
    .set({ is_active: false })
    .where('last_sent_at < :cutoffDate OR last_sent_at IS NULL', { cutoffDate })
    .andWhere('is_active = true')
    .execute();

  this.logger.log('Cleaned up expired push subscriptions');
}
```

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Uses FCM |
| Firefox | ✅ Full | Uses Mozilla Push Service |
| Edge | ✅ Full | Uses FCM |
| Safari | ⚠️ Partial | Requires Apple Push Notification service |
| Opera | ✅ Full | Uses FCM |
| Samsung Internet | ✅ Full | Uses FCM |

## Error Handling

### Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 201 | Success | Notification sent |
| 400 | Invalid request | Check payload |
| 404 | Subscription not found | User unsubscribed |
| 410 | Subscription expired | Remove from database |
| 413 | Payload too large | Reduce payload size |
| 429 | Rate limited | Slow down |

## Best Practices

1. **Ask Permission Contextually**: Request permission when relevant, not on page load
2. **Meaningful Notifications**: Only send important, actionable notifications
3. **Respect User Preferences**: Allow users to customize notification types
4. **Handle Errors Gracefully**: Remove expired subscriptions
5. **Multi-Device Support**: Users may have multiple subscriptions
6. **Use Tags**: Group related notifications to prevent spam

## Security Considerations

- Store VAPID keys securely in environment variables
- Use HTTPS (required for Service Workers)
- Validate subscription data from clients
- Implement rate limiting for notifications
- Encrypt sensitive payload data

## Related Modules

- [Notifications](../notifications/README.md) - Multi-channel notifications
- [Email](../email/README.md) - Email notifications
- [Telegram](../telegram/README.md) - Telegram notifications
- [Tasks](../tasks/README.md) - Task notifications
