# Bull Board Module

## Overview

The Bull Board module provides a web-based dashboard for monitoring BullMQ job queues in VendHub Manager. It allows administrators to view queue status, job progress, and troubleshoot failed jobs.

## Key Features

- Real-time queue monitoring
- Job status visualization
- Failed job inspection
- Job retry capabilities
- Queue statistics
- Admin-only access

## Architecture

### Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    BULL BOARD INTEGRATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  VendHub Backend                                                 │
│      │                                                           │
│      ├── Sales Import Queue ──────────────────┐                 │
│      │                                         │                 │
│      ├── Commission Queue ────────────────────┤                 │
│      │   (future)                              │                 │
│      │                                         ▼                 │
│      └── Other Queues ───────────────> Bull Board UI            │
│                                              │                   │
│                                              │                   │
│                                              ▼                   │
│                                    /admin/queues endpoint       │
│                                              │                   │
│                                              ▼                   │
│                                    Admin Dashboard Page          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Controller

**File**: `backend/src/modules/bull-board/bull-board.controller.ts`

```typescript
@ApiTags('Admin - Queue Monitoring')
@ApiBearerAuth('JWT-auth')
@Controller('admin/queues')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class BullBoardController {
  private serverAdapter: ExpressAdapter;

  constructor(
    @InjectQueue('sales-import')
    private salesImportQueue: Queue,
  ) {
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [
        new BullAdapter(this.salesImportQueue),
      ],
      serverAdapter: this.serverAdapter,
    });
  }

  @All('{*path}')
  admin(@Req() req: Request, @Res() res: Response) {
    const handler = this.serverAdapter.getRouter();
    handler(req, res);
  }
}
```

## Access

### Endpoint

```
GET /admin/queues
```

### Requirements

- Authentication: JWT Bearer token
- Role: ADMIN only

### URL

```
https://api.vendhub.uz/admin/queues
```

## Monitored Queues

| Queue | Description |
|-------|-------------|
| `sales-import` | Sales file import processing |
| `commission-calculations` | Commission calculations (planned) |

## Dashboard Features

### Queue Overview

```
┌────────────────────────────────────────────────────────────────┐
│                    BULL BOARD UI                                │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Queues                                                         │
│  ├── sales-import                                               │
│  │   ├── Waiting: 3                                             │
│  │   ├── Active: 1                                              │
│  │   ├── Completed: 156                                         │
│  │   ├── Failed: 2                                              │
│  │   └── Delayed: 0                                             │
│  │                                                              │
│  └── commission-calculations (future)                          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Job Details

```
┌────────────────────────────────────────────────────────────────┐
│  Job: sales-import-123                                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Status: completed                                              │
│  Progress: 100%                                                 │
│  Created: 2025-12-21 10:00:00                                  │
│  Started: 2025-12-21 10:00:01                                  │
│  Finished: 2025-12-21 10:01:30                                 │
│  Duration: 89 seconds                                           │
│                                                                 │
│  Data:                                                          │
│  {                                                              │
│    "importId": "uuid-123",                                      │
│    "fileType": "excel",                                         │
│    "userId": "user-uuid"                                        │
│  }                                                              │
│                                                                 │
│  Result:                                                        │
│  {                                                              │
│    "successCount": 145,                                         │
│    "failedCount": 5,                                            │
│    "totalAmount": 5000000                                       │
│  }                                                              │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Failed Job Inspection

```
┌────────────────────────────────────────────────────────────────┐
│  Job: sales-import-456 (FAILED)                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Attempts: 3/3                                                  │
│  Failed Reason: Database connection timeout                    │
│                                                                 │
│  Stack Trace:                                                   │
│  Error: Connection timed out after 30000ms                     │
│    at PostgresDriver.connect (...)                             │
│    at SalesImportProcessor.process (...)                       │
│                                                                 │
│  [Retry] [Delete]                                               │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Queue Actions

### Available Actions

| Action | Description |
|--------|-------------|
| View Jobs | See all jobs in queue |
| Retry Job | Retry failed job |
| Delete Job | Remove job from queue |
| Clean Queue | Remove completed/failed jobs |
| Pause Queue | Temporarily stop processing |
| Resume Queue | Resume processing |

### Retry Failed Jobs

```typescript
// Via Bull Board UI - click "Retry" button
// Or programmatically:
await this.salesImportQueue.getJob(jobId).then(job => job?.retry());
```

### Clean Queue

```typescript
// Remove completed jobs older than 1 hour
await this.salesImportQueue.clean(3600 * 1000, 'completed');

// Remove failed jobs older than 24 hours
await this.salesImportQueue.clean(24 * 3600 * 1000, 'failed');
```

## Configuration

### Adding New Queues

```typescript
constructor(
  @InjectQueue('sales-import')
  private salesImportQueue: Queue,

  @InjectQueue('new-queue')
  private newQueue: Queue,
) {
  createBullBoard({
    queues: [
      new BullAdapter(this.salesImportQueue),
      new BullAdapter(this.newQueue),
    ],
    serverAdapter: this.serverAdapter,
  });
}
```

## Security

### Access Control

- Protected by JWT authentication
- Requires ADMIN role
- All actions logged to audit trail

### Sensitive Data

- Job data may contain sensitive information
- Access restricted to administrators only
- Consider redacting sensitive fields in job data

## Integration with Other Modules

### Sales Import

- Monitors sales import job queue
- View import progress and results

### Commission (Planned)

- Will monitor commission calculation queue

### Monitoring

- Queue metrics exposed to Prometheus
- `vendhub_queue_jobs_processed_total`
- `vendhub_queue_jobs_failed_total`

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Jobs stuck in active | Check Redis connection |
| High failure rate | Check processor error logs |
| Queue not processing | Verify worker is running |
| Dashboard not loading | Check CORS configuration |

### Debug Commands

```bash
# Check Redis connection
redis-cli ping

# View queue length
redis-cli llen bull:sales-import:wait

# View failed jobs
redis-cli lrange bull:sales-import:failed 0 -1
```

## Best Practices

1. **Regular Monitoring**: Check dashboard daily
2. **Handle Failures**: Investigate failed jobs promptly
3. **Clean Old Jobs**: Remove old completed/failed jobs
4. **Watch Queue Size**: Alert if queue grows unexpectedly
5. **Retry Carefully**: Understand why job failed before retrying

## Related Modules

- [Sales Import](../sales-import/README.md) - Import processing
- [Monitoring](../monitoring/README.md) - Queue metrics
- [Auth](../auth/README.md) - Admin authentication
