# VendHub Manager - Двухфакторная Аутентификация (2FA)

> **Версия**: 2.0.0
> **Обновлено**: 2025-12-20
> **Исходный код**: `backend/src/modules/auth/services/two-factor-auth.service.ts`

---

## Содержание

1. [Обзор 2FA](#1-обзор-2fa)
2. [TOTP Алгоритм](#2-totp-алгоритм)
3. [Шифрование Секретов](#3-шифрование-секретов)
4. [Настройка 2FA](#4-настройка-2fa)
5. [Включение 2FA](#5-включение-2fa)
6. [Верификация Кода](#6-верификация-кода)
7. [Резервные Коды](#7-резервные-коды)
8. [Отключение 2FA](#8-отключение-2fa)
9. [Восстановление Доступа](#9-восстановление-доступа)
10. [API Endpoints](#10-api-endpoints)

---

## 1. Обзор 2FA

### 1.1 Что такое TOTP?

**TOTP (Time-based One-Time Password)** - алгоритм генерации одноразовых паролей на основе времени (RFC 6238).

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              TOTP OVERVIEW                                       │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         Как это работает                                 │   │
│  │                                                                          │   │
│  │  1. Сервер генерирует секретный ключ (Base32, 20 байт)                  │   │
│  │                                                                          │   │
│  │  2. Пользователь сканирует QR-код в приложении-аутентификаторе:         │   │
│  │     • Google Authenticator                                               │   │
│  │     • Microsoft Authenticator                                            │   │
│  │     • Authy                                                              │   │
│  │     • 1Password                                                          │   │
│  │                                                                          │   │
│  │  3. Каждые 30 секунд генерируется новый 6-значный код:                  │   │
│  │                                                                          │   │
│  │     TOTP = HMAC-SHA1(secret, floor(time / 30)) mod 10^6                 │   │
│  │                                                                          │   │
│  │  4. Пользователь вводит код при входе                                   │   │
│  │                                                                          │   │
│  │  5. Сервер проверяет код (±1 временное окно для погрешности часов)      │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         Параметры TOTP                                   │   │
│  │                                                                          │   │
│  │  Алгоритм:        SHA-1 (стандарт для большинства аутентификаторов)     │   │
│  │  Длина кода:      6 цифр                                                 │   │
│  │  Период:          30 секунд                                              │   │
│  │  Длина секрета:   20 байт (160 бит)                                     │   │
│  │  Кодировка:       Base32                                                 │   │
│  │  Окно проверки:   ±1 период (±30 сек) для синхронизации часов           │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Архитектура 2FA в VendHub

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           2FA ARCHITECTURE                                       │
│                                                                                  │
│  ┌──────────────────┐                                                           │
│  │ TwoFactorAuth    │                                                           │
│  │ Service          │                                                           │
│  │ (349 строк)      │                                                           │
│  └────────┬─────────┘                                                           │
│           │                                                                      │
│           │ Использует                                                           │
│           ▼                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐          │
│  │     otplib       │    │   crypto (Node)  │    │     qrcode       │          │
│  │                  │    │                  │    │                  │          │
│  │ • authenticator  │    │ • createCipheriv │    │ • toDataURL      │          │
│  │ • generateSecret │    │ • createDecipher │    │                  │          │
│  │ • verify         │    │ • randomBytes    │    │                  │          │
│  │ • keyuri         │    │                  │    │                  │          │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘          │
│                                                                                  │
│  Хранение:                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ users.two_fa_secret                                                       │  │
│  │                                                                           │  │
│  │ Формат: IV:AuthTag:EncryptedData (все в hex)                             │  │
│  │                                                                           │  │
│  │ Пример:                                                                   │  │
│  │ a1b2c3d4e5f6a1b2c3d4e5f6:0123456789abcdef0123456789abcdef:encrypted...   │  │
│  │ └──── IV (12 bytes) ────┘└────── AuthTag (16 bytes) ──────┘└─ Data ─┘    │  │
│  │                                                                           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Файловая Структура

```
backend/src/modules/auth/services/
└── two-factor-auth.service.ts    # 349 строк - основной сервис

backend/src/modules/security/services/
└── two-factor-auth.service.ts    # Резервные коды (отдельный модуль)

backend/src/modules/auth/dto/
├── enable-2fa.dto.ts             # DTO для включения
├── verify-2fa.dto.ts             # DTO для верификации
└── verify-backup-code.dto.ts     # DTO для резервного кода
```

---

## 2. TOTP Алгоритм

### 2.1 Генерация Секрета

```typescript
// two-factor-auth.service.ts:50-80
import { authenticator } from 'otplib';

async generateSecret(userId: string): Promise<{
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}> {
  // 1. Найти пользователя
  const user = await this.usersService.findById(userId);
  if (!user) {
    throw new NotFoundException('Пользователь не найден');
  }

  // 2. Генерировать секрет (20 байт = 32 символа Base32)
  const secret = authenticator.generateSecret(20);

  // Пример секрета: JBSWY3DPEHPK3PXP (Base32)

  // 3. Создать URI для QR-кода
  const appName = this.configService.get<string>('TWO_FA_APP_NAME', 'VendHub');
  const otpauthUrl = authenticator.keyuri(
    user.email,           // Идентификатор пользователя
    appName,              // Название приложения
    secret                // Секретный ключ
  );

  // Пример URI:
  // otpauth://totp/VendHub:admin@vendhub.uz?secret=JBSWY3DPEHPK3PXP&issuer=VendHub

  // 4. Генерировать QR-код (Data URL)
  const qrCode = await QRCode.toDataURL(otpauthUrl, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  // Результат: data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...

  // 5. Форматировать ключ для ручного ввода (группы по 4 символа)
  const manualEntryKey = secret.match(/.{1,4}/g)?.join(' ') || secret;

  // Пример: JBSW Y3DP EHPK 3PXP

  return {
    secret,           // Сырой секрет (нужен для enable)
    qrCode,           // Data URL для отображения
    manualEntryKey,   // Для ручного ввода
  };
}
```

### 2.2 Алгоритм TOTP (RFC 6238)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TOTP ALGORITHM                                         │
│                                                                                  │
│  Входные данные:                                                                │
│  • K = секретный ключ (20 байт)                                                 │
│  • T = текущее Unix время в секундах                                            │
│  • X = период (30 секунд)                                                       │
│                                                                                  │
│  Шаг 1: Вычислить счётчик                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ C = floor(T / X)                                                         │   │
│  │                                                                          │   │
│  │ Пример: T = 1703001234, X = 30                                          │   │
│  │ C = floor(1703001234 / 30) = 56766707                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Шаг 2: Вычислить HMAC-SHA1                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ H = HMAC-SHA1(K, C)                                                      │   │
│  │                                                                          │   │
│  │ Результат: 20 байт (160 бит)                                            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Шаг 3: Динамическое усечение                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ offset = H[19] & 0x0F  // Последние 4 бита = смещение (0-15)            │   │
│  │                                                                          │   │
│  │ code = (H[offset] & 0x7F) << 24                                         │   │
│  │      | (H[offset+1] & 0xFF) << 16                                       │   │
│  │      | (H[offset+2] & 0xFF) << 8                                        │   │
│  │      | (H[offset+3] & 0xFF)                                             │   │
│  │                                                                          │   │
│  │ // 31-битное целое число                                                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Шаг 4: Получить 6-значный код                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ OTP = code % 1000000                                                     │   │
│  │                                                                          │   │
│  │ // Добавить ведущие нули если нужно                                     │   │
│  │ OTP = OTP.toString().padStart(6, '0')                                   │   │
│  │                                                                          │   │
│  │ Результат: "123456"                                                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Верификация с Окном

```typescript
// otplib настройки по умолчанию
authenticator.options = {
  step: 30,      // Период в секундах
  digits: 6,     // Длина кода
  window: 1,     // ±1 период для синхронизации часов
};

// Это означает проверяются коды для:
// - Текущего периода (T)
// - Предыдущего периода (T - 30 сек)
// - Следующего периода (T + 30 сек)
```

---

## 3. Шифрование Секретов

### 3.1 AES-256-GCM Шифрование

**Почему AES-256-GCM?**
- AES-256: военный стандарт шифрования
- GCM: Galois/Counter Mode - обеспечивает и конфиденциальность, и аутентичность
- AuthTag: защита от подмены данных

```typescript
// two-factor-auth.service.ts:100-150
import * as crypto from 'crypto';

private readonly algorithm = 'aes-256-gcm';
private readonly ivLength = 12;      // 96 бит (рекомендовано для GCM)
private readonly authTagLength = 16; // 128 бит
private encryptionKey: Buffer;

constructor(private readonly configService: ConfigService) {
  // Ключ должен быть 32 байта (256 бит)
  const key = this.configService.get<string>('TWO_FA_ENCRYPTION_KEY');

  if (!key || key.length < 32) {
    throw new Error('TWO_FA_ENCRYPTION_KEY must be at least 32 characters');
  }

  // Используем первые 32 байта ключа
  this.encryptionKey = Buffer.from(key.slice(0, 32), 'utf-8');
}
```

### 3.2 Процесс Шифрования

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AES-256-GCM ENCRYPTION                                   │
│                                                                                  │
│  Входные данные:                                                                │
│  • plaintext = "JBSWY3DPEHPK3PXP" (секрет TOTP)                                │
│  • key = 32 байта из TWO_FA_ENCRYPTION_KEY                                      │
│                                                                                  │
│  Шаг 1: Генерация IV (Initialization Vector)                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ iv = crypto.randomBytes(12)  // 12 байт случайных данных                │   │
│  │                                                                          │   │
│  │ ВАЖНО: IV должен быть УНИКАЛЬНЫМ для каждого шифрования!                │   │
│  │ Повторное использование IV с тем же ключом = катастрофа!                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Шаг 2: Создание шифра                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ cipher = crypto.createCipheriv('aes-256-gcm', key, iv, {                │   │
│  │   authTagLength: 16                                                      │   │
│  │ });                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Шаг 3: Шифрование                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ encrypted = cipher.update(plaintext, 'utf8', 'hex')                     │   │
│  │           + cipher.final('hex');                                         │   │
│  │                                                                          │   │
│  │ authTag = cipher.getAuthTag();  // 16 байт                              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Шаг 4: Формирование результата                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ result = iv.toString('hex')                                              │   │
│  │        + ':'                                                             │   │
│  │        + authTag.toString('hex')                                         │   │
│  │        + ':'                                                             │   │
│  │        + encrypted;                                                      │   │
│  │                                                                          │   │
│  │ Пример результата:                                                       │   │
│  │ "a1b2c3d4e5f6a1b2c3d4e5f6:0123456789abcdef0123456789abcdef:9f8e7d6c..."  │   │
│  │  └────── IV (24 hex) ─────┘└────── AuthTag (32 hex) ──────┘└─ Data ─┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Код Шифрования

```typescript
// two-factor-auth.service.ts:160-190
private encryptSecret(secret: string): string {
  // 1. Генерировать уникальный IV
  const iv = crypto.randomBytes(this.ivLength);

  // 2. Создать шифр
  const cipher = crypto.createCipheriv(
    this.algorithm,
    this.encryptionKey,
    iv,
    { authTagLength: this.authTagLength }
  );

  // 3. Зашифровать
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // 4. Получить тег аутентификации
  const authTag = cipher.getAuthTag();

  // 5. Собрать результат: IV:AuthTag:EncryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

### 3.4 Код Дешифрования

```typescript
// two-factor-auth.service.ts:200-240
private decryptSecret(encryptedData: string): string {
  // 1. Разобрать компоненты
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  // 2. Создать дешифратор
  const decipher = crypto.createDecipheriv(
    this.algorithm,
    this.encryptionKey,
    iv,
    { authTagLength: this.authTagLength }
  );

  // 3. Установить тег аутентификации
  decipher.setAuthTag(authTag);

  // 4. Расшифровать
  try {
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // Если authTag не совпадает - данные были изменены
    throw new Error('Decryption failed: data may have been tampered with');
  }
}
```

---

## 4. Настройка 2FA

### 4.1 Полный Flow Настройки

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           2FA SETUP FLOW                                         │
│                                                                                  │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐               │
│  │  Client  │     │Controller│     │ Service  │     │ Database │               │
│  └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘               │
│       │                │                │                │                      │
│       │ POST /auth/2fa/setup            │                │                      │
│       │ Authorization: Bearer ...       │                │                      │
│       │───────────────────────────────►│                │                      │
│       │                │                │                │                      │
│       │                │ generateSecret(userId)          │                      │
│       │                │───────────────────────────────►│                      │
│       │                │                │                │                      │
│       │                │                │ findById(userId)                      │
│       │                │                │───────────────────────────────────►│  │
│       │                │                │                │                      │
│       │                │                │◄───────────────────────────────────│  │
│       │                │                │ User entity    │                      │
│       │                │                │                │                      │
│       │                │                │ authenticator.generateSecret(20)      │
│       │                │                │ → "JBSWY3DPEHPK3PXP"                 │
│       │                │                │                │                      │
│       │                │                │ authenticator.keyuri(email, app, key) │
│       │                │                │ → "otpauth://totp/..."               │
│       │                │                │                │                      │
│       │                │                │ QRCode.toDataURL(uri)                 │
│       │                │                │ → "data:image/png;base64,..."        │
│       │                │                │                │                      │
│       │                │◄───────────────────────────────│                      │
│       │                │ {secret, qrCode, manualEntryKey}                      │
│       │                │                │                │                      │
│       │◄───────────────────────────────│                │                      │
│       │ 200 OK                         │                │                      │
│       │ {                              │                │                      │
│       │   secret: "JBSWY3DPEHPK3PXP",  │                │                      │
│       │   qrCode: "data:image/png...", │                │                      │
│       │   manualEntryKey: "JBSW Y3DP..."│               │                      │
│       │ }                              │                │                      │
│       │                │                │                │                      │
│       │ ════════════════════════════════════════════════════════════════       │
│       │ Клиент показывает QR-код                                                │
│       │ Пользователь сканирует в Google Authenticator                          │
│       │ ════════════════════════════════════════════════════════════════       │
│       │                │                │                │                      │
│                                                                                  │
│  ВАЖНО: Секрет НЕ сохраняется на этом этапе!                                   │
│  Пользователь должен подтвердить кодом (enable)                                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 HTTP Пример

**Запрос:**
```http
POST /api/auth/2fa/setup HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ответ (200 OK):**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAA...",
  "manualEntryKey": "JBSW Y3DP EHPK 3PXP"
}
```

### 4.3 QR-код Содержимое

```
otpauth://totp/VendHub:admin@vendhub.uz?secret=JBSWY3DPEHPK3PXP&issuer=VendHub&algorithm=SHA1&digits=6&period=30
         │     │                         │                      │        │           │          │
         │     │                         │                      │        │           │          └── Период: 30 сек
         │     │                         │                      │        │           └── Длина: 6 цифр
         │     │                         │                      │        └── Алгоритм: SHA1
         │     │                         │                      └── Издатель
         │     │                         └── Секретный ключ (Base32)
         │     └── Идентификатор (email пользователя)
         └── Название приложения
```

---

## 5. Включение 2FA

### 5.1 Flow Включения

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           2FA ENABLE FLOW                                        │
│                                                                                  │
│  POST /api/auth/2fa/enable                                                       │
│  Authorization: Bearer ...                                                       │
│  {                                                                               │
│    "secret": "JBSWY3DPEHPK3PXP",    // Секрет из setup                         │
│    "token": "123456"                 // Код из authenticator                    │
│  }                                                                               │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ enable2FA(userId, secret, token, ip)                                     │   │
│  │                                                                          │   │
│  │ 1. Найти пользователя                                                   │   │
│  │    const user = await usersService.findById(userId);                    │   │
│  │                                                                          │   │
│  │ 2. Проверить что 2FA ещё не включена                                    │   │
│  │    if (user.is_2fa_enabled) {                                           │   │
│  │      throw BadRequestException('2FA уже включена');                     │   │
│  │    }                                                                     │   │
│  │                                                                          │   │
│  │ 3. Верифицировать TOTP код                                              │   │
│  │    const isValid = authenticator.verify({                               │   │
│  │      token: token,     // "123456"                                      │   │
│  │      secret: secret    // "JBSWY3DPEHPK3PXP"                           │   │
│  │    });                                                                   │   │
│  │                                                                          │   │
│  │    if (!isValid) {                                                       │   │
│  │      throw BadRequestException('Неверный код подтверждения');           │   │
│  │    }                                                                     │   │
│  │                                                                          │   │
│  │ 4. Зашифровать секрет                                                   │   │
│  │    const encryptedSecret = this.encryptSecret(secret);                  │   │
│  │    // "iv:authTag:encryptedData"                                        │   │
│  │                                                                          │   │
│  │ 5. Сохранить в базу                                                     │   │
│  │    await usersService.update(userId, {                                  │   │
│  │      two_fa_secret: encryptedSecret,                                    │   │
│  │      is_2fa_enabled: true,                                              │   │
│  │    });                                                                   │   │
│  │                                                                          │   │
│  │ 6. Записать аудит лог                                                   │   │
│  │    await auditLogService.log({                                          │   │
│  │      action: 'TWO_FA_ENABLED',                                          │   │
│  │      userId: userId,                                                     │   │
│  │      ip: ip,                                                             │   │
│  │    });                                                                   │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Response (200 OK):                                                              │
│  {                                                                               │
│    "success": true,                                                              │
│    "message": "2FA успешно включена"                                            │
│  }                                                                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Код Сервиса

```typescript
// two-factor-auth.service.ts:250-300
async enable2FA(
  userId: string,
  secret: string,
  token: string,
  ip?: string,
): Promise<{ success: boolean; message: string }> {
  // 1. Найти пользователя
  const user = await this.usersService.findById(userId);
  if (!user) {
    throw new NotFoundException('Пользователь не найден');
  }

  // 2. Проверить что 2FA ещё не включена
  if (user.is_2fa_enabled) {
    throw new BadRequestException('Двухфакторная аутентификация уже включена');
  }

  // 3. Верифицировать код
  const isValid = authenticator.verify({
    token: token,
    secret: secret,
  });

  if (!isValid) {
    await this.auditLogService.log({
      action: 'TWO_FA_ENABLE_FAILED',
      userId: userId,
      ip: ip,
      details: { reason: 'invalid_token' },
    });

    throw new BadRequestException('Неверный код подтверждения');
  }

  // 4. Зашифровать и сохранить секрет
  const encryptedSecret = this.encryptSecret(secret);

  await this.usersService.update(userId, {
    two_fa_secret: encryptedSecret,
    is_2fa_enabled: true,
  });

  // 5. Аудит лог
  await this.auditLogService.log({
    action: 'TWO_FA_ENABLED',
    userId: userId,
    ip: ip,
  });

  this.logger.log(`2FA enabled for user ${userId}`);

  return {
    success: true,
    message: '2FA успешно включена',
  };
}
```

### 5.3 Enable2FADto

```typescript
// dto/enable-2fa.dto.ts
import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty({
    description: 'Секретный ключ из setup',
    example: 'JBSWY3DPEHPK3PXP',
  })
  @IsString()
  @Matches(/^[A-Z2-7]+=*$/, { message: 'Неверный формат секрета (Base32)' })
  secret: string;

  @ApiProperty({
    description: 'Код из приложения-аутентификатора',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'Код должен быть 6 цифр' })
  @Matches(/^\d{6}$/, { message: 'Код должен содержать только цифры' })
  token: string;
}
```

---

## 6. Верификация Кода

### 6.1 Процесс Верификации

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         TOTP VERIFICATION                                        │
│                                                                                  │
│  verifyToken(userId, token, ip)                                                  │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 1. Найти пользователя с секретом                                        │   │
│  │    const user = await usersService.findByIdWith2FASecret(userId);       │   │
│  │                                                                          │   │
│  │    // two_fa_secret обычно select: false, нужен явный запрос            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 2. Проверить что 2FA включена                                           │   │
│  │    if (!user.is_2fa_enabled || !user.two_fa_secret) {                   │   │
│  │      throw BadRequestException('2FA не включена');                      │   │
│  │    }                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 3. Расшифровать секрет                                                  │   │
│  │    const secret = this.decryptSecret(user.two_fa_secret);               │   │
│  │    // "JBSWY3DPEHPK3PXP"                                                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 4. Верифицировать TOTP код                                              │   │
│  │                                                                          │   │
│  │    const isValid = authenticator.verify({                               │   │
│  │      token: token,      // "123456"                                     │   │
│  │      secret: secret,    // "JBSWY3DPEHPK3PXP"                          │   │
│  │    });                                                                   │   │
│  │                                                                          │   │
│  │    // otplib проверяет ±1 период (window: 1)                            │   │
│  │    // Т.е. коды за последние 30 сек и следующие 30 сек тоже валидны    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 5. Записать результат в аудит                                           │   │
│  │                                                                          │   │
│  │    if (isValid) {                                                        │   │
│  │      await auditLogService.log({                                        │   │
│  │        action: 'TWO_FA_VERIFIED',                                       │   │
│  │        userId, ip                                                        │   │
│  │      });                                                                 │   │
│  │    } else {                                                              │   │
│  │      await auditLogService.log({                                        │   │
│  │        action: 'TWO_FA_VERIFICATION_FAILED',                            │   │
│  │        userId, ip                                                        │   │
│  │      });                                                                 │   │
│  │    }                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  return isValid;  // true или false                                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Код Сервиса

```typescript
// two-factor-auth.service.ts:310-349
async verifyToken(userId: string, token: string, ip?: string): Promise<boolean> {
  // 1. Найти пользователя с секретом
  const user = await this.usersService.findByIdWith2FASecret(userId);

  if (!user) {
    throw new NotFoundException('Пользователь не найден');
  }

  // 2. Проверить что 2FA включена
  if (!user.is_2fa_enabled || !user.two_fa_secret) {
    throw new BadRequestException('Двухфакторная аутентификация не включена');
  }

  // 3. Расшифровать секрет
  let secret: string;
  try {
    secret = this.decryptSecret(user.two_fa_secret);
  } catch (error) {
    this.logger.error(`Failed to decrypt 2FA secret for user ${userId}: ${error.message}`);
    throw new InternalServerErrorException('Ошибка проверки 2FA');
  }

  // 4. Верифицировать код
  const isValid = authenticator.verify({
    token: token,
    secret: secret,
  });

  // 5. Аудит
  await this.auditLogService.log({
    action: isValid ? 'TWO_FA_VERIFIED' : 'TWO_FA_VERIFICATION_FAILED',
    userId: userId,
    ip: ip,
    details: { tokenProvided: !!token },
  });

  return isValid;
}
```

---

## 7. Резервные Коды

### 7.1 Обзор Резервных Кодов

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          BACKUP CODES OVERVIEW                                   │
│                                                                                  │
│  Резервные коды - одноразовые коды для восстановления доступа                   │
│  если пользователь потерял доступ к authenticator приложению                    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         Характеристики                                   │   │
│  │                                                                          │   │
│  │  • Количество: 10 кодов                                                  │   │
│  │  • Формат: XXXX-XXXX-XXXX (12 символов + дефисы)                        │   │
│  │  • Символы: A-Z, 0-9 (без путаных: 0/O, 1/I/L)                          │   │
│  │  • Хранение: bcrypt hash в базе                                         │   │
│  │  • Использование: каждый код можно использовать ОДИН раз               │   │
│  │  • Регенерация: пользователь может запросить новые коды                 │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Пример набора резервных кодов:                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │   1. ABCD-EFGH-1234                                                     │   │
│  │   2. WXYZ-QRST-5678                                                     │   │
│  │   3. MNOP-KLIJ-9012                                                     │   │
│  │   4. UVWX-CDEF-3456                                                     │   │
│  │   5. GHIJ-ABCD-7890                                                     │   │
│  │   6. KLMN-OPQR-2345                                                     │   │
│  │   7. STUV-WXYZ-6789                                                     │   │
│  │   8. EFGH-IJKL-0123                                                     │   │
│  │   9. QRST-UVWX-4567                                                     │   │
│  │  10. YZAB-CDEF-8901                                                     │   │
│  │                                                                          │   │
│  │  ⚠️ Сохраните эти коды в надёжном месте!                                │   │
│  │  Они не будут показаны повторно.                                        │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Генерация Резервных Кодов

```typescript
// security/services/two-factor-auth.service.ts
async generateBackupCodes(userId: string): Promise<string[]> {
  const codes: string[] = [];
  const hashedCodes: string[] = [];

  // Генерируем 10 кодов
  for (let i = 0; i < 10; i++) {
    // Генерируем случайный код
    const code = this.generateRandomCode();  // "ABCD-EFGH-1234"
    codes.push(code);

    // Хешируем для хранения
    const hash = await bcrypt.hash(code, 10);
    hashedCodes.push(hash);
  }

  // Сохраняем хеши в базу
  await this.backupCodesRepository.delete({ user_id: userId });  // Удаляем старые

  for (const hash of hashedCodes) {
    await this.backupCodesRepository.save({
      user_id: userId,
      code_hash: hash,
      used: false,
    });
  }

  // Возвращаем открытые коды (показываются ОДИН раз)
  return codes;
}

private generateRandomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  // Без 0/O/1/I/L
  let code = '';

  for (let i = 0; i < 12; i++) {
    code += chars.charAt(crypto.randomInt(chars.length));
    if (i === 3 || i === 7) code += '-';  // XXXX-XXXX-XXXX
  }

  return code;
}
```

### 7.3 Использование Резервного Кода

```typescript
// security/services/two-factor-auth.service.ts
async verifyBackupCode(userId: string, code: string): Promise<boolean> {
  // 1. Найти все неиспользованные коды пользователя
  const backupCodes = await this.backupCodesRepository.find({
    where: { user_id: userId, used: false },
  });

  // 2. Проверить каждый код
  for (const backupCode of backupCodes) {
    const isMatch = await bcrypt.compare(code, backupCode.code_hash);

    if (isMatch) {
      // 3. Пометить код как использованный
      await this.backupCodesRepository.update(backupCode.id, {
        used: true,
        used_at: new Date(),
      });

      // 4. Аудит
      await this.auditLogService.log({
        action: 'BACKUP_CODE_USED',
        userId: userId,
        details: { remaining: backupCodes.length - 1 },
      });

      return true;
    }
  }

  return false;
}
```

### 7.4 HTTP Пример - Вход с Резервным Кодом

```http
POST /api/auth/2fa/login/backup HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "code": "ABCD-EFGH-1234"
}
```

---

## 8. Отключение 2FA

### 8.1 Flow Отключения

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           2FA DISABLE FLOW                                       │
│                                                                                  │
│  POST /api/auth/2fa/disable                                                      │
│  Authorization: Bearer ...                                                       │
│  {"token": "123456"}  // Текущий TOTP код для подтверждения                    │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 1. Проверить что 2FA включена                                           │   │
│  │    if (!user.is_2fa_enabled) {                                          │   │
│  │      throw BadRequestException('2FA уже отключена');                    │   │
│  │    }                                                                     │   │
│  │                                                                          │   │
│  │ 2. Верифицировать текущий TOTP код                                      │   │
│  │    const isValid = await this.verifyToken(userId, token, ip);           │   │
│  │    if (!isValid) {                                                       │   │
│  │      throw BadRequestException('Неверный код');                         │   │
│  │    }                                                                     │   │
│  │                                                                          │   │
│  │ 3. Удалить секрет и отключить 2FA                                       │   │
│  │    await usersService.update(userId, {                                  │   │
│  │      two_fa_secret: null,                                               │   │
│  │      is_2fa_enabled: false,                                             │   │
│  │    });                                                                   │   │
│  │                                                                          │   │
│  │ 4. Удалить резервные коды                                               │   │
│  │    await backupCodesRepository.delete({ user_id: userId });             │   │
│  │                                                                          │   │
│  │ 5. Blacklist все токены пользователя (безопасность)                     │   │
│  │    await tokenBlacklistService.blacklistUserTokens(userId, '2fa_disabled'); │
│  │                                                                          │   │
│  │ 6. Аудит лог                                                            │   │
│  │    await auditLogService.log({                                          │   │
│  │      action: 'TWO_FA_DISABLED',                                         │   │
│  │      userId, ip                                                          │   │
│  │    });                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Response (200 OK):                                                              │
│  {"success": true, "message": "2FA успешно отключена"}                          │
│                                                                                  │
│  ⚠️ После отключения 2FA все сессии становятся невалидными!                    │
│  Пользователь должен войти заново.                                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Код Сервиса

```typescript
// two-factor-auth.service.ts
async disable2FA(
  userId: string,
  token: string,
  ip?: string,
): Promise<{ success: boolean; message: string }> {
  // 1. Найти пользователя
  const user = await this.usersService.findById(userId);
  if (!user) {
    throw new NotFoundException('Пользователь не найден');
  }

  // 2. Проверить что 2FA включена
  if (!user.is_2fa_enabled) {
    throw new BadRequestException('Двухфакторная аутентификация уже отключена');
  }

  // 3. Верифицировать код
  const isValid = await this.verifyToken(userId, token, ip);
  if (!isValid) {
    throw new BadRequestException('Неверный код подтверждения');
  }

  // 4. Отключить 2FA
  await this.usersService.update(userId, {
    two_fa_secret: null,
    is_2fa_enabled: false,
  });

  // 5. Удалить резервные коды
  await this.securityTwoFactorAuthService.deleteBackupCodes(userId);

  // 6. Blacklist все токены (заставить перелогиниться)
  await this.tokenBlacklistService.blacklistUserTokens(userId, '2fa_disabled');

  // 7. Аудит
  await this.auditLogService.log({
    action: 'TWO_FA_DISABLED',
    userId: userId,
    ip: ip,
  });

  return {
    success: true,
    message: '2FA успешно отключена',
  };
}
```

---

## 9. Восстановление Доступа

### 9.1 Сценарии Потери Доступа

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       2FA RECOVERY SCENARIOS                                     │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════   │
│  Сценарий 1: Есть резервные коды                                                │
│  ═══════════════════════════════════════════════════════════════════════════   │
│                                                                                  │
│  1. Пользователь входит с email/password                                        │
│  2. Система запрашивает 2FA код                                                 │
│  3. Пользователь нажимает "Использовать резервный код"                         │
│  4. Вводит один из сохранённых резервных кодов                                 │
│  5. Код проверяется и помечается как использованный                            │
│  6. Вход успешен                                                                │
│                                                                                  │
│  ⚠️ Рекомендация: после входа сгенерировать новые резервные коды              │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════   │
│  Сценарий 2: Нет резервных кодов - Обращение к администратору                  │
│  ═══════════════════════════════════════════════════════════════════════════   │
│                                                                                  │
│  1. Пользователь обращается к администратору                                    │
│  2. Администратор верифицирует личность пользователя                           │
│     (через Telegram, звонок, личная встреча)                                    │
│  3. Администратор отключает 2FA через админ-панель:                            │
│     PATCH /api/admin/users/{userId}/disable-2fa                                │
│  4. Пользователь входит без 2FA                                                │
│  5. Пользователь настраивает 2FA заново                                        │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════   │
│  Сценарий 3: Telegram Bot - Быстрый сброс (если настроен)                      │
│  ═══════════════════════════════════════════════════════════════════════════   │
│                                                                                  │
│  1. Пользователь отправляет команду боту: /reset_2fa                           │
│  2. Бот проверяет telegram_user_id пользователя                                │
│  3. Бот отправляет одноразовую ссылку для входа                                │
│  4. Пользователь переходит по ссылке                                           │
│  5. Система отключает 2FA и требует настроить заново                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Админ API для Сброса 2FA

```http
PATCH /api/admin/users/{userId}/disable-2fa HTTP/1.1
Authorization: Bearer <admin_token>
```

```typescript
// admin/users.controller.ts
@Patch(':userId/disable-2fa')
@Roles('ADMIN', 'SUPER_ADMIN')
async adminDisable2FA(
  @Param('userId') userId: string,
  @CurrentUser() admin: User,
  @Req() req: Request,
): Promise<{ success: boolean }> {
  const user = await this.usersService.findById(userId);

  if (!user) {
    throw new NotFoundException('Пользователь не найден');
  }

  // Отключить 2FA без проверки кода (админ действие)
  await this.usersService.update(userId, {
    two_fa_secret: null,
    is_2fa_enabled: false,
  });

  // Аудит с информацией об админе
  await this.auditLogService.log({
    action: 'TWO_FA_DISABLED_BY_ADMIN',
    userId: userId,
    performedBy: admin.id,
    ip: req.ip,
    details: { adminEmail: admin.email },
  });

  return { success: true };
}
```

---

## 10. API Endpoints

### 10.1 Таблица Endpoints

| Method | Endpoint | Описание | Auth | Rate Limit |
|--------|----------|----------|------|------------|
| `POST` | `/auth/2fa/setup` | Генерация секрета и QR-кода | JWT | - |
| `POST` | `/auth/2fa/enable` | Включение 2FA | JWT | - |
| `POST` | `/auth/2fa/disable` | Отключение 2FA | JWT | - |
| `POST` | `/auth/2fa/verify` | Проверка кода | JWT | 10/мин |
| `POST` | `/auth/2fa/login` | Завершение входа с TOTP | JWT | 5/мин |
| `POST` | `/auth/2fa/login/backup` | Вход с резервным кодом | JWT | 5/мин |

### 10.2 Детали Endpoints

#### POST /auth/2fa/setup

```typescript
// Request
Headers: {
  Authorization: "Bearer <access_token>"
}

// Response 200 OK
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,...",
  "manualEntryKey": "JBSW Y3DP EHPK 3PXP"
}
```

#### POST /auth/2fa/enable

```typescript
// Request
Headers: {
  Authorization: "Bearer <access_token>"
}
Body: {
  "secret": "JBSWY3DPEHPK3PXP",
  "token": "123456"
}

// Response 200 OK
{
  "success": true,
  "message": "2FA успешно включена"
}

// Response 400 Bad Request
{
  "statusCode": 400,
  "message": "Неверный код подтверждения",
  "error": "Bad Request"
}
```

#### POST /auth/2fa/disable

```typescript
// Request
Headers: {
  Authorization: "Bearer <access_token>"
}
Body: {
  "token": "123456"
}

// Response 200 OK
{
  "success": true,
  "message": "2FA успешно отключена"
}
```

#### POST /auth/2fa/verify

```typescript
// Request
Headers: {
  Authorization: "Bearer <access_token>"
}
Body: {
  "token": "123456"
}

// Response 200 OK
{
  "valid": true,
  "message": "Код подтверждён"
}

// Response 200 OK (invalid)
{
  "valid": false,
  "message": "Неверный код"
}
```

#### POST /auth/2fa/login

```typescript
// Request (после успешного /auth/login с requires_2fa: true)
Headers: {
  Authorization: "Bearer <limited_access_token>"
}
Body: {
  "token": "123456"
}

// Response 200 OK
{
  "access_token": "eyJ...(новый полный токен)...",
  "refresh_token": "eyJ...(новый)...",
  "user": {
    "id": "...",
    "email": "...",
    "is_2fa_enabled": true
  }
}
```

#### POST /auth/2fa/login/backup

```typescript
// Request
Headers: {
  Authorization: "Bearer <limited_access_token>"
}
Body: {
  "code": "ABCD-EFGH-1234"
}

// Response 200 OK
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {...}
}

// Response 400 Bad Request
{
  "statusCode": 400,
  "message": "Неверный резервный код",
  "error": "Bad Request"
}
```

---

## Следующий Документ

➡️ [04-AUTH-SESSIONS-SECURITY.md](./04-AUTH-SESSIONS-SECURITY.md) - Сессии, безопасность, rate-limit

---

**Версия документа**: 2.0.0
**Создан**: 2025-12-20
**Автор**: VendHub Development Team
