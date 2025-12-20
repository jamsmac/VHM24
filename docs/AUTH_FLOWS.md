# VendHub Manager - Authentication & Authorization Flows

> **Version**: 1.0.0
> **Last Updated**: 2025-12-19
> **Security Level**: Confidential

This document provides comprehensive documentation of all authentication and authorization flows in VendHub Manager, including all possible scenarios, edge cases, and security measures.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Staff Authentication (JWT)](#2-staff-authentication-jwt)
3. [Two-Factor Authentication (2FA)](#3-two-factor-authentication-2fa)
4. [Client Platform Authentication (Telegram)](#4-client-platform-authentication-telegram)
5. [Registration & Access Requests](#5-registration--access-requests)
6. [Password Management](#6-password-management)
7. [Session Management](#7-session-management)
8. [Security Measures](#8-security-measures)
9. [Error Handling](#9-error-handling)
10. [API Endpoints Reference](#10-api-endpoints-reference)

---

## 1. OVERVIEW

### Authentication Architecture

VendHub Manager implements a **dual-platform authentication system**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     VENDHUB AUTHENTICATION ARCHITECTURE                      │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │       STAFF PLATFORM            │  │       CLIENT PLATFORM           │  │
│  │                                 │  │                                 │  │
│  │  Authentication Methods:        │  │  Authentication Methods:        │  │
│  │  • Email + Password             │  │  • Telegram Web App initData    │  │
│  │  • 2FA (TOTP/Backup Codes)      │  │                                 │  │
│  │                                 │  │  Token Type:                    │  │
│  │  Token Type:                    │  │  • client_access (JWT)          │  │
│  │  • access_token (JWT, 15 min)   │  │                                 │  │
│  │  • refresh_token (JWT, 7 days)  │  │  Storage:                       │  │
│  │                                 │  │  • Client storage               │  │
│  │  Storage:                       │  │  • No httpOnly cookies          │  │
│  │  • httpOnly cookies (primary)   │  │                                 │  │
│  │  • Response body (fallback)     │  │  User Entity:                   │  │
│  │                                 │  │  • client_users table           │  │
│  │  User Entity:                   │  │                                 │  │
│  │  • users table                  │  └─────────────────────────────────┘  │
│  │                                 │                                        │
│  └─────────────────────────────────┘                                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        SHARED INFRASTRUCTURE                            ││
│  │  • JWT signing (JWT_SECRET)                                             ││
│  │  • Redis (session storage, token blacklist)                             ││
│  │  • Audit logging                                                        ││
│  │  • Rate limiting                                                        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| Access Token | Short-lived JWT (15 min) for API access |
| Refresh Token | Long-lived JWT (7 days) for obtaining new access tokens |
| Session | Server-side record linking user to refresh token |
| 2FA | Two-factor authentication using TOTP (Time-based OTP) |
| Backup Codes | One-time recovery codes for 2FA |
| Token Blacklist | Redis-based list of revoked tokens |

---

## 2. STAFF AUTHENTICATION (JWT)

### 2.1 Standard Login Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         STANDARD LOGIN FLOW                                   │
│                                                                               │
│   Client                        Server                         Database      │
│     │                             │                               │          │
│     │  POST /auth/login           │                               │          │
│     │  {email, password}          │                               │          │
│     │────────────────────────────►│                               │          │
│     │                             │                               │          │
│     │                             │  1. Check rate limit          │          │
│     │                             │  2. Check IP whitelist        │          │
│     │                             │                               │          │
│     │                             │  Find user by email           │          │
│     │                             │──────────────────────────────►│          │
│     │                             │                               │          │
│     │                             │◄──────────────────────────────│          │
│     │                             │                               │          │
│     │                             │  3. Check account locked?     │          │
│     │                             │  4. Validate password (bcrypt)│          │
│     │                             │  5. Check user status = ACTIVE│          │
│     │                             │                               │          │
│     │                             │  6. Check requires_password_  │          │
│     │                             │     change flag               │          │
│     │                             │  7. Check is_2fa_enabled flag │          │
│     │                             │                               │          │
│     │                             │  8. Generate JWT tokens       │          │
│     │                             │  9. Create session in DB      │          │
│     │                             │  10. Update last_login        │          │
│     │                             │  11. Log audit event          │          │
│     │                             │                               │          │
│     │◄────────────────────────────│                               │          │
│     │  200 OK                     │                               │          │
│     │  {                          │                               │          │
│     │    access_token,            │                               │          │
│     │    refresh_token,           │                               │          │
│     │    user: {...}              │                               │          │
│     │  }                          │                               │          │
│     │  + Set-Cookie: access_token │                               │          │
│     │  + Set-Cookie: refresh_token│                               │          │
│     │                             │                               │          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Login Scenarios

#### Scenario 1: Successful Login (No 2FA)

**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "operator@vendhub.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "operator@vendhub.com",
    "full_name": "Иван Операторов",
    "role": "OPERATOR"
  }
}
```

**Cookies Set:**
```
Set-Cookie: access_token=eyJ...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
Set-Cookie: refresh_token=eyJ...; HttpOnly; Secure; SameSite=Strict; Path=/auth; Max-Age=604800
```

---

#### Scenario 2: Login with 2FA Required

**Initial Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@vendhub.com",
  "password": "AdminPass123!"
}
```

**Response (200 OK) - 2FA Required:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "admin@vendhub.com",
    "full_name": "Администратор",
    "role": "ADMIN"
  },
  "requires_2fa": true
}
```

**Flow Diagram:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOGIN WITH 2FA FLOW                                  │
│                                                                              │
│  1. POST /auth/login (email + password)                                      │
│     └─► 200 OK {requires_2fa: true, access_token, refresh_token}            │
│                                                                              │
│  2. User enters TOTP code from authenticator app                             │
│                                                                              │
│  3. POST /auth/2fa/login                                                     │
│     Authorization: Bearer <access_token from step 1>                         │
│     Body: {token: "123456"}                                                  │
│     └─► 200 OK {access_token, refresh_token, user}                          │
│         (New tokens with full permissions)                                   │
│                                                                              │
│  Alternative: Use backup code                                                │
│  3b. POST /auth/2fa/login/backup                                             │
│      Authorization: Bearer <access_token from step 1>                        │
│      Body: {code: "ABCD-EFGH-1234"}                                          │
│      └─► 200 OK {access_token, refresh_token, user}                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Complete 2FA Login:**
```http
POST /api/v1/auth/2fa/login
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "token": "123456"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "admin@vendhub.com",
    "full_name": "Администратор",
    "role": "ADMIN"
  }
}
```

---

#### Scenario 3: Login with Password Change Required

**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "newuser@vendhub.com",
  "password": "TempPassword123!"
}
```

**Response (200 OK) - Password Change Required:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "email": "newuser@vendhub.com",
    "full_name": "Новый Пользователь",
    "role": "OPERATOR"
  },
  "requires_password_change": true
}
```

**Flow Diagram:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FIRST LOGIN PASSWORD CHANGE FLOW                          │
│                                                                              │
│  1. POST /auth/login (email + temporary password)                            │
│     └─► 200 OK {requires_password_change: true, access_token}               │
│                                                                              │
│  2. Client shows password change form                                        │
│                                                                              │
│  3. POST /auth/first-login-change-password                                   │
│     Authorization: Bearer <access_token from step 1>                         │
│     Body: {currentPassword: "...", newPassword: "..."}                       │
│     └─► 200 OK {access_token, refresh_token, user}                          │
│         (New tokens with full permissions)                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Change Password Request:**
```http
POST /api/v1/auth/first-login-change-password
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "currentPassword": "TempPassword123!",
  "newPassword": "MyNewSecurePass123!"
}
```

---

#### Scenario 4: Invalid Credentials

**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@vendhub.com",
  "password": "WrongPassword"
}
```

**Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Неверные учетные данные",
  "error": "Unauthorized"
}
```

**Server Actions:**
1. Increment `failed_login_attempts` for user
2. Log audit event `LOGIN_FAILED`
3. If attempts >= 5: Lock account for 15 minutes

---

#### Scenario 5: Account Locked (Brute Force Protection)

**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "locked@vendhub.com",
  "password": "AnyPassword"
}
```

**Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Аккаунт временно заблокирован. Попробуйте снова после 15:30:00",
  "error": "Unauthorized"
}
```

---

#### Scenario 6: User Not Found

**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "nonexistent@vendhub.com",
  "password": "AnyPassword"
}
```

**Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Неверные учетные данные",
  "error": "Unauthorized"
}
```

*Note: Same error message as invalid password for security (prevents user enumeration)*

---

#### Scenario 7: Inactive Account

**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "inactive@vendhub.com",
  "password": "CorrectPassword123!"
}
```

**Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Неверные учетные данные",
  "error": "Unauthorized"
}
```

*Note: Inactive accounts (status != 'active') are treated same as invalid credentials*

---

#### Scenario 8: Rate Limited

**Request (6th attempt in 1 minute):**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@vendhub.com",
  "password": "password"
}
```

**Response (429 Too Many Requests):**
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

**Headers:**
```
Retry-After: 60
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1703001234
```

