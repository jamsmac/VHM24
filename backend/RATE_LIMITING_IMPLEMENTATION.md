# 🛡️ BKD-005: Rate Limiting Implementation for Auth Endpoints

**Status:** Implementation in progress
**Priority:** P0 - CRITICAL SECURITY
**Impact:** Prevents brute-force attacks
**Effort:** 2-3 hours

---

## Implementation Steps

### 1. Add Imports to auth.controller.ts

Add these imports at the top:
```typescript
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
```

### 2. Apply Rate Limits to Critical Endpoints

#### **POST /auth/login** - 5 attempts/minute
```typescript
@Post('login')
@UseGuards(ThrottlerGuard, LocalAuthGuard, IpWhitelistGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
@HttpCode(HttpStatus.OK)
```

#### **POST /auth/register** - 3 attempts/5 minutes
```typescript
@Post('register')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 attempts per 5 minutes
```

#### **POST /auth/2fa/verify** - 10 attempts/minute
```typescript
@Post('2fa/verify')
@UseGuards(ThrottlerGuard, JwtAuthGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
```

#### **POST /auth/2fa/login** - 5 attempts/minute
```typescript
@Post('2fa/login')
@UseGuards(ThrottlerGuard, JwtAuthGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
```

#### **POST /auth/password-reset/request** - 3 attempts/hour
```typescript
@Post('password-reset/request')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 attempts per hour
```

#### **POST /auth/password-reset/confirm** - 3 attempts/hour
```typescript
@Post('password-reset/confirm')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 attempts per hour
```

---

## Rate Limit Strategy

| Endpoint | Limit | TTL | Rationale |
|----------|-------|-----|-----------|
| `/login` | 5 | 1 min | Balance security vs UX for typos |
| `/register` | 3 | 5 min | Prevent account spam |
| `/2fa/verify` | 10 | 1 min | Allow for TOTP code changes (30s windows) |
| `/2fa/login` | 5 | 1 min | Match login rate |
| `/password-reset/request` | 3 | 1 hour | Prevent email spam |
| `/password-reset/confirm` | 3 | 1 hour | Prevent token guessing |
| `/refresh` | N/A | N/A | Low risk, legitimate use case |
| `/logout` | N/A | N/A | No security risk |

---

## Testing Commands

### Test Login Rate Limiting
```bash
# Should succeed 5 times, then return 429
for i in {1..7}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}' \
    -w "\nHTTP Status: %{http_code}\n\n"
  sleep 1
done
```

### Test 2FA Rate Limiting
```bash
# Should succeed 10 times, then return 429
for i in {1..12}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:3000/api/v1/auth/2fa/verify \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"code":"000000"}' \
    -w "\nHTTP Status: %{http_code}\n\n"
done
```

### Test Password Reset Rate Limiting
```bash
# Should succeed 3 times in an hour, then return 429
for i in {1..5}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:3000/api/v1/auth/password-reset/request \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com"}' \
    -w "\nHTTP Status: %{http_code}\n\n"
  sleep 2
done
```

---

## Expected Responses

### Success (under rate limit)
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 900
}
```

### Rate Limited (429)
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

---

## Configuration

ThrottlerModule is already configured globally in `app.module.ts`:
```typescript
ThrottlerModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => [
    {
      ttl: configService.get('THROTTLE_TTL', 60000), // 1 minute default
      limit: configService.get('THROTTLE_LIMIT', 100), // 100 requests per ttl
    },
  ],
  inject: [ConfigService],
})
```

Per-endpoint limits override the global default.

---

## Security Benefits

1. **Prevents Brute-Force Attacks**
   - Attackers limited to 5 login attempts/minute
   - Makes password cracking infeasible

2. **Prevents Account Enumeration**
   - Rate limiting on registration prevents discovering valid emails

3. **Prevents DoS**
   - Limits resource consumption from repeated requests

4. **Prevents Token Guessing**
   - Password reset tokens can't be brute-forced

5. **Audit Trail**
   - Rate limit violations can be logged and monitored

---

## Swagger Documentation Update

Add to each rate-limited endpoint:
```typescript
@ApiResponse({
  status: 429,
  description: 'Too many requests. Rate limit exceeded. Try again later.',
})
```

---

## Monitoring & Alerting

### Log Rate Limit Violations
```typescript
// In global exception filter
if (exception instanceof ThrottlerException) {
  this.logger.warn({
    message: 'Rate limit exceeded',
    ip: request.ip,
    endpoint: request.url,
    userAgent: request.headers['user-agent'],
  });
}
```

### Alert on Patterns
- Multiple 429s from same IP → Potential attack
- Distributed 429s → DDoS attempt
- 429s followed by successful login → Credential stuffing

---

## Future Enhancements

1. **IP-based blocking** - Block IPs with excessive violations
2. **CAPTCHA** - Require CAPTCHA after N failures
3. **Progressive delays** - Increase delay exponentially
4. **Distributed rate limiting** - Use Redis for multi-instance deployments

---

## Compliance

This implementation satisfies:
- **REQ-AUTH-44**: Rate limiting on authentication endpoints
- **OWASP**: Broken Authentication prevention
- **PCI DSS 8.1.6**: Limit repeated access attempts

---

**Next Steps:**
1. Apply changes to auth.controller.ts
2. Test all rate-limited endpoints
3. Update Swagger documentation
4. Deploy to staging
5. Monitor for false positives

