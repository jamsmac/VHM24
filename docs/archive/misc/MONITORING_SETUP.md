# VH-M24 Monitoring & Alerting Setup

## Overview

Complete monitoring setup for 24/7 production operation with:
- Real-time metrics collection
- Automated alerting
- Performance dashboards
- Error tracking
- Log aggregation

## 1. Railway Monitoring

### Built-in Metrics

Railway automatically collects:
- **CPU Usage** - Real-time CPU percentage
- **Memory Usage** - RAM consumption
- **Network I/O** - Incoming/outgoing bandwidth
- **Request Count** - Total requests per minute
- **Error Rate** - Failed requests percentage
- **Response Time** - Average latency

### View Metrics

1. Go to Railway Dashboard
2. Select your project
3. Click **Monitoring** tab
4. View real-time metrics

### Configure Alerts

1. Go to **Settings** → **Alerts**
2. Click **Create Alert**
3. Configure:

```
Alert Name: High CPU Usage
Metric: CPU
Threshold: 80%
Duration: 5 minutes
Action: Email notification
Recipients: admin@vendhub.local
```

**Recommended Alerts:**

| Alert | Metric | Threshold | Duration | Action |
|-------|--------|-----------|----------|--------|
| High CPU | CPU | 80% | 5 min | Email + Scale |
| High Memory | Memory | 85% | 5 min | Email + Scale |
| High Error Rate | Error Rate | 5% | 1 min | Email + Slack |
| High Response Time | Response Time | 5s | 5 min | Email |
| Deployment Failed | Deployment | Failed | N/A | Email + Slack |

## 2. Supabase Monitoring

### Database Metrics

Supabase provides:
- **Query Performance** - Slow query detection
- **Connection Count** - Active connections
- **Replication Lag** - Sync delay
- **Disk Usage** - Storage consumption
- **Backup Status** - Backup success/failure

### View Metrics

1. Go to Supabase Dashboard
2. Select your project
3. Click **Monitoring** → **Database**
4. View metrics

### Configure Alerts

1. Go to **Settings** → **Alerts**
2. Click **Create Alert**

**Recommended Alerts:**

```
Alert: High Connection Count
Metric: Active Connections
Threshold: > 80
Action: Email notification

Alert: Slow Queries
Metric: Query Duration
Threshold: > 5 seconds
Action: Email notification

Alert: Backup Failed
Metric: Backup Status
Threshold: Failed
Action: Email + Slack

Alert: High Disk Usage
Metric: Disk Usage
Threshold: > 80%
Action: Email notification
```

## 3. Application Health Checks

### Health Check Endpoints

```
GET /api/health/check
GET /api/health/ready
GET /api/health/live
```

### Response Format

```json
{
  "status": "healthy",
  "timestamp": "2025-11-29T12:00:00Z",
  "database": {
    "connected": true,
    "status": "ok"
  },
  "uptime": 3600,
  "memory": {
    "heapUsed": 128,
    "heapTotal": 512,
    "external": 32,
    "rss": 256
  },
  "cpu": {
    "usage": {
      "user": 1000,
      "system": 500
    }
  },
  "environment": "production",
  "version": "1.0.0"
}
```

### Configure Health Checks in Railway

1. Go to **Settings** → **Health Check**
2. Enable **Health Check**
3. Configure:

```
Path: /api/health/check
Interval: 30 seconds
Timeout: 10 seconds
Success Threshold: 1
Failure Threshold: 3
```

## 4. Error Tracking

### Sentry Integration (Optional)

1. Sign up at https://sentry.io
2. Create new project
3. Add to environment:
   ```
   SENTRY_DSN=https://key@sentry.io/project
   ```
4. Initialize in application:
   ```typescript
   import * as Sentry from "@sentry/node";
   
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 0.1,
   });
   ```

### View Errors

1. Go to Sentry Dashboard
2. See real-time errors
3. Get stack traces and context
4. Set up alerts

## 5. Log Aggregation

### Railway Logs

Access logs:
1. Go to Railway Dashboard
2. Click **Logs** tab
3. View real-time logs
4. Search and filter logs

