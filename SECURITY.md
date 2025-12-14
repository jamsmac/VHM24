# VendHub Manager Security Guide

> **Last Updated**: 2025-12-14
> **Version**: 1.0.0
> **Security Grade**: A- (Production Ready)

This document outlines the security architecture, practices, and procedures for VendHub Manager.

---

## Table of Contents

1. [Security Architecture Overview](#security-architecture-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Security](#api-security)
4. [Data Protection](#data-protection)
5. [Infrastructure Security](#infrastructure-security)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Incident Response](#incident-response)
8. [Security Checklist](#security-checklist)
9. [Vulnerability Reporting](#vulnerability-reporting)

---

## Security Architecture Overview

VendHub Manager implements a defense-in-depth security strategy with multiple layers of protection:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  - HTTPS enforcement                                            │
│  - CSP headers                                                  │
│  - XSS protection                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                          │
│  - Rate limiting (100 req/min)                                  │
│  - Request validation                                           │
│  - CORS whitelist                                               │
│  - Helmet security headers                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                            │
│  - JWT authentication                                           │
│  - Role-based access control (RBAC)                             │
│  - Input sanitization                                           │
│  - SQL injection prevention                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                │
│  - Encrypted connections (SSL/TLS)                              │
│  - Password hashing (bcrypt)                                    │
│  - Sensitive data encryption                                    │
│  - Audit logging                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication & Authorization

### JWT Token Configuration

| Token Type | Lifetime | Storage | Refresh |
|------------|----------|---------|---------|
| Access Token | 15 minutes | Memory/localStorage | Via refresh token |
| Refresh Token | 7 days | httpOnly cookie | Re-login required |

### Password Policy

- **Minimum length**: 8 characters
- **Required complexity**: Mix of uppercase, lowercase, numbers
- **Hashing algorithm**: bcrypt with 12 rounds
- **No password reuse**: Last 5 passwords tracked

### Role-Based Access Control (RBAC)

| Role | Description | Access Level |
|------|-------------|--------------|
| ADMIN | System administrator | Full access |
| MANAGER | Operations manager | Manage machines, tasks, users |
| OPERATOR | Field operator | Execute tasks, update machine status |
| TECHNICIAN | Maintenance staff | Maintenance and repair tasks |

### Session Security

- Device fingerprinting for session tracking
- Concurrent session limits (configurable)
- Automatic session expiration on inactivity
- Secure logout with token invalidation

---

## API Security

### Rate Limiting

```typescript
// Default configuration
{
  ttl: 60000,        // 1 minute window
  limit: 100,        // 100 requests per window
}

// Endpoint-specific limits
{
  '/auth/login': { ttl: 60000, limit: 5 },    // Prevent brute force
  '/auth/register': { ttl: 60000, limit: 3 }, // Prevent spam
  '/files/upload': { ttl: 60000, limit: 10 }, // Limit uploads
}
```

### Request Validation

All inputs are validated using class-validator decorators:

```typescript
export class CreateUserDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
```

### Security Headers (Helmet)

```typescript
// Applied headers
{
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
}
```

### CORS Configuration

```typescript
{
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
  maxAge: 86400, // 24 hours
}
```

---

## Data Protection

### Sensitive Data Handling

| Data Type | Protection Method |
|-----------|-------------------|
| Passwords | bcrypt hash (12 rounds) |
| API keys | AES-256 encryption |
| PII (email, phone) | Database-level encryption |
| Session tokens | Secure random generation |

### Database Security

- **Connection encryption**: SSL/TLS required
- **Parameterized queries**: TypeORM prevents SQL injection
- **Access control**: Principle of least privilege
- **Audit logging**: All sensitive operations logged

### File Upload Security

```typescript
// File validation
{
  maxFileSize: 5_000_000, // 5MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  // Content validation (magic bytes)
  validateContent: true,
}
```

---

## Infrastructure Security

### Environment Variables

Required security-related environment variables:

```bash
# JWT Configuration
JWT_SECRET=<strong-random-secret-min-32-chars>
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Database
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true

# Security
RATE_LIMIT_TTL=60000
RATE_LIMIT_LIMIT=100
CORS_ORIGINS=https://your-domain.com

# Encryption
ENCRYPTION_KEY=<32-byte-hex-key>
```

### Production Checklist

- [ ] HTTPS enforced (TLS 1.3)
- [ ] Debug mode disabled (`NODE_ENV=production`)
- [ ] Swagger disabled in production
- [ ] Database SSL enabled
- [ ] Strong secrets configured
- [ ] Rate limiting enabled
- [ ] CORS restricted to production domains
- [ ] Logging configured (no sensitive data)

### Docker Security

```yaml
# docker-compose.prod.yml security settings
services:
  backend:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    user: "node:node"
```

---

## Monitoring & Alerting

### Security Metrics (Prometheus)

```yaml
# Key security metrics
- vendhub_login_failures_total        # Failed login attempts
- vendhub_login_attempts_total        # Total login attempts
- vendhub_sessions_created_total      # Session creation rate
- vendhub_http_request_errors_total   # HTTP errors (incl. 429)
- vendhub_2fa_authentications_total   # 2FA success/failure
```

### Security Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighLoginFailureRate | >0.5/sec for 5min | Warning |
| SuspiciousLoginPattern | >50 failures/hour | Critical |
| RateLimitExceeded | >100 429s in 5min | Warning |
| SessionAnomalies | >10 sessions/sec | Warning |
| TokenRefreshAnomalies | >1 401/sec on refresh | Warning |

### Grafana Dashboard

Security metrics dashboard available at:
- **Dashboard**: VendHub - Security Metrics
- **Panels**: Login attempts, rate limiting, sessions, audit events

---

## Incident Response

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P0 | Active breach, data loss | Immediate |
| P1 | Security vulnerability, potential breach | <1 hour |
| P2 | Security concern, no active threat | <24 hours |
| P3 | Security improvement | Next sprint |

### Response Procedures

#### P0/P1 - Active Security Incident

1. **Contain**: Disable affected systems/accounts
2. **Assess**: Determine scope and impact
3. **Notify**: Alert stakeholders
4. **Remediate**: Apply fixes
5. **Document**: Complete incident report
6. **Review**: Post-mortem and improvements

#### Suspicious Login Activity

1. Check Grafana Security dashboard for patterns
2. Review audit logs for affected accounts
3. If brute force detected:
   - Increase rate limiting temporarily
   - Consider IP blocking
   - Notify affected users
4. Document findings

#### Rate Limit Violations

1. Identify source IPs via logs
2. Determine if legitimate traffic or attack
3. If attack:
   - Block source IPs at firewall
   - Review for vulnerability exploitation
4. If legitimate:
   - Consider rate limit adjustment
   - Contact user if identifiable

---

## Security Checklist

### Development

- [ ] All inputs validated with DTOs
- [ ] No hardcoded secrets in code
- [ ] Dependencies scanned for vulnerabilities
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection implemented (where applicable)
- [ ] Sensitive operations logged

### Deployment

- [ ] SSL/TLS certificates valid
- [ ] Environment variables secured
- [ ] Debug endpoints disabled
- [ ] Rate limiting configured
- [ ] CORS properly restricted
- [ ] Database connections encrypted
- [ ] Monitoring and alerting active

### Ongoing

- [ ] Regular dependency updates
- [ ] Security audit (quarterly)
- [ ] Penetration testing (annually)
- [ ] Access review (monthly)
- [ ] Log review (weekly)
- [ ] Backup verification (weekly)

---

## Vulnerability Reporting

### Responsible Disclosure

If you discover a security vulnerability, please report it responsibly:

1. **Email**: security@vendhub.com
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested remediation

### Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial Assessment**: Within 72 hours
- **Remediation Plan**: Within 7 days
- **Fix Deployment**: Depends on severity

### Hall of Fame

We recognize security researchers who responsibly disclose vulnerabilities.

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/overview)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

---

**Document Owner**: VendHub Security Team
**Review Cycle**: Quarterly
**Classification**: Internal Use Only
