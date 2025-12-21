# Integration Module

## Overview

The Integration module manages external system connections for VendHub Manager. It provides a unified framework for integrating with payment gateways, ERP systems, accounting software, and other third-party services.

## Key Features

- Multiple integration types (payment, ERP, CRM, etc.)
- Encrypted credential storage (AES-256-GCM)
- Webhook handling with signature verification
- Sync job scheduling
- Integration logging and monitoring
- API key management

## Entities

### Integration

**File**: `backend/src/modules/integration/entities/integration.entity.ts`

```typescript
@Entity('integrations')
export class Integration extends BaseEntity {
  name: string;                  // Display name
  code: string;                  // Unique code
  type: IntegrationType;         // Integration type
  provider: string;              // Provider (stripe, 1C, etc.)
  status: IntegrationStatus;     // Current status
  description: string | null;
  api_endpoint: string | null;   // API base URL
  api_key: string | null;        // Encrypted API key
  api_secret: string | null;     // Encrypted API secret
  webhook_url: string | null;    // Incoming webhook URL
  webhook_secret: string | null; // Encrypted webhook secret
  sync_interval_minutes: number; // Auto-sync interval (0 = manual)
  last_sync_at: Date | null;
  next_sync_at: Date | null;
  auto_sync_enabled: boolean;
  config: IntegrationConfig;     // Custom configuration
  metadata: IntegrationMetadata; // Stats and info
  logs: IntegrationLog[];
}
```

### Integration Types

| Type | Value | Description |
|------|-------|-------------|
| Payment Gateway | `payment_gateway` | Payment processing (Payme, Click) |
| ERP | `erp` | Enterprise resource planning (1C) |
| Accounting | `accounting` | Accounting software |
| CRM | `crm` | Customer relationship management |
| Email | `email` | Email service providers |
| SMS | `sms` | SMS providers |
| Shipping | `shipping` | Delivery services |
| Inventory | `inventory` | Inventory management |
| API | `api` | Generic API integration |
| Webhook | `webhook` | Webhook receiver |

### Integration Statuses

| Status | Value | Description |
|--------|-------|-------------|
| Active | `active` | Working normally |
| Inactive | `inactive` | Disabled |
| Error | `error` | In error state |
| Testing | `testing` | Test mode |

### Webhook

**File**: `backend/src/modules/integration/entities/webhook.entity.ts`

```typescript
@Entity('webhooks')
export class Webhook extends BaseEntity {
  integration_id: string | null;   // Parent integration
  event_type: string;              // Event type (e.g., 'payment.completed')
  source: string | null;           // Provider name
  external_id: string | null;      // External system ID
  payload: Record<string, any>;    // Webhook payload
  headers: Record<string, string>; // Request headers
  status: WebhookStatus;           // Processing status
  processed_at: Date | null;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  signature: string | null;
  signature_verified: boolean;
  metadata: WebhookMetadata;
}
```

### Webhook Statuses

| Status | Value | Description |
|--------|-------|-------------|
| Pending | `pending` | Awaiting processing |
| Processing | `processing` | Currently processing |
| Completed | `completed` | Successfully processed |
| Failed | `failed` | Processing failed |
| Ignored | `ignored` | Intentionally skipped |

### SyncJob

**File**: `backend/src/modules/integration/entities/sync-job.entity.ts`

```typescript
@Entity('sync_jobs')
export class SyncJob extends BaseEntity {
  integration_id: string;
  job_type: string;              // sync_products, sync_orders, etc.
  status: SyncJobStatus;
  started_at: Date | null;
  completed_at: Date | null;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_message: string | null;
  metadata: object;
}
```

### IntegrationLog

**File**: `backend/src/modules/integration/entities/integration-log.entity.ts`

```typescript
@Entity('integration_logs')
export class IntegrationLog extends BaseEntity {
  integration_id: string;
  action: string;                // API call, webhook, sync
  direction: 'inbound' | 'outbound';
  endpoint: string;
  request_data: object;
  response_data: object;
  status_code: number;
  duration_ms: number;
  error_message: string | null;
  metadata: object;
}
```

## API Endpoints

### Integrations

```
POST   /api/integrations           Create integration
GET    /api/integrations           List integrations
GET    /api/integrations/:id       Get integration
PUT    /api/integrations/:id       Update integration
DELETE /api/integrations/:id       Delete integration
POST   /api/integrations/:id/test  Test connection
POST   /api/integrations/:id/sync  Trigger manual sync
```

### Webhooks

```
POST   /api/webhooks/receive/:code    Receive webhook
GET    /api/webhooks                  List webhooks
GET    /api/webhooks/:id              Get webhook
POST   /api/webhooks/:id/retry        Retry webhook
DELETE /api/webhooks/:id              Delete webhook
```