**Log Levels:**
- `INFO` - General information
- `WARN` - Warnings
- `ERROR` - Errors
- `DEBUG` - Debug information

### Structured Logging

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

logger.info({ userId: 123 }, 'User logged in');
logger.error({ error: err }, 'Database error');
```

## 6. Uptime Monitoring

### UptimeRobot (Free)

1. Sign up at https://uptimerobot.com
2. Create new monitor
3. Configure:

```
Monitor Type: HTTP(s)
URL: https://vendhub.yourdomain.com/api/health/check
Check Interval: 5 minutes
Alert Contacts: Email, Slack, SMS
```

### Monitoring Dashboard

1. Go to UptimeRobot Dashboard
2. View uptime percentage
3. See response times
4. Get alerts

## 7. Performance Monitoring

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Response Time (p95) | < 500ms | > 2s |
| Error Rate | < 0.1% | > 1% |
| CPU Usage | < 50% | > 80% |
| Memory Usage | < 60% | > 85% |
| Database Connections | < 20 | > 30 |
| Uptime | 99.9% | < 99.5% |

### Performance Dashboard

Create dashboard showing:
- Request rate
- Response time distribution
- Error rate
- CPU/Memory usage
- Database metrics
- Uptime percentage

## 8. Alerting Channels

### Email Alerts

1. Go to Railway **Settings** → **Alerts**
2. Add email recipients
3. Configure alert rules

### Slack Integration

1. Create Slack webhook:
   - Go to Slack App Directory
   - Search "Incoming Webhooks"
   - Create new webhook
   - Copy webhook URL

2. Add to Railway:
   - Go to **Settings** → **Integrations**
   - Add Slack webhook
   - Configure alerts

### Telegram Alerts

1. Create Telegram bot:
   ```bash
   /newbot (in BotFather)
   ```

2. Get chat ID:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getMe
   ```

3. Add to environment:
   ```
   TELEGRAM_BOT_TOKEN=<token>
   TELEGRAM_CHAT_ID=<chat_id>
   ```

## 9. Monitoring Checklist

### Hourly
- [ ] Application responding
- [ ] No error spikes
- [ ] Response time normal

### Daily
- [ ] CPU usage normal
- [ ] Memory usage normal
- [ ] Database healthy
- [ ] No failed deployments

### Weekly
- [ ] Backup completed
- [ ] No slow queries
- [ ] Uptime > 99.5%
- [ ] Error rate < 0.1%

### Monthly
- [ ] Test backup restore
- [ ] Review performance trends
- [ ] Update alert thresholds
- [ ] Security audit

## 10. Troubleshooting Alerts

### False Positives

If getting too many alerts:
1. Increase threshold
2. Increase duration
3. Adjust sensitivity
4. Review baseline metrics

### Missing Alerts

If not receiving alerts:
1. Verify alert configuration
2. Check notification channels
3. Verify email/Slack settings
4. Test alert manually

## Dashboard Template

Create dashboard with these panels:

```
┌─────────────────────────────────────────┐
│ VH-M24 Production Dashboard             │
├─────────────────────────────────────────┤
│ Uptime: 99.95%  │ Errors: 0.02%        │
├─────────────────────────────────────────┤
│ CPU Usage       │ Memory Usage          │
│ [████░░░░] 45%  │ [███░░░░░░] 32%      │
├─────────────────────────────────────────┤
│ Request Rate    │ Response Time (p95)   │
│ 1,234 req/min   │ 245ms                 │
├─────────────────────────────────────────┤
│ Database Connections │ Active Replicas  │
│ 12 / 25              │ 2 / 5            │
├─────────────────────────────────────────┤
│ Last Backup     │ Last Deployment      │
│ 2h ago ✓        │ 4h ago ✓             │
└─────────────────────────────────────────┘
```

## Support

- **Railway Docs:** https://docs.railway.app
- **Supabase Docs:** https://supabase.com/docs
- **Sentry Docs:** https://docs.sentry.io

---

**Last Updated:** 2025-11-29  
**Status:** Production Ready
