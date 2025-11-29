# Production Testing Guide for VH-M24

## Overview

This guide covers comprehensive testing procedures for VendHub Manager before production deployment. Testing includes functionality, performance, security, and disaster recovery verification.

## Part 1: Pre-Deployment Testing

### 1.1 Code Quality Testing

**Run Unit Tests:**
```bash
pnpm test
```

**Expected Result:** All 95+ tests passing

**Check TypeScript:**
```bash
pnpm type-check
```

**Expected Result:** 0 TypeScript errors

**Run Linting:**
```bash
pnpm lint
```

**Expected Result:** No linting errors

### 1.2 Build Verification

**Build Application:**
```bash
pnpm build
```

**Expected Result:**
- Build completes without errors
- `dist/` directory created
- No warnings about missing dependencies

**Check Build Size:**
```bash
du -sh dist/
```

**Expected Result:** < 50MB (reasonable size)

### 1.3 Dependency Audit

**Check Dependencies:**
```bash
npm audit
```

**Expected Result:** No critical vulnerabilities

**Update Dependencies:**
```bash
pnpm update
pnpm audit fix
```

## Part 2: Functionality Testing

### 2.1 API Endpoint Testing

**Test Health Endpoints:**
```bash
# Health check
curl https://vendhub.yourdomain.com/api/health/check

# Readiness
curl https://vendhub.yourdomain.com/api/health/ready

# Liveness
curl https://vendhub.yourdomain.com/api/health/live
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-29T12:00:00Z",
  "uptime": 3600
}
```

### 2.2 Database Operations

**Test Database Connection:**
```bash
psql $DATABASE_URL -c "SELECT 1;"
```

**Expected Result:** `(1 row)` with value `1`

**Test CRUD Operations:**
```bash
# Create
curl -X POST https://vendhub.yourdomain.com/api/trpc/machines.create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Machine", "location": "Test Location"}'

# Read
curl https://vendhub.yourdomain.com/api/trpc/machines.list \
  -H "Authorization: Bearer $TOKEN"

# Update
curl -X PUT https://vendhub.yourdomain.com/api/trpc/machines.update \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": 1, "status": "active"}'

# Delete
curl -X DELETE https://vendhub.yourdomain.com/api/trpc/machines.delete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'
```

### 2.3 Authentication Testing

**Test Login:**
```bash
curl -X POST https://vendhub.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

**Test Token Validation:**
```bash
curl -H "Authorization: Bearer $INVALID_TOKEN" \
  https://vendhub.yourdomain.com/api/trpc/machines.list
```

**Expected Result:** 401 Unauthorized

### 2.4 Feature Testing

**Test Stock Transfers:**
- Create transfer request
- Approve transfer
- Verify inventory updated
- Check notifications sent

**Test Inventory Tracking:**
- View warehouse inventory
- View operator inventory
- View machine inventory
- Verify counts accurate

**Test Notifications:**
- Trigger notification
- Verify in NotificationCenter
- Check database entry
- Mark as read

**Test AI Agents:**
- Create product with AI suggestions
- Verify suggestions generated
- Accept/reject suggestions
- Check learning data recorded

## Part 3: Performance Testing

### 3.1 Load Testing Setup

**Install Load Testing Tool:**
```bash
npm install -g artillery
```

**Create Load Test Script:**
```yaml
# load-test.yml
config:
  target: "https://vendhub.yourdomain.com"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Ramp up"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"
    - duration: 60
      arrivalRate: 10
      name: "Cool down"

scenarios:
  - name: "API Load Test"
    flow:
      - get:
          url: "/api/health/check"
      - get:
          url: "/api/trpc/machines.list"
          headers:
            Authorization: "Bearer {{ token }}"
      - post:
          url: "/api/trpc/machines.create"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            name: "Load Test Machine"
            location: "Test"
```

### 3.2 Run Load Tests

**100 Concurrent Users:**
```bash
artillery run load-test.yml --target https://vendhub.yourdomain.com
```

**Expected Results:**
- Response time (p95) < 500ms
- Error rate < 1%
- No timeouts
- CPU < 80%
- Memory < 85%

### 3.3 Database Performance

**Query Performance:**
```bash
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM machines WHERE status = 'active';"
```

**Expected Result:** Query time < 100ms

**Connection Pool:**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity;"
```

