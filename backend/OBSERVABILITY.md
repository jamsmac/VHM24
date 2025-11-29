# Observability Infrastructure

## Overview

This document describes the observability infrastructure implemented for VendHub Manager backend.

**Status**: ✅ IMPLEMENTED (2025-11-22)

## Components

### 1. Structured Logging (Winston)

**Location**: `src/common/logger/winston.config.ts`

**Features**:
- Pretty console logging in development (colored, readable)
- JSON structured logging in production (for log aggregation)
- Automatic log rotation to files in production
- Integration with NestJS logger

**Log Levels**:
- `error` - Errors and exceptions
- `warn` - Warning messages
- `info` - General information (default)
- `debug` - Debug information
- `verbose` - Verbose logging

**Configuration**:
```typescript
// Development: Pretty console output
[VendHub] 6345 11/22/2025, 11:43:52 PM LOG [NestFactory] Starting Nest application...

// Production: JSON structured logs
{"level":"info","message":"Request completed","method":"POST","url":"/api/v1/tasks/complete","statusCode":200,"responseTime":"245ms","correlationId":"abc-123","timestamp":"2025-11-22T18:00:00.000Z"}
```

### 2. Request Correlation IDs

**Location**: `src/common/middleware/correlation-id.middleware.ts`

**Features**:
- Automatic UUID generation for each request
- Accepts existing correlation ID from client via `X-Correlation-ID` header
- Adds correlation ID to all logs
- Returns correlation ID in response headers

**Usage**:
```bash
# Client sends correlation ID
curl -H "X-Correlation-ID: my-custom-id" http://localhost:3000/api/v1/health

# Server returns same ID
< X-Correlation-ID: my-custom-id
```

### 3. Request/Response Logging

**Location**: `src/common/interceptors/logging.interceptor.ts`

**Features**:
- Logs all incoming requests (method, URL, IP, user agent)
- Logs response status and timing
- Logs errors with stack traces
- Includes correlation ID in all logs

**Example Logs**:
```json
{
  "message": "Incoming request",
  "method": "POST",
  "url": "/api/v1/tasks/123/complete",
  "correlationId": "abc-123",
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.1",
  "body": { "skip_photos": false }
}

{
  "message": "Request completed",
  "method": "POST",
  "url": "/api/v1/tasks/123/complete",
  "statusCode": 200,
  "responseTime": "245ms",
  "correlationId": "abc-123"
}
```

### 4. Error Tracking (Sentry)

**Location**: `src/common/filters/sentry-exception.filter.ts`

**Features**:
- Automatic exception capture
- Only reports 5xx errors (not client errors)
- Includes correlation ID as tag
- Includes user context
- Includes request metadata

**Configuration**:
Set `SENTRY_DSN` in `.env`:
```env
SENTRY_DSN=https://your-key@sentry.io/your-project
```

**Sentry Context**:
- Tags: `correlationId`, `environment`
- User: `id`, `username`
- Request: `method`, `url`, `headers`, `query`, `body`

### 5. Health Checks

**Location**: `src/health/health.controller.ts`, `src/health/health.module.ts`

**Endpoints**:

#### GET /api/v1/health
Full health check with database, memory, and disk checks.

**Response Example**:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" },
    "storage": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" },
    "storage": { "status": "up" }
  }
}
```

#### GET /api/v1/health/ready
Readiness probe for Kubernetes.

**Response**:
```json
{
  "status": "ready",
  "timestamp": "2025-11-22T18:00:00.000Z"
}
```

#### GET /api/v1/health/live
Liveness probe for Kubernetes.

**Response**:
```json
{
  "status": "alive",
  "timestamp": "2025-11-22T18:00:00.000Z"
}
```

## Environment Variables

Add to `.env`:

```env
# Logging
LOG_LEVEL=info
NODE_ENV=development

# Sentry Error Tracking (optional)
SENTRY_DSN=https://your-key@sentry.io/your-project
```

## Usage in Services

### Structured Logging Example

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  async completeTask(taskId: string, userId: string) {
    this.logger.log({
      message: 'Completing task',
      taskId,
      userId,
      action: 'complete_task_start',
    });

    try {
      // ... business logic

      this.logger.log({
        message: 'Task completed successfully',
        taskId,
        userId,
        action: 'complete_task_success',
      });
    } catch (error) {
      this.logger.error({
        message: 'Failed to complete task',
        taskId,
        userId,
        error: error.message,
        stack: error.stack,
        action: 'complete_task_error',
      });
      throw error;
    }
  }
}
```

