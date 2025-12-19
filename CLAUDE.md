# CLAUDE.md - AI Assistant Guide for VendHub Manager

> **Last Updated**: 2025-12-19
> **Version**: 2.1.0
> **Target Audience**: AI Assistants (Claude, GPT, etc.)

This document provides comprehensive guidance for AI assistants working on the VendHub Manager codebase. It explains the architecture, conventions, workflows, and critical rules that must be followed.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Critical Architecture Principles](#critical-architecture-principles)
3. [Additive Development Rules](#additive-development-rules)
4. [Dual Platform Architecture](#dual-platform-architecture)
5. [Machine Identifiers](#machine-identifiers)
6. [Codebase Structure](#codebase-structure)
7. [Technology Stack](#technology-stack)
8. [Development Workflows](#development-workflows)
9. [Code Conventions](#code-conventions)
10. [Module Patterns](#module-patterns)
11. [Public API Patterns](#public-api-patterns)
12. [Bulk Import Patterns](#bulk-import-patterns)
13. [Machine Access Control](#machine-access-control)
14. [Client Data Model](#client-data-model)
15. [Telegram Integration](#telegram-integration)
16. [QR Code and Mobile Patterns](#qr-code-and-mobile-patterns)
17. [Database Guidelines](#database-guidelines)
18. [Testing Requirements](#testing-requirements)
19. [Security Best Practices](#security-best-practices)
20. [Common Tasks Guide](#common-tasks-guide)
21. [Pitfalls to Avoid](#pitfalls-to-avoid)
22. [Specialized Claude Agents](#specialized-claude-agents)

---

## Project Overview

**VendHub Manager** is a complete vending machine management system (ERP/CRM/CMMS) with two distinct platforms:

### Staff Platform (VHM24)
- **Machines**: Vending machine fleet management
- **Tasks**: Photo-validated operator workflows (refill, collection, maintenance)
- **Inventory**: 3-level inventory system (warehouse -> operator -> machine)
- **Finance**: Transactions, collections, expenses
- **Operations**: User management, incidents, complaints
- **Integrations**: Telegram bot, web push, sales imports

### Client Platform (NEW)
- **Client Web**: Public-facing website for customers
- **Client Mobile**: React Native/Expo app for customers
- **Telegram Payments**: QR -> Telegram deep link -> Payment flow
- **Loyalty Program**: Points, bonuses, wallets

**Key Characteristic**: NO direct machine connectivity. All data flows through operator actions and manual data entry with photo validation.

---

## Critical Architecture Principles

### MUST UNDERSTAND BEFORE CODING

#### 1. **Manual Operations Architecture**
- **NO direct machine connectivity** - All data collected through operator actions
- **NO automated status updates** - Operators manually update machine states
- **NO real-time data sync** - Data flows through scheduled tasks and imports

#### 2. **Photo Validation is Mandatory**
```typescript
// WRONG - Tasks cannot be completed without photos
async completeTask(taskId: string) {
  await this.taskRepository.update(taskId, { status: 'completed' });
}

// CORRECT - Always validate photos before/after
async completeTask(taskId: string) {
  const photosBefore = await this.getPhotos(taskId, 'task_photo_before');
  const photosAfter = await this.getPhotos(taskId, 'task_photo_after');

  if (!photosBefore.length) throw new BadRequestException('Photos before required');
  if (!photosAfter.length) throw new BadRequestException('Photos after required');

  await this.taskRepository.update(taskId, { status: 'completed' });
  await this.updateInventoryAfterTask(taskId); // If refill/collection
}
```

#### 3. **3-Level Inventory Flow**
```
Warehouse Inventory -> Operator Inventory -> Machine Inventory
     (central)           (personal)           (loaded)
```
- **Refill tasks**: Move inventory from operator -> machine
- **Collection tasks**: Record cash/card transactions
- **Always update all levels** when tasks complete

#### 4. **Tasks are the Central Mechanism**
All operations flow through tasks:
- Refill (пополнение) - Load products into machine
- Collection (инкассация) - Collect cash from machine
- Maintenance (обслуживание) - Service machine
- Inspection (проверка) - Check machine condition
- Repair (ремонт) - Fix machine issues
- Cleaning (мойка) - Clean machine/components

---

## Additive Development Rules

### CRITICAL: NON-BREAKING CHANGES ONLY

When extending the system, follow these rules strictly:

#### 1. **Never Delete or Rename Existing Code**
```typescript
// WRONG - Breaks existing consumers
// Renamed: CreateMachineDto -> CreateMachineRequestDto
// Deleted: findByStatus() method

// CORRECT - Add new, keep old
export class CreateMachineDto { /* unchanged */ }
export class CreateMachineRequestDtoV2 { /* new version */ }

// Old method stays, new method added
async findByStatus(status: string) { /* unchanged */ }
async findByStatusWithAccess(status: string, userId: string) { /* new */ }
```

#### 2. **New Files Over Editing Old Ones**
```
// WRONG - Modifying existing machine.entity.ts extensively

// CORRECT - Create new entity for new features
machine.entity.ts           // Unchanged
machine-access.entity.ts    // NEW - for access control
client-user.entity.ts       // NEW - for client platform
```

#### 3. **New Endpoints Over Modifying Existing**
```typescript
// WRONG - Changing existing endpoint behavior
@Get('machines')
findAll() { /* changed behavior */ }

// CORRECT - Add new endpoint with v2 or specific path
@Get('machines')
findAll() { /* unchanged */ }

@Get('v2/machines')
findAllWithAccess() { /* new with access filtering */ }

@Get('public/machines')
findAllPublic() { /* new public endpoint */ }
```

#### 4. **Preserve All Existing Tests**
```bash
# Before any changes, ensure:
npm run test  # All existing tests pass

# After changes:
npm run test  # All existing tests STILL pass
# New tests added for new functionality
```

#### 5. **Handle Conflicts with New Endpoints**
```typescript
// If new feature conflicts with existing behavior:
// 1. Keep existing endpoint unchanged
// 2. Create new endpoint for new behavior
// 3. Document the difference

// Example: Adding access control
@Get('machines')           // Original - returns all (for backward compat)
@Get('machines/accessible') // New - returns only accessible machines
```

---

## Dual Platform Architecture

### Platform Separation

```
┌─────────────────────────────────────────────────────────────────┐
│                     VendHub Backend API                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐      ┌──────────────────────────┐     │
│  │    STAFF MODULES     │      │    CLIENT MODULES        │     │
│  │   (Authenticated)    │      │   (Public + Fast Auth)   │     │
│  ├──────────────────────┤      ├──────────────────────────┤     │
│  │ /api/machines        │      │ /api/public/locations    │     │
│  │ /api/tasks           │      │ /api/public/machines     │     │
│  │ /api/inventory       │      │ /api/public/qr/:code     │     │
│  │ /api/users           │      │ /api/client/auth         │     │
│  │ /api/transactions    │      │ /api/client/orders       │     │
│  │ /api/telegram/*      │      │ /api/client/loyalty      │     │
│  └──────────────────────┘      │ /api/client/wallet       │     │
│                                 └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────┐            ┌──────────────────────────────┐
│   Staff Frontend     │            │      Client Platforms        │
│   (Next.js Admin)    │            │  ┌────────────────────────┐  │
│   Port 3001          │            │  │  Client Web (Next.js)  │  │
└──────────────────────┘            │  │  /client-web           │  │
           │                        │  └────────────────────────┘  │
           ▼                        │  ┌────────────────────────┐  │
┌──────────────────────┐            │  │  Mobile App (Expo)     │  │
│   Mobile Operator    │            │  │  /mobile-client        │  │
│   (Expo - Staff)     │            │  └────────────────────────┘  │
│   /mobile            │            │  ┌────────────────────────┐  │
└──────────────────────┘            │  │  Telegram Bot          │  │
                                    │  │  (Payment flow)        │  │
                                    │  └────────────────────────┘  │
                                    └──────────────────────────────┘
```

### Two User Types

| Aspect | Staff User (users table) | Client User (client_users table) |
|--------|-------------------------|----------------------------------|
| Auth | JWT + 2FA | Fast auth (Telegram) |
| Roles | SUPERADMIN, ADMIN, MANAGER, OPERATOR, TECHNICIAN | CLIENT |
| Access | Full system | Own orders, wallet, loyalty |
| Tables | users, user_roles, user_permissions | client_users |
| Endpoints | /api/* | /api/public/*, /api/client/* |

---

## Machine Identifiers

### Understanding Machine IDs

The system uses multiple identifiers for machines:

| Field | Purpose | Example | Unique |
|-------|---------|---------|--------|
| `id` | Internal UUID | `550e8400-e29b-41d4-a716-446655440000` | Yes |
| `machine_number` | Primary business ID | `M-001`, `VM-042` | Yes |
| `serial_number` | Manufacturer serial | `SN-ABC123456` | No (nullable) |
| `qr_code` | QR code identifier | `VH-M001-ABC123` | Yes |

### Resolution Priority
When resolving a machine from external input:
```typescript
async resolveMachine(identifier: string): Promise<Machine> {
  // 1. Try UUID first
  if (isUUID(identifier)) {
    return await this.findById(identifier);
  }

  // 2. Try machine_number (primary business ID)
  const byNumber = await this.findByMachineNumber(identifier);
  if (byNumber) return byNumber;

  // 3. Try QR code
  const byQr = await this.findByQrCode(identifier);
  if (byQr) return byQr;

  // 4. Try serial_number (fallback)
  const bySerial = await this.findBySerialNumber(identifier);
  if (bySerial) return bySerial;

  throw new NotFoundException('Machine not found');
}
```

---

## Codebase Structure

```
VendHub/
├── backend/                           # NestJS 10 Backend API
│   ├── src/
│   │   ├── modules/                   # Feature modules (domain-driven)
│   │   │   ├── auth/                  # JWT authentication
│   │   │   ├── users/                 # Staff user management + RBAC
│   │   │   ├── machines/              # Machine CRUD + QR codes
│   │   │   ├── machine-access/        # NEW: User-Machine access control
│   │   │   ├── tasks/                 # CORE: Task management
│   │   │   ├── inventory/             # 3-level inventory system
│   │   │   ├── transactions/          # Financial transactions
│   │   │   ├── incidents/             # Machine incidents
│   │   │   ├── complaints/            # Customer complaints
│   │   │   ├── nomenclature/          # Products catalog
│   │   │   ├── recipes/               # Product recipes + versioning
│   │   │   ├── files/                 # File/photo management
│   │   │   ├── notifications/         # Multi-channel notifications
│   │   │   ├── telegram/              # Telegram bot (staff)
│   │   │   ├── telegram-client/       # NEW: Telegram payments (client)
│   │   │   ├── web-push/              # Browser push notifications
│   │   │   ├── sales-import/          # Excel/CSV sales import
│   │   │   ├── bulk-import/           # NEW: Bulk machine/user import
│   │   │   ├── intelligent-import/    # AI-powered data import
│   │   │   ├── reports/               # PDF report generation
│   │   │   ├── analytics/             # Analytics tables
│   │   │   ├── equipment/             # Equipment/components
│   │   │   ├── locations/             # Location management
│   │   │   ├── dictionaries/          # System dictionaries
│   │   │   ├── routes/                # Route planning
│   │   │   ├── billing/               # Billing module
│   │   │   ├── warehouse/             # Warehouse management
│   │   │   ├── hr/                    # HR module
│   │   │   ├── integration/           # External integrations
│   │   │   ├── security/              # Security & audit
│   │   │   ├── rbac/                  # Role-based access control
│   │   │   │
│   │   │   │   # CLIENT PLATFORM MODULES (NEW)
│   │   │   ├── client-auth/           # Client fast authentication
│   │   │   ├── client-users/          # Client user management
│   │   │   ├── client-orders/         # Client orders
│   │   │   ├── client-payments/       # Payment processing
│   │   │   ├── client-loyalty/        # Loyalty program
│   │   │   ├── client-wallets/        # Client wallets
│   │   │   ├── public-api/            # Public endpoints
│   │   │   │
│   │   │   ├── access-requests/       # User access requests
│   │   │   ├── alerts/                # System alerts
│   │   │   ├── audit-logs/            # Audit logging
│   │   │   ├── counterparty/          # Counterparty management
│   │   │   ├── data-parser/           # Data parsing utilities
│   │   │   ├── monitoring/            # System monitoring
│   │   │   ├── opening-balances/      # Opening balances
│   │   │   ├── operator-ratings/      # Operator ratings
│   │   │   ├── purchase-history/      # Purchase history
│   │   │   ├── reconciliation/        # Reconciliation
│   │   │   ├── requests/              # General requests
│   │   │   ├── websocket/             # WebSocket support
│   │   │   └── bull-board/            # Job queue dashboard
│   │   ├── common/                    # Shared utilities
│   │   │   ├── entities/              # Base entity classes
│   │   │   ├── filters/               # Exception filters
│   │   │   ├── guards/                # Auth guards (JWT, RBAC, Public)
│   │   │   ├── decorators/            # Custom decorators
│   │   │   └── pipes/                 # Validation pipes
│   │   ├── config/                    # Configuration
│   │   ├── database/                  # Database management
│   │   │   ├── migrations/            # TypeORM migrations
│   │   │   └── seeds/                 # Database seeders
│   │   ├── scheduled-tasks/           # Cron jobs
│   │   ├── health/                    # Health checks
│   │   ├── main.ts                    # Application entry point
│   │   └── app.module.ts              # Root module
│   ├── test/                          # E2E tests
│   └── package.json
│
├── frontend/                          # Next.js 16 Staff Frontend
│   ├── src/
│   │   ├── app/                       # Next.js App Router
│   │   ├── components/                # React components
│   │   ├── lib/                       # Utilities
│   │   ├── hooks/                     # Custom React hooks
│   │   └── types/                     # TypeScript types
│   └── package.json
│
├── client-web/                        # NEW: Next.js Client Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── locations/            # Location listing
│   │   │   ├── machines/[id]/        # Machine details
│   │   │   ├── scan/                 # QR scanner page
│   │   │   └── profile/              # Client profile
│   │   ├── components/
│   │   └── lib/
│   └── package.json
│
├── mobile/                            # React Native/Expo Staff App
│   ├── src/
│   │   ├── screens/                   # Operator screens
│   │   ├── components/
│   │   └── services/
│   └── package.json
│
├── mobile-client/                     # NEW: React Native/Expo Client App
│   ├── src/
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx        # Main screen with scanner
│   │   │   ├── ScanScreen.tsx        # QR scanner
│   │   │   ├── MachineScreen.tsx     # Machine details
│   │   │   ├── ProfileScreen.tsx     # User profile
│   │   │   └── LoyaltyScreen.tsx     # Loyalty program
│   │   ├── components/
│   │   │   ├── QRScanner.tsx         # Camera QR scanner
│   │   │   └── TelegramButton.tsx    # Telegram deep link button
│   │   ├── services/
│   │   │   └── api.ts                # API client
│   │   └── store/
│   │       └── useClientStore.ts     # Zustand store
│   └── package.json
│
├── docs/                              # Documentation
├── .claude/                           # Claude Code Rules & Templates
│   ├── agents/                        # Specialized Claude agents
│   └── templates/                     # Code templates
├── monitoring/                        # Monitoring configuration
├── scripts/                           # Deployment/utility scripts
├── .github/workflows/                 # CI/CD pipelines
├── docker-compose.yml                 # Local development
├── CLAUDE.md                          # This file
├── DEPLOYMENT.md                      # Deployment guide
└── SECURITY.md                        # Security documentation
```

---

## Technology Stack

### Backend
- **Framework**: NestJS 10 (TypeScript)
- **Database**: PostgreSQL 14+
- **ORM**: TypeORM with migrations
- **Authentication**: JWT with refresh tokens, 2FA (TOTP), Fast Auth (Telegram)
- **Validation**: class-validator, class-transformer
- **API Docs**: Swagger/OpenAPI
- **Job Queue**: Bull + Redis
- **Scheduled Tasks**: @nestjs/schedule (cron)
- **File Storage**: S3-compatible (AWS S3, Cloudflare R2, MinIO)
- **PDF Generation**: PDFKit
- **Excel/CSV**: exceljs, csv-parser
- **QR Codes**: qrcode
- **Web Push**: web-push (VAPID)
- **Telegram**: telegraf
- **Email**: nodemailer
- **AI Integration**: OpenAI
- **Monitoring**: Prometheus, Sentry
- **Security**: helmet, bcrypt, @nestjs/throttler
- **WebSocket**: Socket.IO
- **Caching**: cache-manager with Redis (ioredis)
- **Payments**: Telegram Payments API (NEW)

### Staff Frontend (Next.js)
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: TailwindCSS 3.4
- **Components**: Radix UI, shadcn/ui
- **State Management**: Zustand, TanStack Query
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **Charts**: Recharts
- **Maps**: Leaflet
- **HTTP Client**: Axios
- **WebSocket**: Socket.IO Client
- **Internationalization**: next-intl
- **Testing**: Vitest, Testing Library, Playwright
- **Documentation**: Storybook 10

### Client Web (Next.js) - NEW
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: TailwindCSS 3.4
- **Components**: shadcn/ui (mobile-optimized)
- **State Management**: Zustand
- **HTTP Client**: Axios
- **QR Scanner**: html5-qrcode
- **PWA**: next-pwa

### Mobile Staff (Expo)
- **Framework**: Expo SDK 54
- **Navigation**: React Navigation 7
- **State Management**: Zustand, TanStack Query
- **Storage**: Expo Secure Store
- **Camera**: Expo Camera
- **Location**: Expo Location
- **Maps**: React Native Maps
- **Push Notifications**: Expo Notifications

### Mobile Client (Expo) - NEW
- **Framework**: Expo SDK 54
- **Navigation**: React Navigation 7
- **State Management**: Zustand
- **Storage**: AsyncStorage (offline cache)
- **Camera**: Expo Camera (QR scanning)
- **Deep Links**: Expo Linking (Telegram)
- **Offline Support**: NetInfo + cached data

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 14+ (Supabase for production)
- **Cache/Queue**: Redis 7
- **Object Storage**: MinIO (dev), Cloudflare R2 (prod)
- **CI/CD**: GitHub Actions
- **Hosting**: Railway (production), Vercel (frontends)
- **Monitoring**: Prometheus + Grafana

---

## Development Workflows

### 1. Creating a New Feature (Additive)

```bash
# 1. Create feature branch
git checkout -b feature/client-loyalty-program

# 2. Create NEW modules/files (don't modify existing heavily)
mkdir -p backend/src/modules/client-loyalty

# 3. Verify existing tests still pass
npm run test

# 4. Implement with NEW files
# 5. Add NEW tests for new functionality
# 6. Run all checks
npm run lint && npm run type-check && npm run test && npm run build

# 7. Commit with conventional commits
git commit -m "feat(client): add loyalty program module

New module for client loyalty points and rewards.
Does not modify existing staff modules.

Closes #123"
```

### 2. Git Commit Message Format

**REQUIRED FORMAT** (Conventional Commits):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code formatting
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `build`: Build system changes

**Scopes**:
- `machines`: Machine module
- `tasks`: Task module
- `client`: Client platform (NEW)
- `telegram`: Telegram integration
- `mobile`: Mobile apps
- `api`: API changes

### 3. Branch Naming

```bash
feature/client-loyalty-program     # New client features
feature/machine-access-control     # New staff features
fix/qr-scan-ios-camera            # Bug fixes
docs/client-api-documentation      # Documentation
```

---

## Code Conventions

### Backend (TypeScript/NestJS)

#### File Naming
```
kebab-case for all files:
  - client-user.service.ts
  - machine-access.controller.ts
  - client-order.entity.ts
  - create-client-user.dto.ts
```

#### Class/Interface Naming
```typescript
// Classes: PascalCase
class ClientUserService {}
class MachineAccessController {}
class ClientOrder {}

// Interfaces: PascalCase (no I prefix)
interface CreateClientUserDto {}
interface MachineAccessResponse {}

// Types: PascalCase
type ClientAuthMethod = 'telegram' | 'phone' | 'email';

// Enums: PascalCase with UPPER_SNAKE values
enum LoyaltyTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
}
```

#### Path Aliases
```typescript
import { BaseEntity } from '@/common/entities/base.entity';
import { ClientUserService } from '@modules/client-users/client-users.service';
import { PublicGuard } from '@/common/guards/public.guard';
```

### Frontend/Mobile Conventions

Same as backend for TypeScript. Components use PascalCase, hooks use camelCase with `use` prefix.

---

## Module Patterns

### Standard NestJS Module Structure

```
client-users/
├── dto/
│   ├── create-client-user.dto.ts
│   ├── update-client-user.dto.ts
│   └── client-user-response.dto.ts
├── entities/
│   └── client-user.entity.ts
├── guards/
│   └── client-auth.guard.ts          # Module-specific guard
├── client-users.controller.ts
├── client-users.service.ts
├── client-users.module.ts
└── client-users.service.spec.ts
```

### Entity Pattern with Proper Types

```typescript
import { Entity, Column, Index, CreateDateColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

export enum ClientStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

@Entity('client_users')
@Index(['telegram_id'], { unique: true })
@Index(['phone'], { unique: true, where: 'phone IS NOT NULL' })
export class ClientUser extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: true })
  telegram_id: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telegram_username: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  display_name: string | null;

  @Column({
    type: 'enum',
    enum: ClientStatus,
    default: ClientStatus.ACTIVE,
  })
  status: ClientStatus;

  @Column({ type: 'integer', default: 0 })
  loyalty_points: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  wallet_balance: number;

  // Use Record<string, unknown> instead of any
  @Column({ type: 'jsonb', nullable: true })
  preferences: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  first_seen_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_active_at: Date | null;
}
```

---

## Public API Patterns

### Creating Public Endpoints

```typescript
// public-api.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('public')
@Controller('public')
export class PublicApiController {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly machinesService: MachinesService,
  ) {}

  /**
   * Public endpoint - no authentication required
   * Rate limited more strictly than authenticated endpoints
   */
  @Get('locations')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 req/min
  @ApiOperation({ summary: 'Get all public locations' })
  async getPublicLocations() {
    return this.locationsService.findAllPublic();
  }

  @Get('locations/:id')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get location details with machines' })
  async getLocationDetails(@Param('id') id: string) {
    return this.locationsService.findOnePublic(id);
  }

  @Get('machines/:id')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get machine public details' })
  async getMachinePublic(@Param('id') id: string) {
    return this.machinesService.findOnePublic(id);
  }

  /**
   * QR Code resolution endpoint
   * Returns machine info + Telegram payment link
   */
  @Get('qr/:code')
  @Public()
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOperation({ summary: 'Resolve QR code to machine and payment link' })
  async resolveQrCode(@Param('code') code: string) {
    const machine = await this.machinesService.findByQrCode(code);
    return {
      machine_id: machine.id,
      machine_number: machine.machine_number,
      name: machine.name,
      location: machine.location,
      telegram_pay_link: this.buildTelegramPayLink(machine),
      accepts_cash: machine.accepts_cash,
      accepts_card: machine.accepts_card,
      accepts_qr: machine.accepts_qr,
    };
  }

  private buildTelegramPayLink(machine: Machine): string {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    return `https://t.me/${botUsername}?start=pay_${machine.qr_code}`;
  }
}
```

### Public Decorator Implementation

```typescript
// common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

---

## Bulk Import Patterns

### CSV/XLSX Import Structure

```typescript
// bulk-import/dto/bulk-import.dto.ts
export class BulkImportMachineAccessDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}

export interface BulkImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: BulkImportError[];
}

export interface BulkImportError {
  row: number;
  field: string;
  value: string;
  message: string;
}
```

### Bulk Import Service Pattern

```typescript
// bulk-import/bulk-import.service.ts
@Injectable()
export class BulkImportService {
  /**
   * Import machine access from CSV/XLSX
   *
   * CSV Format:
   * user_identifier,machine_identifier,access_level
   * john@example.com,M-001,full
   * operator1,M-002,view
   *
   * User resolution: uuid -> email -> username -> telegram_username
   * Machine resolution: uuid -> machine_number -> serial_number
   */
  async importMachineAccess(
    file: Express.Multer.File,
  ): Promise<BulkImportResult> {
    const rows = await this.parseFile(file);
    const result: BulkImportResult = {
      total: rows.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const user = await this.resolveUser(row.user_identifier);
        const machine = await this.resolveMachine(row.machine_identifier);

        await this.machineAccessService.upsertAccess({
          user_id: user.id,
          machine_id: machine.id,
          access_level: row.access_level,
        });

        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: i + 2, // +2 for header and 0-index
          field: error.field || 'unknown',
          value: error.value || '',
          message: error.message,
        });
      }
    }

    return result;
  }

  /**
   * Resolve user from multiple identifier types
   */
  private async resolveUser(identifier: string): Promise<User> {
    // 1. UUID
    if (isUUID(identifier)) {
      const user = await this.usersService.findById(identifier);
      if (user) return user;
    }

    // 2. Email
    const byEmail = await this.usersService.findByEmail(identifier);
    if (byEmail) return byEmail;

    // 3. Username
    const byUsername = await this.usersService.findByUsername(identifier);
    if (byUsername) return byUsername;

    // 4. Telegram username
    const byTelegram = await this.usersService.findByTelegramUsername(identifier);
    if (byTelegram) return byTelegram;

    throw new NotFoundException(`User not found: ${identifier}`);
  }
}
```

### Access Templates Pattern

```typescript
// machine-access/dto/access-template.dto.ts
export class CreateAccessTemplateDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsArray()
  @IsUUID('4', { each: true })
  machine_ids: string[];

  @IsEnum(AccessLevel)
  default_access_level: AccessLevel;
}

// Apply template to user
export class ApplyAccessTemplateDto {
  @IsUUID()
  template_id: string;

  @IsUUID()
  user_id: string;
}

// Special case: "Assign owner to all machines"
export class AssignOwnerToAllDto {
  @IsUUID()
  user_id: string;
}
```

---

## Machine Access Control

### Many-to-Many User-Machine Access

```typescript
// machine-access/entities/machine-access.entity.ts
export enum AccessLevel {
  VIEW = 'view',           // Can see machine
  OPERATE = 'operate',     // Can perform tasks
  MANAGE = 'manage',       // Can edit machine settings
  FULL = 'full',          // Full access including delete
}

@Entity('machine_access')
@Index(['user_id', 'machine_id'], { unique: true })
@Index(['user_id'])
@Index(['machine_id'])
export class MachineAccess extends BaseEntity {
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({
    type: 'enum',
    enum: AccessLevel,
    default: AccessLevel.VIEW,
  })
  access_level: AccessLevel;

  @Column({ type: 'uuid', nullable: true })
  granted_by_id: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expires_at: Date | null;
}
```

### Access Control Guard

```typescript
// machine-access/guards/machine-access.guard.ts
@Injectable()
export class MachineAccessGuard implements CanActivate {
  constructor(private machineAccessService: MachineAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const machineId = request.params.machineId || request.body.machine_id;

    if (!machineId) return true; // No machine context

    // SuperAdmin and Admin bypass access control
    if (['SUPERADMIN', 'ADMIN'].includes(user.role)) {
      return true;
    }

    const requiredLevel = this.getRequiredLevel(context);
    return this.machineAccessService.hasAccess(
      user.id,
      machineId,
      requiredLevel,
    );
  }
}
```

---

## Client Data Model

### Client Tables Overview

```sql
-- Client users (separate from staff users)
CREATE TABLE client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id VARCHAR(100) UNIQUE,
  telegram_username VARCHAR(100),
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  display_name VARCHAR(200),
  avatar_url TEXT,
  status VARCHAR(20) DEFAULT 'active',
  loyalty_points INTEGER DEFAULT 0,
  loyalty_tier VARCHAR(20) DEFAULT 'bronze',
  wallet_balance DECIMAL(15,2) DEFAULT 0,
  preferences JSONB,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client orders
CREATE TABLE client_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID REFERENCES client_users(id),
  machine_id UUID REFERENCES machines(id),
  order_number VARCHAR(50) UNIQUE,
  status VARCHAR(20) DEFAULT 'pending',
  total_amount DECIMAL(15,2),
  payment_method VARCHAR(20),
  telegram_payment_id VARCHAR(100),
  items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Client payments
CREATE TABLE client_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID REFERENCES client_users(id),
  order_id UUID REFERENCES client_orders(id),
  amount DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'UZS',
  payment_method VARCHAR(20),
  telegram_payment_charge_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Client loyalty transactions
CREATE TABLE client_loyalty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID REFERENCES client_users(id),
  order_id UUID REFERENCES client_orders(id),
  points INTEGER,
  type VARCHAR(20), -- 'earned', 'spent', 'bonus', 'expired'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client wallets (for prepaid balance)
CREATE TABLE client_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID REFERENCES client_users(id) UNIQUE,
  balance DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'UZS',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet transactions
CREATE TABLE client_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES client_wallets(id),
  amount DECIMAL(15,2),
  type VARCHAR(20), -- 'deposit', 'withdrawal', 'payment', 'refund'
  reference_id UUID,
  reference_type VARCHAR(50),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Telegram Integration

### Staff Bot vs Client Bot

| Aspect | Staff Bot | Client Bot |
|--------|-----------|------------|
| Purpose | Operator notifications, task alerts | Customer payments, orders |
| Commands | /start, /tasks, /status | /start, /pay, /balance, /history |
| Payments | No | Yes (Telegram Payments API) |
| Module | `telegram/` | `telegram-client/` |

### Telegram Payment Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  QR Scan    │────▶│  Deep Link  │────▶│  Telegram   │
│  (Mobile)   │     │  t.me/bot   │     │    Bot      │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Payment    │
                                        │  Invoice    │
                                        └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Telegram   │
                                        │  Payments   │
                                        └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Webhook    │
                                        │  Callback   │
                                        └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Order      │
                                        │  Created    │
                                        └─────────────┘
```

### Telegram Client Service Pattern

```typescript
// telegram-client/telegram-client.service.ts
@Injectable()
export class TelegramClientService {
  constructor(
    private readonly bot: Telegraf<Context>,
    private readonly clientUsersService: ClientUsersService,
    private readonly clientOrdersService: ClientOrdersService,
  ) {}

  /**
   * Handle /start command with machine QR code
   * Format: /start pay_VH-M001-ABC123
   */
  async handleStart(ctx: Context) {
    const startParam = ctx.message.text.split(' ')[1];

    if (startParam?.startsWith('pay_')) {
      const qrCode = startParam.replace('pay_', '');
      await this.initializePayment(ctx, qrCode);
    } else {
      await this.showWelcome(ctx);
    }
  }

  /**
   * Initialize payment for machine
   */
  async initializePayment(ctx: Context, qrCode: string) {
    const machine = await this.machinesService.findByQrCode(qrCode);
    const clientUser = await this.getOrCreateClientUser(ctx.from);

    // Show machine info and payment options
    await ctx.reply(
      `Machine: ${machine.name}\nLocation: ${machine.location.name}`,
      Markup.inlineKeyboard([
        [Markup.button.callback('Pay with Telegram', `pay_${machine.id}`)],
        [Markup.button.callback('Use Wallet Balance', `wallet_${machine.id}`)],
      ])
    );
  }

  /**
   * Create Telegram payment invoice
   */
  async createPaymentInvoice(ctx: Context, machineId: string, amount: number) {
    await ctx.replyWithInvoice({
      title: 'Vending Machine Payment',
      description: 'Payment for products',
      payload: JSON.stringify({ machine_id: machineId }),
      provider_token: process.env.TELEGRAM_PAYMENT_TOKEN,
      currency: 'UZS',
      prices: [{ label: 'Total', amount: amount * 100 }],
    });
  }
}
```

---

## QR Code and Mobile Patterns

### QR Code URL Format

```
https://vendhub.app/m/{qr_code}
Example: https://vendhub.app/m/VH-M001-ABC123

Alternative (direct Telegram):
https://t.me/vendhub_bot?start=pay_VH-M001-ABC123
```

### Mobile Client QR Scanner

```typescript
// mobile-client/src/screens/ScanScreen.tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      // Extract QR code from URL or use directly
      const qrCode = extractQrCode(data);

      // Resolve QR to machine info
      const response = await api.get(`/public/qr/${qrCode}`);
      const { telegram_pay_link } = response.data;

      // Open Telegram for payment
      await Linking.openURL(telegram_pay_link);
    } catch (error) {
      Alert.alert('Error', 'Invalid QR code');
    } finally {
      setTimeout(() => setScanned(false), 2000);
    }
  };

  return (
    <CameraView
      style={{ flex: 1 }}
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={handleBarCodeScanned}
    />
  );
}
```

### Offline Support Pattern

```typescript
// mobile-client/src/store/useClientStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface ClientStore {
  locations: Location[];
  machines: Machine[];
  isOffline: boolean;
  lastSync: Date | null;

  syncData: () => Promise<void>;
  getCachedMachine: (id: string) => Machine | null;
}

export const useClientStore = create<ClientStore>()(
  persist(
    (set, get) => ({
      locations: [],
      machines: [],
      isOffline: false,
      lastSync: null,

      syncData: async () => {
        const netInfo = await NetInfo.fetch();

        if (!netInfo.isConnected) {
          set({ isOffline: true });
          return;
        }

        try {
          const [locations, machines] = await Promise.all([
            api.get('/public/locations'),
            api.get('/public/machines'),
          ]);

          set({
            locations: locations.data,
            machines: machines.data,
            isOffline: false,
            lastSync: new Date(),
          });
        } catch (error) {
          set({ isOffline: true });
        }
      },

      getCachedMachine: (id) => {
        return get().machines.find(m => m.id === id) || null;
      },
    }),
    {
      name: 'client-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

## Database Guidelines

### Migrations

```bash
# Generate migration after entity changes
npm run migration:generate -- -n AddClientUsersTables

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Migration Best Practices

```typescript
// Always include both up and down methods
export class AddClientUsersTables1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tables
    await queryRunner.query(`
      CREATE TABLE client_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ...
      );
    `);

    // Add indexes
    await queryRunner.query(`
      CREATE INDEX idx_client_users_telegram_id ON client_users(telegram_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order
    await queryRunner.query(`DROP INDEX idx_client_users_telegram_id`);
    await queryRunner.query(`DROP TABLE client_users`);
  }
}
```

### Entity Conventions

1. **Always extend BaseEntity** for id, timestamps, soft deletes
2. **Use snake_case for column names** (PostgreSQL convention)
3. **Add indexes** for foreign keys and frequently queried fields
4. **Use enums** for status/type fields
5. **Use jsonb** for flexible metadata
6. **NEVER use `any` type** - use `Record<string, unknown>` or specific interfaces
7. **Add proper comments** for Russian context where applicable

---

## Testing Requirements

### Test Coverage Requirements
- **Unit Tests**: Minimum 70% coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user flows
- **Existing tests must ALWAYS pass** after changes

### Running Tests

```bash
# Backend - must pass before and after changes
npm run test              # Unit tests
npm run test:cov          # With coverage
npm run test:e2e          # E2E tests

# Frontend
npm run test              # Vitest

# Mobile
npm run test              # Jest
```

---

## Security Best Practices

### 1. Authentication Patterns

```typescript
// Staff: JWT + optional 2FA
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
createMachine() {}

// Client: Fast auth via Telegram
@UseGuards(ClientAuthGuard)
getClientProfile() {}

// Public: No auth, rate limited
@Public()
@Throttle({ default: { limit: 30, ttl: 60000 } })
getPublicLocations() {}
```

### 2. Input Validation

```typescript
// ALWAYS validate using DTOs with class-validator
export class CreateClientOrderDto {
  @IsUUID()
  machine_id: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;
}
```

### 3. Rate Limiting

```typescript
// Public endpoints: Strict limits
@Throttle({ default: { limit: 30, ttl: 60000 } })  // 30/min

// Authenticated endpoints: Normal limits
@Throttle({ default: { limit: 100, ttl: 60000 } }) // 100/min

// Payment endpoints: Very strict
@Throttle({ default: { limit: 10, ttl: 60000 } })  // 10/min
```

---

## Common Tasks Guide

### Task 1: Add New Client Module

```bash
# 1. Create module structure
cd backend/src/modules
mkdir -p client-loyalty/{dto,entities,guards}

# 2. Create files following patterns above

# 3. Register in app.module.ts
# 4. Create migration
# 5. Add tests
# 6. Run all checks
npm run lint && npm run test && npm run build
```

### Task 2: Add Public Endpoint

```typescript
// Add to public-api.controller.ts
@Get('new-endpoint')
@Public()
@Throttle({ default: { limit: 30, ttl: 60000 } })
@ApiOperation({ summary: 'Description' })
async newEndpoint() {
  return this.service.getPublicData();
}
```

### Task 3: Add Telegram Payment Handler

```typescript
// Add to telegram-client.service.ts
bot.on('pre_checkout_query', async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

bot.on('successful_payment', async (ctx) => {
  const payload = JSON.parse(ctx.message.successful_payment.invoice_payload);
  await this.clientOrdersService.completeOrder(payload.order_id);
});
```

---

## Pitfalls to Avoid

### CRITICAL MISTAKES

#### 1. Breaking Existing Functionality
```typescript
// WRONG - Modifying existing endpoint
@Get('machines')
findAll() { /* changed behavior */ }

// CORRECT - Add new endpoint
@Get('machines')
findAll() { /* unchanged */ }

@Get('v2/machines')
findAllV2() { /* new behavior */ }
```

#### 2. Using `any` Type
```typescript
// WRONG
settings: any;
preferences: any;

// CORRECT
settings: Record<string, unknown>;
preferences: ClientPreferences; // Define interface
```

#### 3. Missing Offline Support in Mobile
```typescript
// WRONG - No offline handling
const data = await api.get('/machines');

// CORRECT - Check offline, use cache
const netInfo = await NetInfo.fetch();
if (!netInfo.isConnected) {
  return getCachedData();
}
```

#### 4. Forgetting Rate Limits on Public Endpoints
```typescript
// WRONG - No rate limit
@Get('public/locations')
@Public()
getLocations() {}

// CORRECT - Always rate limit public endpoints
@Get('public/locations')
@Public()
@Throttle({ default: { limit: 30, ttl: 60000 } })
getLocations() {}
```

---

## Specialized Claude Agents

| Agent | Purpose |
|-------|---------|
| `vendhub-dev-architect` | Architecture, feature planning, Sprint requirements |
| `vendhub-api-developer` | NestJS API, controllers, services, DTOs |
| `vendhub-auth-security` | Authentication, authorization, security |
| `vendhub-database-expert` | Database design, migrations, optimization |
| `vendhub-frontend-specialist` | React/Next.js frontend |
| `vendhub-telegram-bot` | Telegram bot integration |
| `vendhub-tester` | Test writing and coverage |

---

## Quick Reference

### Environment Setup

```bash
# Backend
cd backend && cp .env.example .env && npm install
docker-compose up -d postgres redis minio
npm run migration:run && npm run start:dev

# Staff Frontend
cd frontend && npm install && npm run dev

# Client Web (NEW)
cd client-web && npm install && npm run dev

# Mobile Staff
cd mobile && npm install && npm run start

# Mobile Client (NEW)
cd mobile-client && npm install && npm run start
```

### Common Commands

```bash
# Backend
npm run start:dev         # Start dev server
npm run test              # Run tests (MUST PASS)
npm run migration:generate -- -n Name
npm run migration:run

# Frontends
npm run dev               # Start dev server
npm run build             # Build for production

# Mobile
npm run start             # Start Expo
npm run android           # Run on Android
npm run ios               # Run on iOS
```

### Key Files

- **Architecture Rules**: `.claude/rules.md`
- **API Docs**: `http://localhost:3000/api/docs`
- **Environment**: `backend/.env.example`
- **Deployment**: `DEPLOYMENT.md`
- **Security**: `SECURITY.md`

---

## Pre-Commit Checklist

- [ ] All existing tests still pass
- [ ] New tests added for new functionality
- [ ] No modifications to existing DTOs/entities (add new ones)
- [ ] Public endpoints have rate limiting
- [ ] No `any` types used
- [ ] Migrations have up AND down methods
- [ ] Mobile has offline support
- [ ] Commit message follows conventions

---

**Last Updated**: 2025-12-19
**Version**: 2.1.0
**Maintained By**: VendHub Development Team

**Key Principles**:
1. Manual Operations Architecture
2. Photo Validation is Mandatory
3. 3-Level Inventory System
4. Tasks are the Central Mechanism
5. **Additive Development Only** - Never break existing functionality
6. **Dual Platform** - Staff (VHM24) + Client Platform