**Expected Result:** Active connections < 20

### 3.4 Memory Leak Testing

**Monitor Memory:**
```bash
# From Railway shell
watch -n 1 'free -h'
```

**Expected Result:** Memory stable over time, no continuous increase

## Part 4: Security Testing

### 4.1 SSL/TLS Verification

**Check Certificate:**
```bash
openssl s_client -connect vendhub.yourdomain.com:443
```

**Expected Result:**
- Certificate valid
- No warnings
- Correct domain

**Test HTTPS Redirect:**
```bash
curl -I http://vendhub.yourdomain.com
```

**Expected Result:** 301 redirect to HTTPS

### 4.2 Authentication Security

**Test SQL Injection:**
```bash
curl "https://vendhub.yourdomain.com/api/trpc/machines.list?id=1' OR '1'='1"
```

**Expected Result:** Query fails safely, no data exposure

**Test XSS Protection:**
```bash
curl -X POST https://vendhub.yourdomain.com/api/trpc/machines.create \
  -H "Content-Type: application/json" \
  -d '{"name": "<script>alert(\"XSS\")</script>"}'
```

**Expected Result:** Script tags escaped or removed

**Test CSRF Protection:**
```bash
# Attempt request without CSRF token
curl -X POST https://vendhub.yourdomain.com/api/trpc/machines.create \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
```

**Expected Result:** Request rejected

### 4.3 Authorization Testing

**Test Role-Based Access:**
```bash
# Try to access admin endpoint as regular user
curl -H "Authorization: Bearer $USER_TOKEN" \
  https://vendhub.yourdomain.com/api/trpc/admin.users.list
```

**Expected Result:** 403 Forbidden

**Test Data Isolation:**
```bash
# User should only see their own data
curl -H "Authorization: Bearer $USER_TOKEN" \
  https://vendhub.yourdomain.com/api/trpc/users.list
```

**Expected Result:** Only current user returned

### 4.4 Secrets Management

**Verify No Secrets in Code:**
```bash
git log -p | grep -i "password\|secret\|key" | head -20
```

**Expected Result:** No secrets found

**Check Environment Variables:**
```bash
# From Railway shell
env | grep -v RAILWAY | head -20
```

**Expected Result:** Sensitive values not exposed

## Part 5: Disaster Recovery Testing

### 5.1 Backup Verification

**Check Backup Status:**
```bash
# In Supabase Dashboard
Settings → Backups → View backup list
```

**Expected Result:** Recent backup exists

**Test Restore Procedure:**
1. Create test database
2. Restore from backup
3. Verify data integrity
4. Compare record counts
5. Delete test database

### 5.2 Failover Testing

**Simulate Application Failure:**
1. Stop application in Railway
2. Verify health check fails
3. Wait for auto-restart
4. Verify application recovers
5. Check no data loss

**Simulate Database Failure:**
1. Disable database in Supabase
2. Verify application handles gracefully
3. Re-enable database
4. Verify recovery
5. Check data consistency

### 5.3 Rollback Testing

**Test Deployment Rollback:**
1. Deploy new version
2. Verify deployment works
3. Rollback to previous version
4. Verify rollback successful
5. Check data integrity

## Part 6: Integration Testing

### 6.1 Telegram Integration

**Test Bot Commands:**
```bash
# Send /start command to bot
# Expected: Bot responds with welcome message

# Send /status command
# Expected: Bot returns application status

# Send /help command
# Expected: Bot shows available commands
```

### 6.2 Email Integration

**Test Email Notifications:**
1. Trigger approval notification
2. Check email received
3. Verify email content
4. Check links work
5. Verify formatting

### 6.3 External API Integration

**Test Claude API:**
```bash
# Trigger AI suggestion
curl -X POST https://vendhub.yourdomain.com/api/trpc/aiAgents.suggest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agentId": 1, "input": "test"}'
```

**Expected Result:** Suggestion generated successfully

## Part 7: Monitoring Verification

### 7.1 Metrics Collection

**Verify Railway Metrics:**
1. Go to Railway Dashboard
2. Check CPU metrics displayed
3. Check Memory metrics displayed
4. Check Response time metrics
5. Verify data updating in real-time

