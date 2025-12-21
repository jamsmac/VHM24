# Security Module

## Overview

The Security module provides comprehensive security features for VendHub Manager including two-factor authentication (2FA), data encryption, session management, security event logging, and access control.

## Key Features

- Multi-method 2FA (TOTP, SMS, Email, Backup Codes)
- Data encryption service
- Session logging and management
- Security event tracking
- Access control configuration
- Brute-force protection

## Entities

### TwoFactorAuth

**File**: `backend/src/modules/security/entities/two-factor-auth.entity.ts`

```typescript
@Entity('two_factor_auth')
@Index(['user_id'])
export class TwoFactorAuth extends BaseEntity {
  user_id: string;                 // User reference (unique)
  method: TwoFactorMethod;         // 2FA method
  is_enabled: boolean;             // 2FA enabled
  is_verified: boolean;            // Setup completed
  secret: string | null;           // Encrypted TOTP secret
  phone_number: string | null;     // For SMS 2FA
  email: string | null;            // For email 2FA
  backup_codes: string[];          // Hashed backup codes
  backup_codes_used: number;       // Count of used backup codes
  enabled_at: Date | null;         // When enabled
  last_used_at: Date | null;       // Last successful 2FA
  failed_attempts: number;         // Failed attempt count
  locked_until: Date | null;       // Lockout timestamp
  metadata: {
    device_info?: Record<string, unknown>;
    recovery_email?: string;
  };
}
```

### 2FA Methods

| Method | Value | Description |
|--------|-------|-------------|
| TOTP | `totp` | Google Authenticator / time-based codes |
| SMS | `sms` | SMS text message codes |
| Email | `email` | Email verification codes |
| Backup Codes | `backup_codes` | One-time recovery codes |

### SecurityEvent

**File**: `backend/src/modules/security/entities/security-event.entity.ts`

```typescript
@Entity('security_events')
export class SecurityEvent extends BaseEntity {
  user_id: string | null;          // User if identified
  event_type: SecurityEventType;   // Type of event
  severity: EventSeverity;         // Event severity
  ip_address: string;              // Client IP
  user_agent: string;              // Browser info
  endpoint: string;                // API endpoint
  request_data: object;            // Request details
  response_code: number;           // HTTP response
  is_suspicious: boolean;          // Flagged suspicious
  notes: string;                   // Additional notes
}
```

### Security Event Types

| Type | Description |
|------|-------------|
| LOGIN_SUCCESS | Successful login |
| LOGIN_FAILED | Failed login attempt |
| LOGIN_BLOCKED | Login blocked (rate limit/lockout) |
| 2FA_ENABLED | 2FA was enabled |
| 2FA_DISABLED | 2FA was disabled |
| 2FA_SUCCESS | 2FA verification passed |
| 2FA_FAILED | 2FA verification failed |
| PASSWORD_CHANGED | Password was changed |
| PASSWORD_RESET | Password reset requested |
| SESSION_CREATED | New session created |
| SESSION_REVOKED | Session was revoked |
| PERMISSION_DENIED | Access denied |
| DATA_EXPORT | Data was exported |
| SUSPICIOUS_ACTIVITY | Suspicious activity detected |

### SessionLog

**File**: `backend/src/modules/security/entities/session-log.entity.ts`

```typescript
@Entity('session_logs')
export class SessionLog extends BaseEntity {
  user_id: string;                 // User reference
  session_token: string;           // Session identifier (hashed)
  ip_address: string;              // Login IP
  user_agent: string;              // Browser info
  device_type: string;             // desktop, mobile, tablet
  location: string;                // Geo location (if available)
  started_at: Date;                // Session start
  last_activity_at: Date;          // Last activity
  ended_at: Date | null;           // Session end (logout)
  is_active: boolean;              // Currently active
  revoked_reason: string | null;   // Why revoked
}
```

### DataEncryption

**File**: `backend/src/modules/security/entities/data-encryption.entity.ts`