---

### 2.3 Token Refresh Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           TOKEN REFRESH FLOW                                  │
│                                                                               │
│   Client                        Server                         Redis         │
│     │                             │                               │          │
│     │  POST /auth/refresh         │                               │          │
│     │  {refreshToken: "..."}      │                               │          │
│     │  OR Cookie: refresh_token   │                               │          │
│     │────────────────────────────►│                               │          │
│     │                             │                               │          │
│     │                             │  1. Verify JWT signature      │          │
│     │                             │  2. Check expiration          │          │
│     │                             │  3. Find session by token     │          │
│     │                             │  4. Verify token matches      │          │
│     │                             │     session                   │          │
│     │                             │                               │          │
│     │                             │  5. Check token not           │          │
│     │                             │     blacklisted               │          │
│     │                             │─────────────────────────────►│          │
│     │                             │                               │          │
│     │                             │◄─────────────────────────────│          │
│     │                             │                               │          │
│     │                             │  6. Generate new tokens       │          │
│     │                             │  7. Rotate refresh token      │          │
│     │                             │     in session                │          │
│     │                             │  8. Log audit event           │          │
│     │                             │                               │          │
│     │◄────────────────────────────│                               │          │
│     │  200 OK                     │                               │          │
│     │  {access_token, refresh_    │                               │          │
│     │   token}                    │                               │          │
│     │  + Set-Cookie (both)        │                               │          │
│     │                             │                               │          │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Request:**
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Or with Cookie:**
```http
POST /api/v1/auth/refresh
Cookie: refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Cases:**
- 401: Invalid/expired refresh token
- 401: Session not found
- 401: Token blacklisted

---

### 2.4 Logout Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              LOGOUT FLOW                                      │
│                                                                               │
│   Client                        Server                    Redis / DB         │
│     │                             │                           │              │
│     │  POST /auth/logout          │                           │              │
│     │  Authorization: Bearer ...  │                           │              │
│     │────────────────────────────►│                           │              │
│     │                             │                           │              │
│     │                             │  1. Verify JWT            │              │
│     │                             │  2. Get user ID           │              │
│     │                             │                           │              │
│     │                             │  3. Blacklist all user    │              │
│     │                             │     tokens in Redis       │              │
│     │                             │─────────────────────────►│              │
│     │                             │                           │              │
│     │                             │  4. Revoke all sessions   │              │
│     │                             │     in database           │              │
│     │                             │─────────────────────────►│              │
│     │                             │                           │              │
│     │                             │  5. Log audit event       │              │
│     │                             │                           │              │
│     │◄────────────────────────────│                           │              │
│     │  204 No Content             │                           │              │
│     │  Set-Cookie: access_token=  │                           │              │
│     │    (cleared)                │                           │              │
│     │  Set-Cookie: refresh_token= │                           │              │
│     │    (cleared)                │                           │              │
│     │                             │                           │              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Request:**
```http
POST /api/v1/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (204 No Content)**