**Verify Supabase Metrics:**
1. Go to Supabase Dashboard
2. Check Database size displayed
3. Check Connection count displayed
4. Check Query performance displayed
5. Verify data updating

### 7.2 Alert Testing

**Test CPU Alert:**
1. Generate high CPU load
2. Verify alert triggers
3. Check notification received
4. Verify auto-scaling works
5. Check alert clears

**Test Error Rate Alert:**
1. Simulate errors
2. Verify alert triggers
3. Check notification received
4. Verify dashboard updated
5. Check alert clears

### 7.3 Log Aggregation

**Verify Logs Collected:**
1. Generate application logs
2. Check logs in Railway
3. Check logs in Supabase
4. Verify timestamps accurate
5. Verify searchable

## Part 8: User Acceptance Testing (UAT)

### 8.1 Business Process Testing

**Test Stock Transfer Workflow:**
1. Create transfer request
2. Verify request appears in admin
3. Approve request
4. Verify inventory updated
5. Verify notification sent

**Test Inventory Tracking:**
1. Add inventory to warehouse
2. Transfer to operator
3. Transfer to machine
4. Verify counts accurate
5. Check audit trail

**Test Task Management:**
1. Create task
2. Assign to technician
3. Update task status
4. Complete task
5. Verify history recorded

### 8.2 User Interface Testing

**Test Dashboard:**
1. Verify all widgets load
2. Check data accuracy
3. Test filters and searches
4. Verify responsive design
5. Test on mobile devices

**Test Forms:**
1. Test required fields
2. Test validation messages
3. Test file uploads
4. Test form submission
5. Verify success message

### 8.3 Accessibility Testing

**Test Keyboard Navigation:**
1. Navigate using Tab key
2. Activate buttons with Enter
3. Verify focus visible
4. Check all interactive elements accessible

**Test Screen Reader:**
1. Use screen reader
2. Verify labels present
3. Verify headings correct
4. Check alt text on images

## Part 9: Testing Checklist

### Pre-Deployment

- [ ] All unit tests passing (95+)
- [ ] 0 TypeScript errors
- [ ] No linting errors
- [ ] Build successful
- [ ] No critical vulnerabilities
- [ ] All dependencies up to date

### Functionality

- [ ] Health endpoints working
- [ ] Database connection working
- [ ] CRUD operations working
- [ ] Authentication working
- [ ] All features working
- [ ] Integrations working

### Performance

- [ ] Response time < 500ms (p95)
- [ ] Error rate < 1%
- [ ] Load test passed (100 users)
- [ ] Memory stable
- [ ] Database queries < 100ms
- [ ] No memory leaks

### Security

- [ ] SSL/TLS valid
- [ ] HTTPS redirect working
- [ ] SQL injection protected
- [ ] XSS protected
- [ ] CSRF protected
- [ ] No secrets in code

### Disaster Recovery

- [ ] Backups working
- [ ] Restore tested
- [ ] Failover tested
- [ ] Rollback tested
- [ ] RTO verified (< 15 min)
- [ ] RPO verified (< 1 min)

### Monitoring

- [ ] Metrics collecting
- [ ] Alerts configured
- [ ] Alerts tested
- [ ] Logs aggregating
- [ ] Dashboards working
- [ ] Notifications working

### UAT

- [ ] Business processes verified
- [ ] User interface tested
- [ ] Accessibility verified
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Ready for production

## Part 10: Rollback Plan

### If Testing Fails

1. **Identify Issue**
   - Review error logs
   - Check test results
   - Determine root cause

2. **Fix Issue**
   - Update code
   - Re-run tests
   - Verify fix

3. **Re-Test**
   - Run full test suite
   - Verify fix works
   - Check for regressions

4. **Deploy Again**
   - Deploy fixed version
   - Monitor closely
   - Verify all systems

## Support & Resources

- **Jest Testing:** https://jestjs.io/docs/getting-started
- **Vitest:** https://vitest.dev/
- **Artillery Load Testing:** https://artillery.io/docs
- **OWASP Security Testing:** https://owasp.org/www-project-web-security-testing-guide/

---

**Last Updated:** 2025-11-29  
**Status:** Production Ready  
**Estimated Testing Time:** 4-6 hours  
**Estimated Go-Live:** 1 day
