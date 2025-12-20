# Client Platform API Reference

> **Модуль**: `backend/src/modules/client/`
> **Базовый URL**: `/api/client`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

API клиентской платформы разделено на:
- **Public API** - без авторизации
- **Protected API** - требует JWT токен

```
/api/client/
├── auth/              # Аутентификация
│   ├── telegram       # POST - Telegram Web App auth
│   ├── refresh        # POST - Обновление токена
│   ├── me             # GET - Текущий профиль
│   └── profile        # PATCH - Обновление профиля
├── orders/            # Заказы (protected)
│   ├── /              # GET - Список, POST - Создать
│   └── /:id           # GET - Детали, DELETE - Отмена
├── loyalty/           # Лояльность (protected)
│   ├── balance        # GET - Баланс
│   └── history        # GET - История
└── public/            # Публичный API
    ├── locations      # GET - Локации
    ├── cities         # GET - Города
    ├── menu           # GET - Меню аппарата
    ├── qr/resolve     # POST - Распознать QR
    └── cooperation    # POST - Заявка на сотрудничество
```

---

## Аутентификация

### POST /api/client/auth/telegram

Аутентификация через Telegram Web App.

**Request:**
```http
POST /api/client/auth/telegram
Content-Type: application/json

{
  "initData": "query_id=AAHdF6IQ...&user=%7B%22id%22%3A12345678...&hash=abc123..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "telegram_username": "johndoe",
    "telegram_id": 12345678,
    "full_name": "John Doe",
    "phone": null,
    "email": null,
    "is_verified": true,
    "language": "en",
    "created_at": "2025-01-15T10:30:00.000Z",
    "loyalty_points": 0
  }
}
```

**Errors:**
| Code | Описание |
|------|----------|
| 401 | Invalid Telegram authentication data |

---

### POST /api/client/auth/refresh

Обновление access токена.

**Request:**
```http
POST /api/client/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "telegram_username": "johndoe",
    "loyalty_points": 1500
  }
}
```

**Errors:**
| Code | Описание |
|------|----------|
| 401 | Invalid refresh token |

---

### GET /api/client/auth/me

Получить профиль текущего пользователя.

**Request:**
```http
GET /api/client/auth/me
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "telegram_username": "johndoe",
  "telegram_id": 12345678,
  "full_name": "John Doe",
  "phone": "+998901234567",
  "email": "john@example.com",
  "is_verified": true,
  "language": "ru",
  "created_at": "2025-01-15T10:30:00.000Z",
  "loyalty_points": 1500
}
```

---

### PATCH /api/client/auth/profile

Обновить профиль пользователя.

**Request:**
```http
PATCH /api/client/auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "full_name": "John Smith",
  "phone": "+998901234567",
  "email": "john.smith@example.com",
  "language": "uz"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "telegram_username": "johndoe",
  "full_name": "John Smith",
  "phone": "+998901234567",
  "email": "john.smith@example.com",
  "language": "uz",
  "loyalty_points": 1500
}
```

**Validation:**
| Поле | Правила |
|------|---------|
| full_name | string, max 100 chars |
| phone | pattern: /^\+998\d{9}$/ |
| email | valid email format |
| language | enum: ru, uz, en |

---

## Заказы

### POST /api/client/orders

Создать заказ.

**Request:**
```http
POST /api/client/orders
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "machine_id": "550e8400-e29b-41d4-a716-446655440001",
  "items": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440010",
      "quantity": 1
    },
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440011",
      "quantity": 2
    }
  ],
  "payment_provider": "click",
  "redeem_points": 50,
  "promo_code": "SUMMER2025"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "status": "pending",
  "total_amount": 75000,
  "discount_amount": 5000,
  "final_amount": 70000,
  "points_earned": 700,
  "points_redeemed": 50,
  "payment_provider": "click",
  "machine": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Coffee Machine #1",
    "machine_number": "M-001"
  },
  "created_at": "2025-01-15T12:00:00.000Z",
  "paid_at": null
}
```

**Errors:**
| Code | Описание |
|------|----------|
| 400 | Machine is not available |
| 400 | Insufficient points for redemption |
| 404 | Machine not found |
| 404 | Product not found |

---

### GET /api/client/orders

Получить список заказов.

**Request:**
```http
GET /api/client/orders?status=completed&page=1&limit=10
Authorization: Bearer <access_token>
```

