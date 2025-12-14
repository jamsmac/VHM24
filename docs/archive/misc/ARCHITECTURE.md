# VendHub OS - Architecture Document

> **Version:** 2.0.0
> **Last Updated:** 2024-12-13

## 1. System Overview

VendHub OS is a unified vending machine management platform built on **manual operations architecture**. Unlike IoT-connected systems, VendHub relies on human operators to collect and input data, with photo validation ensuring data integrity.

## 2. Canonical Architecture

### 2.1 Source of Truth

**VHM24** is the single source of truth for all domain data:

```
┌─────────────────────────────────────────────────────────────────┐
│                    VHM24 (SOURCE OF TRUTH)                      │
├─────────────────────────────────────────────────────────────────┤
│  • Users & Roles                • Inventory (3-level)           │
│  • Locations & Zones            • Sales & Payments              │
│  • Machines & Status            • Requests & Orders             │
│  • Tasks & Checklists           • Audit Logs                    │
│  • Bags & Ingredients           • Reconciliation Data           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Supporting Modules (Integrated)

| Source | Functionality | Integration Status |
|--------|--------------|-------------------|
| VHM24R_1 | File processing, exports, analytics | → `files`, `reports` modules |
| VHM24R_2 | Payment reconciliation, matching | → `reconciliation` module |
| VendBot | Telegram FSM, catalogs, requests | → `telegram` module |
| vendbot_manager | Admin UI components | → `frontend` pages |

## 3. Component Architecture

### 3.1 High-Level Architecture

```
                                 ┌─────────────────┐
                                 │   Load Balancer │
                                 │    (nginx)      │
                                 └────────┬────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
    ┌─────────▼─────────┐      ┌─────────▼─────────┐      ┌─────────▼─────────┐
    │   Telegram Bot    │      │   Web Frontend    │      │   Mobile PWA      │
    │   (Telegraf.js)   │      │   (Next.js 14)    │      │   (React)         │
    └─────────┬─────────┘      └─────────┬─────────┘      └─────────┬─────────┘
              │                          │                          │
              └──────────────────────────┼──────────────────────────┘
                                         │
                              ┌──────────▼──────────┐
                              │    API Gateway      │
                              │   /api/v1/*         │
                              │   JWT + RBAC        │
                              └──────────┬──────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
    ┌─────────▼─────────┐     ┌─────────▼─────────┐     ┌─────────▼─────────┐
    │  Domain Services  │     │  Support Services │     │  Background Jobs  │
    │                   │     │                   │     │                   │
    │  • Auth           │     │  • File Storage   │     │  • Reminders      │
    │  • Users          │     │  • Notifications  │     │  • Reports        │
    │  • Tasks          │     │  • WebSocket      │     │  • Cleanup        │
    │  • Inventory      │     │  • Email          │     │  • Reconciliation │
    │  • Requests       │     │                   │     │                   │
    │  • Sales          │     │                   │     │                   │
    └─────────┬─────────┘     └─────────┬─────────┘     └─────────┬─────────┘
              │                         │                         │
              └─────────────────────────┼─────────────────────────┘
                                        │
                           ┌────────────┼────────────┐
                           │            │            │
                    ┌──────▼──────┐ ┌───▼───┐ ┌─────▼─────┐
                    │ PostgreSQL  │ │ Redis │ │    S3     │
                    │  (Primary)  │ │(Cache)│ │  (Files)  │
                    └─────────────┘ └───────┘ └───────────┘
```

### 3.2 Module Structure

```
backend/src/modules/
├── auth/                    # Authentication & Authorization
│   ├── guards/             # JWT, Roles guards
│   ├── strategies/         # Passport strategies
│   └── decorators/         # @Roles, @CurrentUser
│
├── users/                   # User Management
│   ├── entities/           # User, Role entities
│   └── services/           # CRUD, role assignment
│
├── machines/                # Machine Fleet
│   ├── entities/           # Machine, MachineStatus
│   └── services/           # QR generation, status tracking
│
├── tasks/                   # Task Management (CORE)
│   ├── entities/           # Task, TaskChecklist, TaskPhoto
│   ├── services/           # Task lifecycle, assignment
│   └── validators/         # Photo validation
│
├── inventory/               # 3-Level Inventory
│   ├── entities/           # Inventory, Bag, BagContent
│   ├── services/           # Transfer, adjustment
│   └── levels/             # Warehouse, Operator, Machine
│
├── requests/                # Material Requests (NEW)
│   ├── entities/           # Request, RequestItem, Supplier
│   ├── services/           # Request lifecycle
│   └── workflows/          # Approval flows
│
├── sales/                   # Sales Records
│   ├── entities/           # Sale, Transaction
│   └── services/           # Import, analytics
│
├── payments/                # Payment Processing
│   ├── entities/           # Payment, PaymentMethod
│   └── integrations/       # Payme, Click, Uzum
│
├── files/                   # File Management
│   ├── entities/           # File, FileProcessing
│   ├── services/           # Upload, processing
│   └── processors/         # CSV, XLSX parsers
│
├── reconciliation/          # Payment Reconciliation (NEW)
│   ├── entities/           # ReconciliationRun, Mismatch
│   ├── services/           # Matching algorithm
│   └── scoring/            # Match quality scoring
│
├── reports/                 # Reporting
│   ├── generators/         # PDF, Excel generators
│   └── schedulers/         # Daily, period reports
│
├── telegram/                # Telegram Integration
│   ├── bot/                # Telegraf bot instance
│   ├── handlers/           # Command & callback handlers
│   ├── fsm/                # Finite state machines
│   ├── keyboards/          # Inline keyboards
│   └── webapp/             # WebApp authentication
│
├── notifications/           # Multi-channel Notifications
│   ├── telegram/           # Telegram messages
│   ├── email/              # Email notifications
│   └── push/               # Web push
│
└── audit-logs/              # Audit Trail
    ├── entities/           # ActionLog
    └── interceptors/       # Auto-logging
```

## 4. Data Architecture

### 4.1 Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    User      │────<│   UserRole   │>────│     Role     │
└──────┬───────┘     └──────────────┘     └──────────────┘
       │
       │ created_by / assigned_to
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Task      │────<│TaskChecklist │     │  TaskPhoto   │
└──────┬───────┘     └──────────────┘     └──────────────┘
       │
       │ machine_id
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Machine    │────<│   Location   │     │  Incident    │
└──────┬───────┘     └──────────────┘     └──────────────┘
       │
       │ inventory
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Inventory   │────<│    Bag       │────<│ BagContent   │
│  (3-level)   │     └──────────────┘     └──────────────┘
└──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Request    │────<│ RequestItem  │>────│   Material   │
└──────┬───────┘     └──────────────┘     └──────┬───────┘
       │                                         │
       │ supplier_id                             │
       ▼                                         ▼
┌──────────────┐                         ┌──────────────┐
│   Supplier   │                         │  Ingredient  │
└──────────────┘                         └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Sale      │────<│   Payment    │────<│ Reconciled   │
└──────────────┘     └──────────────┘     │    Order     │
                                          └──────────────┘
```

### 4.2 3-Level Inventory Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     INVENTORY FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    Issue      ┌─────────────┐    Load         │
│  │  WAREHOUSE  │ ──────────────▶│  OPERATOR   │ ──────────────▶ │
│  │  (Central)  │               │  (Personal)  │                 │
│  └─────────────┘               └──────┬──────┘                 │
│        ▲                              │                         │
│        │ Return                       │ Refill Task             │
│        │                              ▼                         │
│        │                       ┌─────────────┐                 │
│        └───────────────────────│   MACHINE   │                 │
│                                │  (Loaded)   │                 │
│                                └─────────────┘                 │
│                                                                  │
│  Tracked entities: Bags, Ingredients, Bottles, Syrups           │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Task Lifecycle

```
┌─────────┐    ┌───────────┐    ┌─────────────┐    ┌───────────┐
│ CREATED │───▶│ ASSIGNED  │───▶│ IN_PROGRESS │───▶│ COMPLETED │
└─────────┘    └───────────┘    └──────┬──────┘    └───────────┘
                                       │
                                       │ (with issues)
                                       ▼
                               ┌───────────────┐
                               │   ON_HOLD     │
                               └───────┬───────┘
                                       │
                                       ▼
                               ┌───────────────┐
                               │   CANCELLED   │
                               └───────────────┘

Required for completion:
- Photo BEFORE (task_photo_before)
- Checklist items completed
- Photo AFTER (task_photo_after)
- Inventory update (if refill/collection)
```

### 4.4 Request (Material Order) Lifecycle

```
┌─────────┐    ┌──────────┐    ┌────────┐    ┌───────────┐
│   NEW   │───▶│ APPROVED │───▶│  SENT  │───▶│ COMPLETED │
└────┬────┘    └──────────┘    └────────┘    └───────────┘
     │
     │ (denied)
     ▼
┌──────────┐
│ REJECTED │
└──────────┘

Stages:
1. NEW - Operator creates request via bot/web
2. APPROVED - Manager approves
3. SENT - Grouped by supplier, notification sent
4. COMPLETED - Goods received, inventory updated
```

## 5. Integration Architecture

### 5.1 Telegram Bot as Thin Client

```
┌─────────────────────────────────────────────────────────────────┐
│                    TELEGRAM BOT ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐          ┌──────────────┐                    │
│  │  Telegram    │◀────────▶│   Telegraf   │                    │
│  │   Server     │          │   Bot Core   │                    │
│  └──────────────┘          └──────┬───────┘                    │
│                                   │                             │
│                    ┌──────────────┼──────────────┐             │
│                    │              │              │             │
│             ┌──────▼──────┐ ┌────▼────┐ ┌──────▼──────┐       │
│             │   Handlers  │ │   FSM   │ │  Keyboards  │       │
│             │             │ │  States │ │             │       │
│             └──────┬──────┘ └────┬────┘ └─────────────┘       │
│                    │             │                             │
│                    └──────┬──────┘                             │
│                           │                                     │
│                    ┌──────▼──────┐                             │
│                    │  API Client │ ◀──── NO direct DB access   │
│                    │  (Axios)    │                             │
│                    └──────┬──────┘                             │
│                           │                                     │
│                           ▼                                     │
│                    ┌─────────────┐                             │
│                    │  VHM24 API  │                             │
│                    │  /api/v1/*  │                             │
│                    └─────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 WebApp Authentication Flow

```
┌────────┐     ┌────────┐     ┌─────────┐     ┌─────────┐
│  User  │     │  Bot   │     │  API    │     │ WebApp  │
└───┬────┘     └───┬────┘     └────┬────┘     └────┬────┘
    │              │               │               │
    │  /start      │               │               │
    │─────────────▶│               │               │
    │              │               │               │
    │              │ Generate      │               │
    │              │ webapp token  │               │
    │              │──────────────▶│               │
    │              │               │               │
    │              │◀──────────────│               │
    │              │ Token + URL   │               │
    │              │               │               │
    │  WebApp btn  │               │               │
    │◀─────────────│               │               │
    │              │               │               │
    │  Click       │               │               │
    │─────────────────────────────────────────────▶│
    │              │               │               │
    │              │               │ Validate      │
    │              │               │◀──────────────│
    │              │               │               │
    │              │               │──────────────▶│
    │              │               │ JWT Session   │
    │              │               │               │
    │  Authenticated WebApp        │               │
    │◀─────────────────────────────────────────────│
    │              │               │               │
```

## 6. Reconciliation Architecture

### 6.1 Data Sources

```
┌─────────────────────────────────────────────────────────────────┐
│                  RECONCILIATION DATA SOURCES                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   HW.xlsx   │  │ Sales Report│  │   Fiscal    │             │
│  │  (Machine)  │  │  (VendHub)  │  │  Receipts   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                       │
│                   ┌──────▼──────┐                               │
│                   │   Unified   │                               │
│                   │   Orders    │                               │
│                   └──────┬──────┘                               │
│                          │                                       │
│         ┌────────────────┼────────────────┐                     │
│         │                │                │                     │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐             │
│  │    Payme    │  │    Click    │  │    Uzum     │             │
│  │  Payments   │  │  Payments   │  │  Payments   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Matching Algorithm

```
Input: Order record, Payment records
Output: Match result with score (1-6)

Algorithm:
1. Time Window Match (±5 seconds configurable)
2. Amount Match (±100 sum configurable)
3. Machine Code Match (exact)
4. Payment Method Match (exact)

Scoring:
- 6 points: All sources matched (HW + Sales + Fiscal + Payment)
- 5 points: Excellent match (3 sources)
- 4 points: Good match (2 sources + payment)
- 3 points: Medium match (2 sources)
- 2 points: Basic match (1 source + payment)
- 1 point: Minimal data (payment only)
- 0 points: No match (mismatch recorded)
```

## 7. Security Architecture

### 7.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION METHODS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Web/Mobile:                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │ Login    │───▶│ Validate │───▶│ JWT      │                  │
│  │ Form     │    │ Creds    │    │ Token    │                  │
│  └──────────┘    └──────────┘    └──────────┘                  │
│                                                                  │
│  Telegram:                                                       │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │ /start   │───▶│ Telegram │───▶│ API      │                  │
│  │ Command  │    │ ID Check │    │ Token    │                  │
│  └──────────┘    └──────────┘    └──────────┘                  │
│                                                                  │
│  WebApp (in Telegram):                                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │ WebApp   │───▶│ initData │───▶│ Session  │                  │
│  │ Button   │    │ Validate │    │ JWT      │                  │
│  └──────────┘    └──────────┘    └──────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 RBAC Matrix

| Resource | Admin | Manager | Operator | Technician | Warehouse | Viewer |
|----------|-------|---------|----------|------------|-----------|--------|
| Users | CRUD | R | - | - | - | - |
| Machines | CRUD | CRUD | R | R | R | R |
| Tasks | CRUD | CRUD | RU (own) | RU (own) | R | R |
| Inventory | CRUD | CRUD | R | R | CRUD | R |
| Requests | CRUD | CRUD | CRU | R | CRU | R |
| Sales | CRUD | R | R | - | - | R |
| Reports | CRUD | R | R (own) | R (own) | R | R |
| Reconciliation | CRUD | R | - | - | - | R |

## 8. Deployment Architecture

### 8.1 Production Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Railway / Docker                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │   Backend   │  │  Frontend   │  │  Telegram   │     │   │
│  │  │   (NestJS)  │  │  (Next.js)  │  │    Bot      │     │   │
│  │  │   :3000     │  │   :3001     │  │   :3002     │     │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │   │
│  │         │                │                │             │   │
│  │         └────────────────┼────────────────┘             │   │
│  │                          │                               │   │
│  │  ┌───────────────────────┼───────────────────────────┐ │   │
│  │  │        Managed Services                            │ │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │ │   │
│  │  │  │ PostgreSQL  │  │    Redis    │  │ S3/R2     │ │ │   │
│  │  │  │  (Supabase) │  │  (Upstash)  │  │(Cloudflare)│ │ │   │
│  │  │  └─────────────┘  └─────────────┘  └───────────┘ │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Scaling Strategy

- **Horizontal**: Multiple backend instances behind load balancer
- **Database**: Read replicas for reporting queries
- **Cache**: Redis for session, rate limiting, job queues
- **Files**: S3-compatible object storage with CDN

## 9. Monitoring & Observability

### 9.1 Health Checks

```
GET /api/health
{
  "status": "ok",
  "timestamp": "2024-12-13T10:00:00Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "telegram": "ok",
    "storage": "ok"
  }
}
```

### 9.2 Logging Strategy

- **Application logs**: JSON format, structured
- **Audit logs**: All user actions in `ActionLog` table
- **Error tracking**: Sentry integration
- **Metrics**: Prometheus-compatible `/metrics` endpoint

---

**Document Version:** 2.0.0
**Last Updated:** 2024-12-13
**Maintainer:** VendHub Team