```typescript
@Entity('data_encryption')
export class DataEncryption extends BaseEntity {
  entity_type: string;             // Type of encrypted entity
  entity_id: string;               // ID of encrypted entity
  field_name: string;              // Encrypted field name
  encrypted_value: string;         // Encrypted data
  encryption_key_id: string;       // Key identifier
  algorithm: string;               // Encryption algorithm
  iv: string;                      // Initialization vector
}
```

## API Endpoints

### Two-Factor Authentication

```
POST   /api/security/2fa/enable         Enable 2FA
POST   /api/security/2fa/verify         Verify 2FA setup
POST   /api/security/2fa/disable        Disable 2FA
POST   /api/security/2fa/validate       Validate 2FA code
POST   /api/security/2fa/backup-codes   Generate backup codes
GET    /api/security/2fa/status         Get 2FA status
```

### Sessions

```
GET    /api/security/sessions           List user sessions
DELETE /api/security/sessions/:id       Revoke session
DELETE /api/security/sessions/all       Revoke all sessions
GET    /api/security/sessions/current   Get current session
```

### Security Events

```
GET    /api/security/events             List security events (admin)
GET    /api/security/events/user/:id    Get user's security events
POST   /api/security/events/report      Report suspicious activity
```

## 2FA Workflow

### Enable TOTP

```
┌─────────────────────────────────────────────────────────────────┐
│                     ENABLE TOTP 2FA                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User requests 2FA setup                                      │
│         │                                                        │
│         ▼                                                        │
│  2. Server generates TOTP secret                                 │
│         │                                                        │
│         ▼                                                        │
│  3. Server returns QR code URL for authenticator app            │
│         │                                                        │
│         ▼                                                        │
│  4. User scans QR code with Google Authenticator                │
│         │                                                        │
│         ▼                                                        │
│  5. User enters 6-digit code to verify                          │
│         │                                                        │
│         ▼                                                        │
│  6. Server validates code against secret                        │
│         │                                                        │
│         ├─── Valid → Enable 2FA, generate backup codes          │
│         │                                                        │
│         └─── Invalid → Show error, retry                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Login with 2FA

```
┌─────────────────────────────────────────────────────────────────┐
│                   LOGIN WITH 2FA                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User enters email/password                                   │
│         │                                                        │
│         ▼                                                        │
│  2. Server validates credentials                                 │
│         │                                                        │
│         ├─── Invalid → Return error                             │
│         │                                                        │
│         ▼                                                        │
│  3. Check if 2FA is enabled                                      │
│         │                                                        │
│         ├─── No 2FA → Issue tokens, login complete              │
│         │                                                        │
│         ▼                                                        │
│  4. Return 2FA required response                                 │
│         │                                                        │
│         ▼                                                        │
│  5. User enters 2FA code                                         │
│         │                                                        │
│         ▼                                                        │
│  6. Validate 2FA code                                            │
│         │                                                        │
│         ├─── Valid → Issue tokens, login complete               │
│         │                                                        │
│         └─── Invalid → Increment failed attempts                │
│                    │                                             │
│                    └─── Too many failures → Lock account        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Service Methods

### TwoFactorAuthService

| Method | Description |
|--------|-------------|
| `enable()` | Start 2FA setup, return QR code |
| `verify()` | Verify setup with code |
| `disable()` | Disable 2FA for user |
| `validate()` | Validate 2FA code during login |
| `generateBackupCodes()` | Generate new backup codes |
| `useBackupCode()` | Use a backup code |
| `getStatus()` | Get user's 2FA status |
| `handleFailedAttempt()` | Track failed attempts |
| `unlock()` | Unlock locked account |

### SecurityEventService

| Method | Description |
|--------|-------------|
| `log()` | Log security event |
| `logLogin()` | Log login attempt |
| `logPasswordChange()` | Log password change |
| `getByUser()` | Get user's security events |
| `getSuspicious()` | Get suspicious events |
| `analyze()` | Analyze patterns for threats |

### SessionLogService

| Method | Description |
|--------|-------------|
| `create()` | Create new session log |
| `updateActivity()` | Update last activity |
| `revoke()` | Revoke session |
| `revokeAll()` | Revoke all user sessions |
| `getActive()` | Get active sessions |
| `cleanup()` | Clean old sessions |