**Note:** Logout is GLOBAL - revokes ALL user sessions across all devices.

---

## 3. TWO-FACTOR AUTHENTICATION (2FA)

### 3.1 2FA Setup Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            2FA SETUP FLOW                                     │
│                                                                               │
│   User                   Client                        Server                │
│     │                      │                             │                   │
│     │  Click "Enable 2FA"  │                             │                   │
│     │─────────────────────►│                             │                   │
│     │                      │                             │                   │
│     │                      │  POST /auth/2fa/setup       │                   │
│     │                      │  Authorization: Bearer ...  │                   │
│     │                      │────────────────────────────►│                   │
│     │                      │                             │                   │
│     │                      │                             │  Generate TOTP   │
│     │                      │                             │  secret          │
│     │                      │                             │  Generate QR     │
│     │                      │                             │  code            │
│     │                      │                             │                   │
│     │                      │◄────────────────────────────│                   │
│     │                      │  {secret, qrCode,           │                   │
│     │                      │   manualEntryKey}           │                   │
│     │                      │                             │                   │
│     │  Show QR code        │                             │                   │
│     │◄─────────────────────│                             │                   │
│     │                      │                             │                   │
│     │  Scan with           │                             │                   │
│     │  authenticator app   │                             │                   │
│     │                      │                             │                   │
│     │  Enter code: 123456  │                             │                   │
│     │─────────────────────►│                             │                   │
│     │                      │                             │                   │
│     │                      │  POST /auth/2fa/enable      │                   │
│     │                      │  {secret, token: "123456"}  │                   │
│     │                      │────────────────────────────►│                   │
│     │                      │                             │                   │
│     │                      │                             │  Verify TOTP     │
│     │                      │                             │  code            │
│     │                      │                             │  Save secret to  │
│     │                      │                             │  user            │
│     │                      │                             │  Set is_2fa_     │
│     │                      │                             │  enabled = true  │
│     │                      │                             │  Generate backup │
│     │                      │                             │  codes           │
│     │                      │                             │                   │
│     │                      │◄────────────────────────────│                   │
│     │                      │  {success: true,            │                   │
│     │                      │   backupCodes: [...]}       │                   │
│     │                      │                             │                   │
│     │  Show backup codes   │                             │                   │
│     │  (user must save!)   │                             │                   │
│     │◄─────────────────────│                             │                   │
│     │                      │                             │                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 2FA Verification Methods

#### Method 1: TOTP Code (Primary)

```http
POST /api/v1/auth/2fa/login
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "token": "123456"
}
```

#### Method 2: Backup Code (Recovery)

```http
POST /api/v1/auth/2fa/login/backup
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "code": "ABCD-EFGH-1234"
}
```

**Note:** Each backup code can only be used ONCE. After use, it is invalidated.

### 3.3 2FA Disable Flow

```http
POST /api/v1/auth/2fa/disable
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "token": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "2FA успешно отключена"
}
```

---

## 4. CLIENT PLATFORM AUTHENTICATION (Telegram)