## Log Aggregation

### Production Setup

In production, logs are written to:
- `logs/error.log` - Error level logs only
- `logs/combined.log` - All logs

**Recommended**: Use a log aggregation service:
- **Datadog**: Tail log files or use APM
- **CloudWatch**: AWS CloudWatch Logs
- **ELK Stack**: Elasticsearch + Logstash + Kibana
- **Grafana Loki**: Lightweight log aggregation

### Log Rotation

Recommended setup with `logrotate`:

```
/path/to/backend/logs/*.log {
  daily
  rotate 14
  compress
  delaycompress
  notifempty
  create 0644 vendhub vendhub
  sharedscripts
  postrotate
    # Signal app to reopen log files if needed
  endscript
}
```

## Kubernetes Integration

### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vendhub-backend
spec:
  template:
    spec:
      containers:
      - name: backend
        image: vendhub/backend:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: SENTRY_DSN
          valueFrom:
            secretKeyRef:
              name: vendhub-secrets
              key: sentry-dsn
        livenessProbe:
          httpGet:
            path: /api/v1/health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

## Troubleshooting

### Logs not appearing

1. Check `NODE_ENV` is set correctly
2. Verify `logs/` directory exists and is writable
3. Check console for Winston initialization errors

### Correlation IDs not in logs

1. Verify `CorrelationIdMiddleware` is registered in `AppModule`
2. Check that middleware is applied to all routes
3. Ensure logger is using structured format

### Sentry not capturing errors

1. Verify `SENTRY_DSN` is set in `.env`
2. Check that errors are 5xx (4xx are not reported)
3. Test Sentry connection: `Sentry.captureMessage('Test')`

### Health checks failing

1. Check database connectivity
2. Verify memory/disk thresholds are appropriate
3. Review health endpoint logs for specific failures

## Files Created

### New Files
- `src/common/logger/winston.config.ts` - Winston logger configuration
- `src/common/middleware/correlation-id.middleware.ts` - Correlation ID middleware
- `src/common/interceptors/logging.interceptor.ts` - Request/response logging
- `src/common/filters/sentry-exception.filter.ts` - Sentry error tracking
- `src/health/health.controller.ts` - Health check endpoints
- `src/health/health.module.ts` - Health module

### Modified Files
- `src/main.ts` - Added Sentry initialization, Winston logger, interceptors
- `src/app.module.ts` - Added correlation ID middleware
- `src/modules/tasks/tasks.service.ts` - Example structured logging

## Dependencies Added

```json
{
  "dependencies": {
    "winston": "^3.x",
    "nest-winston": "^1.x",
    "@sentry/node": "^7.x",
    "@sentry/integrations": "^7.x",
    "@nestjs/terminus": "^10.x",
    "uuid": "^9.x"
  },
  "devDependencies": {
    "@types/uuid": "^9.x"
  }
}
```

## Production Readiness

### Before Deployment

- [ ] Set `SENTRY_DSN` in production environment
- [ ] Configure log rotation
- [ ] Set up log aggregation service
- [ ] Configure health check monitoring
- [ ] Test correlation ID flow end-to-end
- [ ] Verify structured logs are parseable by aggregation service
- [ ] Set appropriate memory/disk thresholds for health checks
- [ ] Document correlation ID in API documentation

### Metrics to Monitor

1. **Error Rate**: Sentry dashboard
2. **Response Times**: Parse from structured logs
3. **Health Check Success Rate**: Monitor `/health` endpoint
4. **Log Volume**: Monitor log file size and growth
5. **Database Connection Pool**: Health check database indicator

## Next Steps

1. **Distributed Tracing**: Add OpenTelemetry for full request tracing
2. **Metrics**: Add Prometheus metrics endpoint
3. **APM**: Consider DataDog APM or New Relic
4. **Custom Dashboards**: Create Grafana dashboards for key metrics
5. **Alerting**: Set up alerts in Sentry and log aggregation service

---

**Last Updated**: 2025-11-22
**Status**: Production Ready ✅