### EncryptionService

| Method | Description |
|--------|-------------|
| `encrypt()` | Encrypt sensitive data |
| `decrypt()` | Decrypt data |
| `hashPassword()` | Hash password with bcrypt |
| `verifyPassword()` | Verify password hash |
| `generateToken()` | Generate secure token |
| `rotateKeys()` | Rotate encryption keys |

## Brute-Force Protection

### Login Attempt Tracking

```typescript
// After N failed attempts, lock account
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

async handleFailedLogin(userId: string): Promise<void> {
  const user = await this.userRepository.findOne(userId);
  user.failed_login_attempts++;

  if (user.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
    user.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    await this.securityEventService.log({
      user_id: userId,
      event_type: SecurityEventType.LOGIN_BLOCKED,
      severity: EventSeverity.HIGH,
    });
  }

  await this.userRepository.save(user);
}
```

### 2FA Attempt Limiting

```typescript
const MAX_2FA_ATTEMPTS = 3;

async handleFailed2FA(userId: string): Promise<void> {
  const twoFactor = await this.twoFactorRepository.findOne({ user_id: userId });
  twoFactor.failed_attempts++;

  if (twoFactor.failed_attempts >= MAX_2FA_ATTEMPTS) {
    twoFactor.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  }

  await this.twoFactorRepository.save(twoFactor);
}
```

## Backup Codes

### Generation

```typescript
async generateBackupCodes(userId: string): Promise<string[]> {
  const codes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
    hashedCodes.push(await bcrypt.hash(code, 10));
  }

  await this.twoFactorRepository.update(
    { user_id: userId },
    { backup_codes: hashedCodes, backup_codes_used: 0 }
  );

  return codes; // Return plain codes to user (show once)
}
```

### Usage

```typescript
async useBackupCode(userId: string, code: string): Promise<boolean> {
  const twoFactor = await this.twoFactorRepository.findOne({ user_id: userId });

  for (let i = 0; i < twoFactor.backup_codes.length; i++) {
    if (await bcrypt.compare(code, twoFactor.backup_codes[i])) {
      // Remove used code
      twoFactor.backup_codes.splice(i, 1);
      twoFactor.backup_codes_used++;
      await this.twoFactorRepository.save(twoFactor);
      return true;
    }
  }

  return false;
}
```

## Session Management

### Active Sessions Display

```typescript
interface ActiveSession {
  id: string;
  device_type: string;
  browser: string;
  ip_address: string;
  location: string;
  started_at: Date;
  last_activity_at: Date;
  is_current: boolean;
}
```

### Revoke All Sessions

```typescript
async revokeAllSessions(userId: string, exceptCurrent?: string): Promise<void> {
  await this.sessionLogRepository.update(
    {
      user_id: userId,
      is_active: true,
      ...(exceptCurrent && { id: Not(exceptCurrent) }),
    },
    {
      is_active: false,
      ended_at: new Date(),
      revoked_reason: 'User requested logout from all devices',
    }
  );

  // Invalidate tokens in Redis
  await this.tokenService.revokeAllUserTokens(userId, exceptCurrent);
}
```

## Integration with Other Modules

### Auth

- 2FA verification during login
- Session management
- Password change logging

### Users

- 2FA status in user profile
- Security settings management

### Audit Logs

- Security events logged to audit trail
- Compliance reporting

### Notifications

- Login from new device alerts
- 2FA status change notifications

## Best Practices

1. **Encourage 2FA**: Prompt users to enable 2FA
2. **Secure Backup Codes**: Show backup codes only once
3. **Session Hygiene**: Regularly review active sessions
4. **Monitor Events**: Review security event logs
5. **Rate Limiting**: Implement on all auth endpoints

## Related Modules

- [Auth](../auth/README.md) - Authentication
- [Users](../users/README.md) - User management
- [Audit Logs](../audit-logs/README.md) - Event tracking
- [Notifications](../notifications/README.md) - Security alerts