**Query параметры:**
| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| status | string | - | Фильтр по статусу |
| page | number | 1 | Номер страницы |
| limit | number | 20 | Записей на странице (max 100) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "status": "completed",
      "total_amount": 75000,
      "discount_amount": 5000,
      "final_amount": 70000,
      "points_earned": 700,
      "points_redeemed": 50,
      "payment_provider": "click",
      "machine": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Coffee Machine #1",
        "machine_number": "M-001"
      },
      "created_at": "2025-01-15T12:00:00.000Z",
      "paid_at": "2025-01-15T12:01:00.000Z"
    }
  ],
  "total": 25
}
```

---

### GET /api/client/orders/:id

Получить заказ по ID.

**Request:**
```http
GET /api/client/orders/550e8400-e29b-41d4-a716-446655440100
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "status": "completed",
  "total_amount": 75000,
  "discount_amount": 5000,
  "final_amount": 70000,
  "points_earned": 700,
  "points_redeemed": 50,
  "payment_provider": "click",
  "items": [
    {
      "product_id": "uuid",
      "product_name": "Капучино",
      "quantity": 1,
      "price": 25000
    }
  ],
  "machine": {
    "id": "uuid",
    "name": "Coffee Machine #1",
    "machine_number": "M-001"
  },
  "created_at": "2025-01-15T12:00:00.000Z",
  "paid_at": "2025-01-15T12:01:00.000Z"
}
```

**Errors:**
| Code | Описание |
|------|----------|
| 404 | Order not found |

---

### DELETE /api/client/orders/:id

Отменить заказ.

**Request:**
```http
DELETE /api/client/orders/550e8400-e29b-41d4-a716-446655440100
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "status": "cancelled",
  "total_amount": 75000,
  "points_redeemed": 50,
  "machine": { ... }
}
```

**Ограничения:**
- Можно отменить только `pending` или `created`
- При отмене возвращаются списанные баллы

**Errors:**
| Code | Описание |
|------|----------|
| 400 | Order cannot be cancelled |
| 404 | Order not found |

---

## Лояльность

### GET /api/client/loyalty/balance

Получить баланс баллов.

**Request:**
```http
GET /api/client/loyalty/balance
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "points_balance": 1500,
  "lifetime_points": 5000,
  "points_value_uzs": 150000
}
```

---

### GET /api/client/loyalty/history

Получить историю транзакций.

**Request:**
```http
GET /api/client/loyalty/history?page=1&limit=20
Authorization: Bearer <access_token>
```

**Query параметры:**
| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| page | number | 1 | Номер страницы |
| limit | number | 20 | Записей на странице |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440200",
      "delta": 500,
      "reason": "order_earned",
      "description": "Points earned from order",
      "order_id": "550e8400-e29b-41d4-a716-446655440100",
      "balance_after": 1500,
      "created_at": "2025-01-15T12:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440201",
      "delta": -100,
      "reason": "order_redeemed",
      "description": "Points redeemed for discount",
      "order_id": "550e8400-e29b-41d4-a716-446655440101",
      "balance_after": 1000,
      "created_at": "2025-01-14T10:00:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

---

## Публичный API

Эндпоинты без авторизации.

### GET /api/client/public/locations

Получить список публичных локаций.

**Request:**
```http
GET /api/client/public/locations?city=Tashkent&page=1&limit=20
```

**Query параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| city | string | Фильтр по городу |
| search | string | Поиск по названию |
| page | number | Номер страницы |
| limit | number | Записей на странице |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440300",
      "name": "Samarkand Plaza",
      "address": "Navoi Street 12, Tashkent",
      "city": "Tashkent",
      "latitude": 41.311081,
      "longitude": 69.280037,
      "machines_count": 3,
      "working_hours": "08:00-22:00"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

---

### GET /api/client/public/cities

Получить список городов с аппаратами.

**Request:**
```http
GET /api/client/public/cities
```

**Response (200 OK):**
```json
[
  "Tashkent",
  "Samarkand",
  "Bukhara",
  "Namangan",
  "Fergana"
]
```

---

### GET /api/client/public/menu

Получить меню аппарата.

**Request:**
```http
GET /api/client/public/menu?machine_id=550e8400-e29b-41d4-a716-446655440001
```

или

```http
GET /api/client/public/menu?machine_number=M-001
```

**Query параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| machine_id | UUID | ID аппарата |
| machine_number | string | Номер аппарата |

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "sku": "COFFEE-CAP-001",
    "name": "Капучино",
    "description": "Классический капучино с молочной пенкой",
    "category": "coffee",
    "price": 25000,
    "currency": "UZS",
    "image_url": "https://cdn.vendhub.uz/products/cappuccino.jpg",
    "available": true
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440011",
    "sku": "COFFEE-LAT-001",
    "name": "Латте",
    "description": "Кофе латте с молоком",
    "category": "coffee",
    "price": 25000,
    "currency": "UZS",
    "image_url": "https://cdn.vendhub.uz/products/latte.jpg",
    "available": true
  }
]
```

---

### POST /api/client/public/qr/resolve

Распознать QR-код аппарата.

**Request:**
```http
POST /api/client/public/qr/resolve
Content-Type: application/json

{
  "qr_code": "QR-M001-ABC123"
}
```

**Response (200 OK):**
```json
{
  "machine_id": "550e8400-e29b-41d4-a716-446655440001",
  "machine_number": "M-001",
  "machine_name": "Coffee Machine #1",
  "location": {
    "id": "uuid",
    "name": "Samarkand Plaza",
    "address": "Navoi Street 12, Tashkent"
  },
  "is_available": true
}
```

**Errors:**
| Code | Описание |
|------|----------|
| 404 | Machine not found |

---

### POST /api/client/public/cooperation

Отправить заявку на сотрудничество.

**Request:**
```http
POST /api/client/public/cooperation
Content-Type: application/json

{
  "company_name": "Coffee House LLC",
  "contact_name": "Иван Петров",
  "phone": "+998901234567",
  "email": "ivan@coffeehouse.uz",
  "message": "Хотим установить вендинговые аппараты в наших кофейнях"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Спасибо за ваш интерес! Мы свяжемся с вами в ближайшее время."
}
```

---

## Коды ошибок

### HTTP статусы

| Code | Описание |
|------|----------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### Формат ошибки

```json
{
  "statusCode": 400,
  "message": "Machine is not available",
  "error": "Bad Request"
}
```

---

## Rate Limiting

| Endpoint группа | Лимит |
|-----------------|-------|
| /client/auth/* | 10 req/min |
| /client/orders | 30 req/min |
| /client/loyalty/* | 60 req/min |
| /client/public/* | 100 req/min |

---

## Swagger Documentation

Интерактивная документация доступна по адресу:

```
GET /api/docs
```

Tags:
- `Client Auth` - Аутентификация
- `Client Orders` - Заказы
- `Client Loyalty` - Лояльность
- `Client Public` - Публичный API