### 4.1 Telegram Web App Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                   TELEGRAM WEB APP AUTHENTICATION FLOW                        │
│                                                                               │
│   Telegram                  Web App                       Backend            │
│     │                         │                             │                │
│     │  User opens mini app    │                             │                │
│     │────────────────────────►│                             │                │
│     │                         │                             │                │
│     │  Telegram provides      │                             │                │
│     │  initData in WebApp     │                             │                │
│     │  window.Telegram.       │                             │                │
│     │  WebApp.initData        │                             │                │
│     │────────────────────────►│                             │                │
│     │                         │                             │                │
│     │                         │  POST /api/client/auth      │                │
│     │                         │  {initData: "query_id=...   │                │
│     │                         │   &user=...&hash=..."}      │                │
│     │                         │────────────────────────────►│                │
│     │                         │                             │                │
│     │                         │                             │  1. Parse      │
│     │                         │                             │     initData   │
│     │                         │                             │  2. Validate   │
│     │                         │                             │     HMAC hash  │
│     │                         │                             │     using bot  │
│     │                         │                             │     token      │
│     │                         │                             │  3. Check      │
│     │                         │                             │     auth_date  │
│     │                         │                             │     freshness  │
│     │                         │                             │  4. Find/create│
│     │                         │                             │     client_user│
│     │                         │                             │  5. Generate   │
│     │                         │                             │     client JWT │
│     │                         │                             │                │
│     │                         │◄────────────────────────────│                │
│     │                         │  {                          │                │
│     │                         │    token: "...",            │                │
│     │                         │    client: {                │                │
│     │                         │      id, telegram_id,       │                │
│     │                         │      points_balance,        │                │
│     │                         │      level                  │                │
│     │                         │    }                        │                │
│     │                         │  }                          │                │
│     │                         │                             │                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 initData Validation

The initData string from Telegram contains:

```
query_id=AAHdF6IQAAAAAN0XohD...
&user={"id":123456789,"first_name":"John",...}
&auth_date=1234567890
&hash=abc123...
```

**Validation Steps:**
1. Parse query string parameters
2. Sort parameters alphabetically (excluding hash)
3. Create data-check-string: `param1=value1\nparam2=value2\n...`
4. Calculate HMAC-SHA256 using `secret_key = HMAC-SHA256(bot_token, "WebAppData")`
5. Compare calculated hash with received hash
6. Verify auth_date is within acceptable time window (e.g., 24 hours)

### 4.3 Client Token Structure

```typescript
interface ClientTokenPayload {
  sub: string;          // client_user.id
  telegram_id: string;  // telegram user ID
  type: 'client_access' // distinguishes from staff tokens
  iat: number;          // issued at
  exp: number;          // expiration
}
```

---

## 5. REGISTRATION & ACCESS REQUESTS

### 5.1 Staff Self-Registration Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       STAFF SELF-REGISTRATION FLOW                            │
│                                                                               │
│   User                      Server                         Admin             │
│     │                         │                              │               │
│     │  POST /auth/register    │                              │               │
│     │  {email, password,      │                              │               │
│     │   full_name, phone}     │                              │               │
│     │────────────────────────►│                              │               │
│     │                         │                              │               │
│     │                         │  1. Validate email unique    │               │
│     │                         │  2. Hash password (bcrypt)   │               │
│     │                         │  3. Create user with:        │               │
│     │                         │     - role: VIEWER           │               │
│     │                         │     - status: PENDING        │               │
│     │                         │                              │               │
│     │◄────────────────────────│                              │               │
│     │  201 Created            │                              │               │
│     │  {success: true,        │                              │               │
│     │   message: "Ожидайте    │                              │               │
│     │   одобрения..."}        │                              │               │
│     │                         │                              │               │
│     │                         │  Notify admin about          │               │
│     │                         │  new registration            │               │
│     │                         │─────────────────────────────►│               │
│     │                         │                              │               │
│     │                         │                              │  Admin reviews│
│     │                         │                              │  and approves │
│     │                         │                              │               │
│     │                         │  PATCH /users/{id}           │               │
│     │                         │  {status: "active",          │               │
│     │                         │   role: "OPERATOR"}          │               │
│     │                         │◄─────────────────────────────│               │
│     │                         │                              │               │
│     │  Notification: Account  │                              │               │
│     │  approved               │                              │               │
│     │◄────────────────────────│                              │               │
│     │                         │                              │               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Telegram Access Request Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     TELEGRAM ACCESS REQUEST FLOW                              │
│                                                                               │
│   Telegram User            Bot                  Server                Admin  │
│       │                     │                     │                    │     │
│       │  /start             │                     │                    │     │
│       │────────────────────►│                     │                    │     │
│       │                     │                     │                    │     │
│       │  Welcome! Request   │                     │                    │     │
│       │  access to system?  │                     │                    │     │
│       │◄────────────────────│                     │                    │     │
│       │                     │                     │                    │     │
│       │  [Request Access]   │                     │                    │     │
│       │────────────────────►│                     │                    │     │
│       │                     │                     │                    │     │
│       │                     │  POST /access-      │                    │     │
│       │                     │  requests           │                    │     │
│       │                     │  {telegram_id,      │                    │     │
│       │                     │   telegram_username,│                    │     │
│       │                     │   first_name, ...}  │                    │     │
│       │                     │────────────────────►│                    │     │
│       │                     │                     │                    │     │
│       │                     │                     │  Create access     │     │
│       │                     │                     │  request with      │     │
│       │                     │                     │  status: NEW       │     │
│       │                     │                     │                    │     │
│       │                     │◄────────────────────│                    │     │
│       │                     │  201 Created        │                    │     │
│       │                     │                     │                    │     │
│       │  Request submitted! │                     │                    │     │
│       │  Wait for approval  │                     │                    │     │
│       │◄────────────────────│                     │                    │     │
│       │                     │                     │                    │     │
│       │                     │                     │  Notify admin      │     │
│       │                     │                     │──────────────────►│     │
│       │                     │                     │                    │     │
│       │                     │                     │                    │     │
│       │                     │                     │  POST /access-     │     │
│       │                     │                     │  requests/{id}/    │     │
│       │                     │                     │  approve           │     │
│       │                     │                     │  {role_names,      │     │
│       │                     │                     │   email}           │     │
│       │                     │                     │◄───────────────────│     │
│       │                     │                     │                    │     │
│       │                     │                     │  1. Create user    │     │
│       │                     │                     │  2. Assign roles   │     │
│       │                     │                     │  3. Generate temp  │     │
│       │                     │                     │     password       │     │
│       │                     │                     │  4. Update request │     │
│       │                     │                     │     status         │     │
│       │                     │                     │                    │     │
│       │  Your request was   │                     │                    │     │
│       │  approved! Login    │                     │                    │     │
│       │  with: email/pass   │                     │                    │     │
│       │◄────────────────────│                     │                    │     │
│       │                     │                     │                    │     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Access Request Statuses

| Status | Description |
|--------|-------------|
| `NEW` | Request pending admin review |
| `APPROVED` | Request approved, user account created |
| `REJECTED` | Request rejected by admin |

---

## 6. PASSWORD MANAGEMENT

### 6.1 Password Reset Flow (Forgot Password)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        PASSWORD RESET FLOW                                    │
│                                                                               │
│   User                      Server                         Email             │
│     │                         │                              │               │
│     │  POST /auth/password-   │                              │               │
│     │  reset/request          │                              │               │
│     │  {email: "..."}         │                              │               │
│     │────────────────────────►│                              │               │
│     │                         │                              │               │
│     │                         │  1. Find user by email       │               │
│     │                         │  2. If not found: still      │               │
│     │                         │     return success (security)│               │
│     │                         │  3. Invalidate old tokens    │               │
│     │                         │  4. Create new reset token   │               │
│     │                         │     (UUID, expires in 1 hr)  │               │
│     │                         │  5. Send reset email         │               │
│     │                         │─────────────────────────────►│               │
│     │                         │                              │               │
│     │◄────────────────────────│                              │               │
│     │  200 OK                 │                              │               │
│     │  {success: true,        │                              │               │
│     │   message: "If email    │                              │               │
│     │   exists..."}           │                              │               │
│     │                         │                              │               │
│     │                         │                              │  Email with   │
│     │                         │                              │  reset link   │
│     │◄──────────────────────────────────────────────────────│               │
│     │                         │                              │               │
│     │  Click reset link:      │                              │               │
│     │  /reset?token=xxx       │                              │               │
│     │                         │                              │               │
│     │  POST /auth/password-   │                              │               │
│     │  reset/validate         │                              │               │
│     │  {token: "xxx"}         │                              │               │
│     │────────────────────────►│                              │               │
│     │                         │                              │               │
│     │                         │  Validate token:             │               │
│     │                         │  - Exists?                   │               │
│     │                         │  - Not expired?              │               │
│     │                         │  - Not used?                 │               │
│     │                         │                              │               │
│     │◄────────────────────────│                              │               │
│     │  {valid: true}          │                              │               │
│     │                         │                              │               │
│     │  POST /auth/password-   │                              │               │
│     │  reset/confirm          │                              │               │
│     │  {token: "xxx",         │                              │               │
│     │   newPassword: "..."}   │                              │               │
│     │────────────────────────►│                              │               │
│     │                         │                              │               │
│     │                         │  1. Validate token again     │               │
│     │                         │  2. Hash new password        │               │
│     │                         │  3. Update user password     │               │
│     │                         │  4. Invalidate refresh token │               │
│     │                         │  5. Reset failed attempts    │               │
│     │                         │  6. Mark token as used       │               │
│     │                         │  7. Log audit event          │               │
│     │                         │                              │               │
│     │◄────────────────────────│                              │               │
│     │  200 OK                 │                              │               │
│     │  {success: true,        │                              │               │
│     │   message: "Password    │                              │               │
│     │   changed"}             │                              │               │
│     │                         │                              │               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Password Requirements

| Requirement | Description |
|-------------|-------------|
| Minimum Length | 8 characters |
| Uppercase | At least 1 uppercase letter |
| Lowercase | At least 1 lowercase letter |
| Numbers | At least 1 digit |
| Special Characters | At least 1 special character (!@#$%^&*) |

---

## 7. SESSION MANAGEMENT

### 7.1 Session Data Structure

```typescript
interface Session {
  id: string;                    // UUID
  user_id: string;               // Reference to user
  refresh_token_hash: string;    // Hashed refresh token
  ip_address: string;            // Client IP
  user_agent: string;            // Browser/device info
  last_activity: Date;           // Last token refresh
  expires_at: Date;              // Session expiration
  revoked_at?: Date;             // When revoked (if any)
  revoke_reason?: string;        // Why revoked
  created_at: Date;
}
```

### 7.2 View Active Sessions

```http
GET /api/v1/auth/sessions
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "data": [
    {
      "id": "session-uuid-1",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...",
      "last_activity": "2025-01-15T14:30:00Z",
      "created_at": "2025-01-15T10:00:00Z",
      "is_current": true
    },
    {
      "id": "session-uuid-2",
      "ip_address": "10.0.0.50",
      "user_agent": "VendHub Mobile/1.0.0 (Android 14)",
      "last_activity": "2025-01-15T12:00:00Z",
      "created_at": "2025-01-14T09:00:00Z",
      "is_current": false
    }
  ]
}
```

### 7.3 Revoke Specific Session

```http
POST /api/v1/auth/sessions/{sessionId}/revoke
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response: 204 No Content**

### 7.4 Revoke All Other Sessions

```http
POST /api/v1/auth/sessions/revoke-others
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "currentRefreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "revoked": 3
}
```

---

## 8. SECURITY MEASURES

### 8.1 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /auth/login | 5 requests | 1 minute |
| POST /auth/register | 3 requests | 5 minutes |
| POST /auth/refresh | 10 requests | 1 minute |
| POST /auth/password-reset/* | 3 requests | 1 hour |
| POST /auth/2fa/* | 5-10 requests | 1 minute |

### 8.2 Brute Force Protection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BRUTE FORCE PROTECTION LOGIC                              │
│                                                                              │
│   Failed Login Attempt                                                       │
│         │                                                                    │
│         ▼                                                                    │
│   Increment failed_login_attempts                                            │
│         │                                                                    │
│         ▼                                                                    │
│   ┌─────────────────────────────┐                                           │
│   │ failed_login_attempts >= 5? │                                           │
│   └─────────────────────────────┘                                           │
│         │                                                                    │
│    Yes  │  No                                                                │
│         ▼                                                                    │
│   ┌─────────────────────────────┐                                           │
│   │ Lock account for 15 minutes │                                           │
│   │ Set account_locked_until    │                                           │
│   │ Log BRUTE_FORCE_DETECTED    │                                           │
│   └─────────────────────────────┘                                           │
│                                                                              │
│   On Successful Login:                                                       │
│   - Reset failed_login_attempts = 0                                          │
│   - Clear account_locked_until                                               │
│                                                                              │
│   Configuration (Environment Variables):                                     │
│   - BRUTE_FORCE_MAX_ATTEMPTS = 5                                            │
│   - BRUTE_FORCE_LOCKOUT_MINUTES = 15                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Token Security

| Security Measure | Implementation |
|------------------|----------------|
| JWT Signing | HMAC-SHA256 with JWT_SECRET |
| Token Rotation | New refresh token on each refresh |
| Token Blacklisting | Redis-based blacklist on logout |
| httpOnly Cookies | Prevents XSS token theft |
| Secure Flag | HTTPS-only cookies |
| SameSite | Strict - prevents CSRF |
| Unique JWT ID | Each token has unique jti for revocation |

### 8.4 Audit Logging

All authentication events are logged:

| Event Type | When Logged |
|------------|-------------|
| LOGIN_SUCCESS | Successful login |
| LOGIN_FAILED | Failed login attempt |
| LOGOUT | User logout |
| TWO_FA_VERIFIED | 2FA code verified |
| TWO_FA_ENABLED | 2FA enabled |
| TWO_FA_DISABLED | 2FA disabled |
| PASSWORD_CHANGED | Password changed |
| PASSWORD_RESET_REQUESTED | Reset email requested |
| BRUTE_FORCE_DETECTED | Account locked |
| SESSION_REVOKED | Session manually revoked |

---

## 9. ERROR HANDLING

### 9.1 Authentication Errors

| HTTP Code | Error | Description |
|-----------|-------|-------------|
| 400 | Bad Request | Invalid request body, missing fields |
| 401 | Unauthorized | Invalid credentials, expired token |
| 403 | Forbidden | IP not whitelisted, account not active |
| 404 | Not Found | User or resource not found |
| 409 | Conflict | Email already exists (registration) |
| 429 | Too Many Requests | Rate limit exceeded |

### 9.2 Error Response Format

```json
{
  "statusCode": 401,
  "message": "Неверные учетные данные",
  "error": "Unauthorized",
  "timestamp": "2025-01-15T14:30:00.000Z",
  "path": "/api/v1/auth/login"
}
```

---

## 10. API ENDPOINTS REFERENCE

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /auth/login | Staff login | No |
| POST | /auth/register | Staff registration | No |
| POST | /auth/refresh | Refresh tokens | No (uses refresh token) |
| POST | /auth/logout | Global logout | Yes |
| GET | /auth/profile | Get current user | Yes |

### Password Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /auth/password-reset/request | Request reset | No |
| POST | /auth/password-reset/validate | Validate token | No |
| POST | /auth/password-reset/confirm | Reset password | No |
| POST | /auth/first-login-change-password | First login change | Yes |

### Two-Factor Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /auth/2fa/setup | Generate 2FA secret | Yes |
| POST | /auth/2fa/enable | Enable 2FA | Yes |
| POST | /auth/2fa/disable | Disable 2FA | Yes |
| POST | /auth/2fa/verify | Verify code | Yes |
| POST | /auth/2fa/login | Complete 2FA login | Yes |
| POST | /auth/2fa/login/backup | Login with backup code | Yes |

### Session Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /auth/sessions | Get active sessions | Yes |
| GET | /auth/sessions/all | Get all sessions | Yes |
| POST | /auth/sessions/:id/revoke | Revoke session | Yes |
| POST | /auth/sessions/revoke-others | Revoke other sessions | Yes |

### Client Platform

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/client/auth | Telegram auth | No |

### Access Requests

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /access-requests | List requests | Yes (Admin) |
| GET | /access-requests/:id | Get request | Yes (Admin) |
| POST | /access-requests | Create request | No |
| POST | /access-requests/:id/approve | Approve | Yes (Admin) |
| POST | /access-requests/:id/reject | Reject | Yes (Admin) |

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-19
**Author**: VendHub Development Team
**Security Classification**: Internal Use Only
