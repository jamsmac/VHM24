# VendHub Manager (VHM24) - Project Description

> **Document Version**: 1.1.0
> **Created**: 2025-12-19
> **Last Updated**: 2025-12-19
> **Language**: English

---

## Table of Contents

1. [Overview](#1-overview)
2. [Project Architecture](#2-project-architecture)
3. [Main Modules and Components](#3-main-modules-and-components)
4. [Functionality](#4-functionality)
5. [Data Flows](#5-data-flows)
6. [API / Endpoints](#6-api--endpoints)
7. [Database](#7-database)
8. [Configuration](#8-configuration)
9. [Getting Started](#9-getting-started)
10. [Working with the Project](#10-working-with-the-project)
11. [Known Considerations](#11-known-considerations)

---

## 1. OVERVIEW

### **What is this?**
VendHub Manager is a comprehensive vending machine management system (ERP/CRM/CMMS) built on the principle of **manual operations**. The system has NO direct machine connectivity - all data flows through operator actions with mandatory photo validation.

### **Who is it for?**
- **Vending business owners** - Full fleet control and management
- **Operators** - Task execution through mobile app
- **Managers** - Analytics, reporting, personnel management
- **End customers** - Order products via QR codes (client platform)

### **Core Problem Solved**
Centralized management of vending machine fleets without expensive telemetry infrastructure. Track inventory, finances, tasks, and incidents in a unified system.

### **Technology Stack**

| Layer | Stack |
|-------|-------|
| Backend | NestJS 10, TypeORM, PostgreSQL 14+, Redis 7, Bull |
| Frontend | Next.js 16, React 19, TailwindCSS, Zustand, TanStack Query |
| Mobile | React Native (Expo 54), React Navigation 7 |
| Infrastructure | Docker, Railway.app, GitHub Actions, Prometheus + Grafana |

### **Codebase Statistics**

| Metric | Value |
|--------|-------|
| Backend TypeScript files | 924 |
| Frontend React components | 233 |
| Database entities | 108 |
| Test files | 254 |
| Database migrations | 62 |
| Backend modules | 45 |
| Frontend pages | 93 |
| Mobile components | 19 |
| Frontend hooks | 8 |

---

## 2. PROJECT ARCHITECTURE

### Top-Level Folder Structure

```
VHM24/
├── backend/                 # NestJS API (924 TypeScript files)
├── frontend/                # Next.js Dashboard (233 components)
├── mobile/                  # React Native App (19 components)
├── docs/                    # Documentation
├── monitoring/              # Prometheus + Grafana
├── nginx/                   # Proxy configuration
├── scripts/                 # Deployment utilities
├── .claude/                 # AI assistant rules
├── .github/workflows/       # CI/CD pipelines
├── docker-compose.yml       # Local development
├── CLAUDE.md                # Main AI guide (v2.1.0)
└── DEPLOYMENT.md            # Deployment instructions
```

### Application Entry Points

| Component | File | Description |
|-----------|------|-------------|
| Backend API | `backend/src/main.ts` | NestJS server startup |
| Backend Modules | `backend/src/app.module.ts` | Root module |
| Frontend | `frontend/src/app/layout.tsx` | Next.js root layout |
| Mobile | `mobile/src/App.tsx` | Expo entry point |

### Dual Platform Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VendHub Manager                          │
├─────────────────────────────┬───────────────────────────────┤
│       Staff Platform        │       Client Platform         │
│        (Internal)           │         (Public)              │
├─────────────────────────────┼───────────────────────────────┤
│ • /api/* endpoints          │ • /api/client/* endpoints     │
│ • JWT authentication        │ • Telegram Web App auth       │
│ • RBAC with system roles    │ • Public machine menus        │
│ • Management dashboard      │ • Orders & loyalty program    │
│ • Operator mobile app       │ • Client mobile app           │
└─────────────────────────────┴───────────────────────────────┘
```

### Detailed Backend Structure

```
backend/src/
├── modules/                   # 45 feature modules
│   ├── auth/                  # JWT + 2FA authentication
│   ├── users/                 # User management
│   ├── machines/              # Machine CRUD + QR codes
│   ├── machine-access/        # Per-machine access roles
│   ├── tasks/                 # Operator tasks
│   ├── inventory/             # 3-level inventory system
│   ├── transactions/          # Financial operations
│   ├── incidents/             # Machine incidents
│   ├── notifications/         # Multi-channel notifications
│   ├── telegram/              # Telegram bot
│   ├── client/                # Client platform
│   └── ...                    # 34 more modules
├── common/                    # Shared utilities
│   ├── entities/              # BaseEntity
│   ├── guards/                # Auth guards
│   ├── decorators/            # Custom decorators
│   └── filters/               # Exception filters
├── database/
│   ├── migrations/            # 62 migrations
│   └── seeds/                 # Data seeders
├── config/                    # Configuration
└── scheduled-tasks/           # Cron jobs
```

### Detailed Frontend Structure

```
frontend/src/
├── app/                       # Next.js App Router
│   ├── (auth)/                # Auth pages
│   ├── (public)/              # Public pages
│   │   ├── menu/[machineNumber]/  # Machine menu
│   │   └── order/[orderId]/   # Order tracking
│   └── dashboard/             # Protected dashboard (93 pages)
├── components/                # 20 component directories
│   ├── ui/                    # Shadcn UI primitives
│   ├── machines/              # Machine components
│   ├── tasks/                 # Task components
│   └── ...
├── hooks/                     # 8 custom hooks
├── lib/                       # API clients & utilities
├── providers/                 # Context providers
└── types/                     # TypeScript types
```

### Detailed Mobile Structure

```
mobile/src/
├── screens/                   # App screens
│   ├── Auth/                  # Authentication
│   ├── Tasks/                 # Operator tasks
│   ├── Equipment/             # Equipment management
│   ├── Profile/               # User profile
│   └── Client/                # Client interface
├── navigation/                # Navigation config
│   ├── AppNavigator.tsx       # Main navigator
│   ├── MainNavigator.tsx      # Staff navigation
│   └── ClientNavigator.tsx    # Client navigation
├── components/                # Reusable components
├── services/                  # API services
├── store/                     # Zustand state
└── hooks/                     # Custom hooks
```

---

## 3. MAIN MODULES AND COMPONENTS

### Block 1: Core System

| Component | Purpose | Location |
|-----------|---------|----------|
| Machines | Machine CRUD, QR codes, statuses | `backend/src/modules/machines/` |
| Tasks | Operator tasks with photo validation | `backend/src/modules/tasks/` |
| Inventory | 3-level inventory system | `backend/src/modules/inventory/` |
| Transactions | Financial operations | `backend/src/modules/transactions/` |

### Block 2: Authentication & Users

| Component | Purpose | Location |
|-----------|---------|----------|
| Auth | JWT + Refresh tokens + 2FA | `backend/src/modules/auth/` |
| Users | User management | `backend/src/modules/users/` |
| RBAC | Roles and permissions | `backend/src/modules/rbac/` |
| Machine Access | Per-machine role access | `backend/src/modules/machine-access/` |

### Block 3: Operations

| Component | Purpose | Location |
|-----------|---------|----------|
| Incidents | Machine incidents & issues | `backend/src/modules/incidents/` |
| Complaints | Customer complaints | `backend/src/modules/complaints/` |
| Equipment | Equipment & components | `backend/src/modules/equipment/` |
| Routes | Route planning | `backend/src/modules/routes/` |

### Block 4: Reference Data

| Component | Purpose | Location |
|-----------|---------|----------|
| Nomenclature | Product catalog | `backend/src/modules/nomenclature/` |
| Recipes | Recipes with versioning | `backend/src/modules/recipes/` |
| Locations | Sales points/locations | `backend/src/modules/locations/` |
| Dictionaries | System dictionaries | `backend/src/modules/dictionaries/` |

### Block 5: Integrations & Communications

| Component | Purpose | Location |
|-----------|---------|----------|
| Telegram | Telegram bot with FSM | `backend/src/modules/telegram/` |
| Notifications | Multi-channel (email, push, in-app) | `backend/src/modules/notifications/` |
| Web Push | Browser push notifications | `backend/src/modules/web-push/` |
| Email | Email service | `backend/src/modules/email/` |

### Block 6: Analytics & Reporting

| Component | Purpose | Location |
|-----------|---------|----------|
| Analytics | Dashboard metrics | `backend/src/modules/analytics/` |
| Reports | PDF report generation | `backend/src/modules/reports/` |
| Audit Logs | Audit logging | `backend/src/modules/audit-logs/` |
| Monitoring | System monitoring | `backend/src/modules/monitoring/` |

### Block 7: Client Platform

| Component | Purpose | Location |
|-----------|---------|----------|
| Client Auth | Telegram authentication | `backend/src/modules/client/` |
| Client Orders | Customer orders | `backend/src/modules/client/` |
| Loyalty | Loyalty program | `backend/src/modules/client/` |
| Public Menu | Public machine menu | `frontend/src/app/(public)/menu/` |

---

## 4. FUNCTIONALITY

### Authentication & Users

- **JWT authentication** - access token 15 min, refresh token 7 days
- **Two-factor authentication** - TOTP via Speakeasy
- **System roles** - SuperAdmin, Admin, Manager, Operator, Collector, Technician, Viewer
- **Machine-level roles** - Owner, Admin, Manager, Operator, Technician, Viewer
- **Access requests** - New user approval workflow
- **Sessions** - Active session tracking, forced logout

### Machine Management

- **CRUD operations** - Create, read, update, delete machines
- **QR codes** - Generation and scanning by `machine_number`
- **Statuses** - active, low_stock, error, maintenance, offline, disabled
- **Contracts** - Location binding with commission
- **Capacity** - Capacity and slot management
- **Payment settings** - Cash, card, QR payment

### Tasks (CENTRAL MECHANISM)

- **Task types** - refill, collection, cleaning, repair, install, removal, audit, inspection
- **Workflow** - pending -> assigned -> in_progress -> completed/rejected
- **Photo validation** - MANDATORY before/after photos
- **Priorities** - low, normal, high, urgent
- **Escalation** - Auto-incident creation on overdue
- **Comments** - Discussion within tasks
- **Components** - Equipment replacement within tasks

### Inventory (3-Level System)

```
Warehouse Inventory -> Operator Inventory -> Machine Inventory
    (central)           (personal)            (loaded)
```

- **Transfers** - Movement between levels
- **Reservations** - Product booking for tasks
- **Stocktaking** - Actual count with difference recording
- **Thresholds** - Low stock notifications
- **Balances** - Real-time balance calculation

### Finance

- **Transactions** - income, expense, refund, adjustment, transfer
- **Collection** - Cash collection with amount recording
- **Expense categories** - Expense classification
- **Commissions** - Calculation and automated counterparty payments
- **Reconciliation** - Reconciliation reports
- **Opening balances** - Opening balances for accounting start

### Incidents & Monitoring

- **Incident types** - low_stock, error, cash_discrepancy, offline, vandalism
- **Statuses** - created -> in_progress -> resolved -> closed
- **Alerts** - System notifications for critical events
- **Daily Stats** - Daily machine statistics
- **Operator ratings** - Performance metrics

### Mobile App (Staff)

- **Task list** - With filters and search
- **Task details** - Full information + actions
- **Camera** - Before/after photo capture
- **Geolocation** - Location recording
- **Offline mode** - Task queue without internet
- **Push notifications** - New task alerts

### Client Platform

- **Public menu** - `/menu/[machineNumber]` via QR code
- **Telegram auth** - Via Telegram Web App initData
- **Loyalty program** - Points earning and spending
- **Orders** - Placement and tracking (Phase 2)
- **Wallet** - Digital balance (Phase 2)

### Notifications

- **Channels** - in-app, email, Telegram, web push
- **Templates** - Customizable message templates
- **Retry logic** - Retry on failures
- **User settings** - Channel preferences

### Analytics & Reports

- **Dashboard** - Key metrics in real-time
- **PDF reports** - Generation via PDFKit
- **Excel import** - Sales data upload
- **AI import** - Intelligent data parsing
- **Audit** - Full action log

### Telegram Bot

- **FSM states** - Multi-step dialogs
- **Inline keyboards** - Interactive buttons
- **Notifications** - Operator alert delivery
- **Message history** - Conversation logging

---

## 5. DATA FLOWS

### Data Sources

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Mobile App     │    │   Dashboard     │    │  Telegram Bot   │
│                 │    │   (Next.js)     │    │                 │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │      REST API         │
                    │    (NestJS + JWT)     │
                    └───────────┬───────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
┌────────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
│   PostgreSQL    │    │     Redis       │    │   MinIO (S3)    │
│   (main data)   │    │   (cache,       │    │   (photos,      │
│                 │    │    queues)      │    │    files)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Processing

1. **Task creation** -> DTO Validation -> DB Save -> Operator notification
2. **Task execution** -> Photo upload -> Photo validation -> Inventory update -> Task closure
3. **Collection** -> Amount recording -> Transaction creation -> Machine balance update

### Integrations

| Service | Purpose | Protocol |
|---------|---------|----------|
| Telegram Bot API | Notifications, client auth | HTTPS |
| SMTP server | Email notifications | SMTP |
| MinIO / Cloudflare R2 | File storage | S3 API |
| Sentry | Error monitoring | HTTPS |
| Prometheus | Metrics | HTTP |

---

## 6. API / ENDPOINTS

### Base URL: `/api/v1`

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Staff login |
| POST | `/auth/refresh` | Token refresh |
| POST | `/auth/logout` | Logout |
| POST | `/auth/2fa/setup` | 2FA setup |
| POST | `/auth/2fa/verify` | 2FA verification |
| POST | `/auth/password/reset` | Password reset |

### Machines

| Method | Path | Description |
|--------|------|-------------|
| GET | `/machines` | List machines |
| POST | `/machines` | Create machine |
| GET | `/machines/:id` | Get machine |
| PATCH | `/machines/:id` | Update machine |
| DELETE | `/machines/:id` | Delete machine |
| GET | `/machines/:id/qr` | Get QR code |
| GET | `/machines/:id/access` | List access |
| POST | `/machines/:id/access` | Assign access |

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks` | List tasks |
| POST | `/tasks` | Create task |
| GET | `/tasks/:id` | Get task |
| PATCH | `/tasks/:id` | Update task |
| POST | `/tasks/:id/assign` | Assign executor |
| POST | `/tasks/:id/start` | Start execution |
| POST | `/tasks/:id/complete` | Complete (with photos!) |
| POST | `/tasks/:id/reject` | Reject task |

### Inventory

| Method | Path | Description |
|--------|------|-------------|
| GET | `/inventory/warehouse` | Warehouse stock |
| GET | `/inventory/operator/:id` | Operator inventory |
| GET | `/inventory/machine/:id` | Machine inventory |
| POST | `/inventory/transfer` | Transfer |
| POST | `/inventory/adjustment` | Adjustment |

### Client Platform

| Method | Path | Description |
|--------|------|-------------|
| POST | `/client/auth` | Telegram auth |
| GET | `/client/locations` | Public locations |
| GET | `/client/menu/:machineNumber` | Machine menu |
| GET | `/client/loyalty` | Points balance |
| POST | `/client/orders` | Create order |

### Files

| Method | Path | Description |
|--------|------|-------------|
| POST | `/files/upload` | Upload file |
| GET | `/files/:id` | Download file |
| DELETE | `/files/:id` | Delete file |

### Full API Documentation

Swagger UI available at: `http://localhost:3000/api/docs`

---

## 7. DATABASE

### General Statistics

- **108 entities**
- **62 migrations**
- **40+ indexes**

### Key Tables

#### Users and Authentication

```sql
users                    -- System users
├── id (uuid, PK)
├── email (unique)
├── password_hash
├── role (enum)
├── status (enum)
├── telegram_id
└── two_factor_secret (encrypted)

machine_access          -- Machine access control
├── id (uuid, PK)
├── machine_id (FK)
├── user_id (FK)
└── role (enum)
```

#### Machines

```sql
machines                -- Vending machines
├── id (uuid, PK)
├── machine_number (unique)  -- PRIMARY IDENTIFIER!
├── name
├── status (enum)
├── location_id (FK)
├── settings (jsonb)
└── payment_methods (jsonb)
```

#### Tasks

```sql
tasks                   -- Operator tasks
├── id (uuid, PK)
├── type (enum)
├── status (enum)
├── priority (enum)
├── machine_id (FK)
├── assigned_to_id (FK)
├── due_date
└── completed_at

task_items              -- Task line items (for refill)
├── task_id (FK)
├── nomenclature_id (FK)
├── quantity
└── actual_quantity
```

#### Inventory

```sql
warehouse_inventory     -- Warehouse stock
├── nomenclature_id (FK)
├── quantity
└── reserved_quantity

operator_inventory      -- Operator inventory
├── user_id (FK)
├── nomenclature_id (FK)
└── quantity

machine_inventory       -- Machine inventory
├── machine_id (FK)
├── nomenclature_id (FK)
├── quantity
└── slot_number
```

#### Finance

```sql
transactions           -- Financial operations
├── id (uuid, PK)
├── type (enum)
├── amount (decimal)
├── machine_id (FK)
├── task_id (FK)
└── category_id (FK)
```

### Table Relationships

```
users ─────────< machine_access >───────── machines
   │                                          │
   │                                          │
   └──────────< tasks >───────────────────────┘
                  │
                  ├──< task_items
                  ├──< task_comments
                  └──< files (photos)

machines ──────< machine_inventory >────── nomenclature
                                              │
                                              │
warehouse_inventory ──────────────────────────┘
operator_inventory ───────────────────────────┘
```

### Migration Management

```bash
# Generate migration after entity changes
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

---

## 8. CONFIGURATION

### Backend Environment Variables (.env)

```bash
# Core
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/vendhub
# or separately:
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=vendhub

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-64-character-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Encryption
ENCRYPTION_KEY=32-byte-base64-encoded-key

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=vendhub
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3001

# Web Push
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
```

### Frontend Environment Variables (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_NAME=VendHub Manager
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
```

### Docker Compose Services

```yaml
services:
  postgres:
    image: postgres:14-alpine
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]

  backend:
    build: ./backend
    ports: ["3000:3000"]
    depends_on: [postgres, redis, minio]

  frontend:
    build: ./frontend
    ports: ["3001:3000"]
    depends_on: [backend]
```

---

## 9. GETTING STARTED

### Quick Start (Docker)

```bash
# 1. Clone repository
git clone https://github.com/jamsmac/VHM24.git
cd VHM24

# 2. Copy configuration
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Start everything with Docker
docker-compose up -d

# 4. Run migrations
cd backend
npm run migration:run

# 5. Create superadmin
npm run create-superadmin
```

### Local Development

```bash
# Backend
cd backend
npm install
npm run start:dev          # http://localhost:3000
npm run start:debug        # With debugging

# Frontend
cd frontend
npm install
npm run dev                # http://localhost:3001

# Mobile
cd mobile
npm install
npm run start              # Expo DevTools
npm run android            # Android emulator
npm run ios                # iOS simulator
```

### Health Check

```bash
# API documentation
open http://localhost:3000/api/docs

# Health check
curl http://localhost:3000/api/health

# Bull queues
open http://localhost:3000/api/admin/queues
```

### Useful Commands

```bash
# Backend
npm run start:dev         # Start dev server
npm run build             # Production build
npm run test              # Run tests
npm run test:cov          # Tests with coverage
npm run lint              # Code check
npm run format            # Code formatting
npm run migration:generate -- -n MigrationName
npm run migration:run
npm run migration:revert
npm run create-superadmin # Create superadmin

# Frontend
npm run dev               # Start dev server
npm run build             # Production build
npm run start             # Start production server
npm run lint              # Code check
npm run storybook         # Start Storybook

# Mobile
npm run start             # Start Expo
npm run android           # Run on Android
npm run ios               # Run on iOS
npm run test              # Run tests
```

---

## 10. WORKING WITH THE PROJECT

### Adding a New Module

```bash
# 1. Create structure
mkdir -p backend/src/modules/my-module/{dto,entities}

# 2. Create files from .claude/templates/backend/ template
touch backend/src/modules/my-module/my-module.{module,controller,service}.ts
touch backend/src/modules/my-module/entities/my-entity.entity.ts
touch backend/src/modules/my-module/dto/{create,update}-my-entity.dto.ts

# 3. Register in app.module.ts
# imports: [..., MyModule]

# 4. Create migration
npm run migration:generate -- -n CreateMyEntityTable

# 5. Write tests
touch backend/src/modules/my-module/my-module.service.spec.ts
```

### Adding an Endpoint

```typescript
// 1. Add method to service
// my-module.service.ts
async myMethod(dto: MyDto): Promise<MyEntity> {
  // logic
}

// 2. Add endpoint to controller
// my-module.controller.ts
@Post('action')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
async myAction(@Body() dto: MyDto) {
  return this.service.myMethod(dto);
}

// 3. Add test
```

### Changing Database Schema

```bash
# 1. Modify entity
# 2. Generate migration
npm run migration:generate -- -n AddFieldToMyEntity

# 3. Review generated file
# 4. Run migration
npm run migration:run
```

### Typical Workflows

1. **API bug** -> Find controller -> Check service -> Fix -> Write test
2. **New feature** -> Create/extend module -> Migration (if needed) -> Tests -> PR
3. **UI bug** -> Find component in `frontend/src/components/` -> Fix -> Storybook
4. **Add field** -> Entity -> DTO -> Migration -> Frontend type -> UI

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/task-photo-validation

# 2. Implement feature

# 3. Run all checks
npm run lint
npm run type-check
npm run test
npm run build

# 4. Commit with Conventional Commits
git commit -m "feat(tasks): add photo validation before completion

Implemented mandatory photo check for refill tasks.
Tasks cannot be completed without before/after photos.

Closes #123"

# 5. Push and create PR
git push origin feature/task-photo-validation
```

---

## 11. KNOWN CONSIDERATIONS

### Critical to Understand

1. **NO machine connectivity** - All data entered manually by operators
2. **Photos are MANDATORY** - Tasks cannot be closed without before/after photos
3. **3 inventory levels** - Always update all levels during operations
4. **machine_number** - Primary machine identifier, not UUID

### What to Keep in Mind

- **Additive development** - Only add, don't break existing functionality
- **Backward compatibility** - API must not break clients
- **Photo validation** - Always check for photos before closing tasks
- **Inventory sync** - Update all levels on refill/collection completion

### Technical Debt (TODO)

- [ ] Full test coverage for client platform
- [ ] Offline-first for mobile app
- [ ] GraphQL subscriptions for real-time
- [ ] Full i18n localization
- [ ] Performance optimization for large datasets

### Known Limitations

- WebSocket requires sticky sessions when scaling
- Large Excel files (>10MB) require increased timeout
- PDF generation is memory-intensive - don't run many in parallel

### Red Flags (What NOT to Do)

1. Create direct machine connectivity features
2. Skip photo validation when closing tasks
3. Forget to update inventory after tasks
4. Use `any` type instead of interfaces
5. Write raw SQL queries instead of TypeORM
6. Hardcode secrets in code
7. Break API backward compatibility
8. Modify enums in incompatible ways
9. Mix staff and client authentication

---

## Quick Links

| Resource | URL |
|----------|-----|
| API Docs | `http://localhost:3000/api/docs` |
| Bull Dashboard | `http://localhost:3000/api/admin/queues` |
| Storybook | `npm run storybook` in frontend |
| MinIO Console | `http://localhost:9001` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3003` |

---

## Key Files to Study

| Purpose | Path |
|---------|------|
| Main AI Guide | `/CLAUDE.md` |
| Development Rules | `/.claude/rules.md` |
| Main API | `/backend/src/main.ts` |
| App Module | `/backend/src/app.module.ts` |
| Base Entity | `/backend/src/common/entities/base.entity.ts` |
| Environment | `/backend/.env.example` |
| Docker Compose | `/docker-compose.yml` |
| Frontend Root | `/frontend/src/app/layout.tsx` |
| Frontend Auth | `/frontend/src/hooks/useAuth.ts` |
| Mobile Navigator | `/mobile/src/navigation/AppNavigator.tsx` |
| Migrations | `/backend/src/database/migrations/` |

---

**Document Version**: 1.1.0
**Created**: 2025-12-19
**Last Updated**: 2025-12-19
**Author**: Claude Code
**Project**: VendHub Manager (VHM24)