### Sync Jobs

```
GET    /api/sync-jobs                 List sync jobs
GET    /api/sync-jobs/:id             Get sync job
POST   /api/sync-jobs/:id/cancel      Cancel sync job
```

### Integration Logs

```
GET    /api/integration-logs          List logs
GET    /api/integration-logs/:id      Get log entry
```

## Security

### Credential Encryption

API keys and secrets are encrypted using AES-256-GCM:

```typescript
// Automatic encryption on save
@Column({
  type: 'varchar',
  transformer: encryptedColumnTransformer,
})
api_key: string;

// encryptedColumnTransformer
export const encryptedColumnTransformer = {
  to: (value: string) => value ? encrypt(value) : null,
  from: (value: string) => value ? decrypt(value) : null,
};
```

### Webhook Signature Verification

```typescript
async verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Service Methods

### IntegrationService

| Method | Description |
|--------|-------------|
| `create()` | Create new integration |
| `findAll()` | List integrations |
| `findOne()` | Get integration by ID |
| `update()` | Update integration |
| `remove()` | Delete integration |
| `testConnection()` | Test integration connectivity |
| `triggerSync()` | Start manual sync |
| `updateStatus()` | Update integration status |

### WebhookService

| Method | Description |
|--------|-------------|
| `receive()` | Handle incoming webhook |
| `process()` | Process webhook payload |
| `retry()` | Retry failed webhook |
| `verifySignature()` | Verify webhook signature |
| `findByStatus()` | Get webhooks by status |

### SyncJobService

| Method | Description |
|--------|-------------|
| `create()` | Create sync job |
| `start()` | Start sync job |
| `complete()` | Mark job completed |
| `fail()` | Mark job failed |
| `cancel()` | Cancel running job |
| `getActive()` | Get active sync jobs |

## Webhook Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBHOOK PROCESSING                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. External system sends webhook                                │
│         │                                                        │
│         ▼                                                        │
│  2. Receive at /api/webhooks/receive/:code                      │
│         │                                                        │
│         ▼                                                        │
│  3. Verify signature (if configured)                             │
│         │                                                        │
│         ├─── Invalid → Log and ignore                           │
│         │                                                        │
│         ▼                                                        │
│  4. Save webhook with status=pending                             │
│         │                                                        │
│         ▼                                                        │
│  5. Process webhook asynchronously                               │
│         │                                                        │
│         ├─── Success → status=completed                         │
│         │                                                        │
│         └─── Failure → Retry (up to max_retries)                │
│                    │                                             │
│                    └─── All retries failed → status=failed      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Sync Job Scheduling

```typescript
@Cron('*/15 * * * *')  // Every 15 minutes
async runScheduledSyncs(): Promise<void> {
  const dueIntegrations = await this.integrationRepository.find({
    where: {
      auto_sync_enabled: true,
      status: IntegrationStatus.ACTIVE,
      next_sync_at: LessThanOrEqual(new Date()),
    },
  });

  for (const integration of dueIntegrations) {
    await this.syncJobService.create({
      integration_id: integration.id,
      job_type: 'scheduled_sync',
    });
  }
}
```

## Configuration Example

### Payment Gateway (Payme)

```typescript
await this.integrationService.create({
  name: 'Payme Integration',
  code: 'payme',
  type: IntegrationType.PAYMENT_GATEWAY,
  provider: 'payme',
  api_endpoint: 'https://checkout.paycom.uz/api',
  api_key: 'merchant_id',
  api_secret: 'secret_key',
  webhook_url: '/api/webhooks/receive/payme',
  config: {
    timeout: 30000,
    retry_attempts: 3,
    test_mode: false,
  },
});
```

### 1C ERP Integration

```typescript
await this.integrationService.create({
  name: '1C Enterprise',
  code: '1c_erp',
  type: IntegrationType.ERP,
  provider: '1c',
  api_endpoint: 'https://1c.company.uz/api/odata',
  api_key: 'username',
  api_secret: 'password',
  sync_interval_minutes: 60,
  auto_sync_enabled: true,
  config: {
    mapping: {
      products: 'Catalog_Nomenclature',
      orders: 'Document_SalesOrder',
    },
  },
});
```

## Best Practices

1. **Test First**: Always test integrations before activating
2. **Secure Credentials**: Never log API keys or secrets
3. **Monitor Logs**: Review integration logs regularly
4. **Handle Failures**: Implement proper retry logic
5. **Webhook Security**: Always verify signatures

## Related Modules

- [Reconciliation](../reconciliation/README.md) - Payment matching
- [Sales Import](../sales-import/README.md) - Data import
- [Monitoring](../monitoring/README.md) - Integration metrics
- [Audit Logs](../audit-logs/README.md) - Change tracking
