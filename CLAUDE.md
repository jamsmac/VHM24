# CLAUDE.md - AI Assistant Guide for VendHub Manager

> **Last Updated**: 2025-12-19
> **Version**: 2.1.0
> **Target Audience**: AI Assistants (Claude, GPT, etc.)

This document provides comprehensive guidance for AI assistants working on the VendHub Manager codebase. It explains the architecture, conventions, workflows, and critical rules that must be followed.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Dual Platform Architecture](#dual-platform-architecture)
3. [Critical Architecture Principles](#critical-architecture-principles)
4. [Additive Development Rules](#additive-development-rules)
5. [Machine Identifiers](#machine-identifiers)
6. [Codebase Structure](#codebase-structure)
7. [Technology Stack](#technology-stack)
8. [Client Data Model](#client-data-model)
9. [Development Workflows](#development-workflows)
10. [Code Conventions](#code-conventions)
11. [Module Patterns](#module-patterns)
12. [Database Guidelines](#database-guidelines)
13. [Testing Requirements](#testing-requirements)
14. [Security Best Practices](#security-best-practices)
15. [Common Tasks Guide](#common-tasks-guide)
16. [Pitfalls to Avoid](#pitfalls-to-avoid)

---

## Project Overview

**VendHub Manager** is a complete vending machine management system (ERP/CRM/CMMS) built for manual operations architecture. It manages:

- **Machines**: Vending machine fleet management
- **Tasks**: Photo-validated operator workflows (refill, collection, maintenance)
- **Inventory**: 3-level inventory system (warehouse -> operator -> machine)
- **Finance**: Transactions, collections, expenses
- **Operations**: User management, incidents, complaints
- **Integrations**: Telegram bot, web push, sales imports
- **Mobile**: React Native operator app
- **Machine Access**: Per-machine role-based access control
- **Client Platform**: Customer-facing ordering and loyalty system

**Key Characteristic**: NO direct machine connectivity. All data flows through operator actions and manual data entry with photo validation.

---

## Dual Platform Architecture

VendHub Manager operates as a **dual-platform system**:

### Staff Platform (VHM24)
- Internal team management
- Operator task workflows
- Inventory management
- Financial operations
- Machine access control with roles

### Client Platform
- Customer-facing mobile app
- Public machine menus via QR codes
- Order placement and tracking
- Loyalty program with points
- Telegram-based authentication

### Platform Separation
```
┌─────────────────────────────────────────────────────────────┐
│                    VendHub Manager                          │
├─────────────────────────────┬───────────────────────────────┤
│       Staff Platform        │       Client Platform         │
│         (VHM24)             │        (Public)               │
├─────────────────────────────┼───────────────────────────────┤
│ - /api/* endpoints          │ - /api/client/* endpoints     │
│ - JWT auth (email/password) │ - Telegram auth (initData)    │
│ - RBAC with system roles    │ - Simple client authentication│
│ - Dashboard UI              │ - Public menu pages           │
│ - Mobile operator app       │ - Mobile client app           │
└─────────────────────────────┴───────────────────────────────┘
```

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

### CRITICAL: Never Break Existing Functionality

When implementing new features, follow these rules strictly:

#### 1. **Additive Only**
```typescript
// WRONG - Modifying existing enum
enum MachineStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive', // Changed from 'offline'
}

// CORRECT - Add new values, keep existing
enum MachineStatus {
  ACTIVE = 'active',
  OFFLINE = 'offline',      // Keep original
  MAINTENANCE = 'maintenance',
  DISABLED = 'disabled',    // New addition
}
```

#### 2. **Backward Compatible APIs**
```typescript
// WRONG - Changing response structure
return { machines: [...] }; // Was: return [...]

// CORRECT - Keep original, add new endpoints
// Original endpoint unchanged
@Get()
findAll() { return this.service.findAll(); }

// New endpoint for new structure
@Get('v2')
findAllV2() { return { machines: this.service.findAll() }; }
```

#### 3. **Modular Additions**
- New features go in new modules/files
- Existing modules only get minimal integration points
- Use feature flags for gradual rollout

#### 4. **Database Migrations**
```typescript
// WRONG - Dropping columns
await queryRunner.dropColumn('machines', 'old_field');

// CORRECT - Add new, mark old as deprecated
await queryRunner.addColumn('machines', new TableColumn({
  name: 'new_field',
  type: 'varchar',
  isNullable: true,
}));
// Document: old_field is deprecated, use new_field
```

---

## Machine Identifiers

### Primary Identifier: `machine_number`

The `machine_number` field is the **primary human-readable identifier** for machines:

```typescript
// Machine entity key fields
@Entity('machines')
class Machine {
  @PrimaryGeneratedColumn('uuid')
  id: string;                    // Internal UUID

  @Column({ unique: true })
  machine_number: string;        // PRIMARY IDENTIFIER: "M-001", "A-123"

  @Column({ unique: true, nullable: true })
  serial_number: string;         // Manufacturer serial

  @Column()
  name: string;                  // Display name
}
```

### Usage Guidelines

1. **QR Codes**: Encode `machine_number`, not UUID
2. **User-Facing**: Display `machine_number` in UI
3. **API Lookups**: Support both `id` and `machine_number`
4. **Reports**: Use `machine_number` for readability

```typescript
// Service pattern for machine resolution
async findByIdentifier(identifier: string): Promise<Machine> {
  // Try UUID first
  if (isUUID(identifier)) {
    return this.machineRepository.findOne({ where: { id: identifier } });
  }
  // Then machine_number
  return this.machineRepository.findOne({ where: { machine_number: identifier } });
}
```

---

## Codebase Structure

```
VHM24/
├── backend/                           # NestJS 10 Backend API
│   ├── src/
│   │   ├── modules/                   # Feature modules (48+ modules)
│   │   │   ├── auth/                  # JWT authentication + 2FA
│   │   │   ├── users/                 # User management + RBAC
│   │   │   ├── machines/              # Machine CRUD + QR codes
│   │   │   ├── machine-access/        # Per-machine access control
│   │   │   ├── tasks/                 # CORE: Task management
│   │   │   ├── inventory/             # 3-level inventory system
│   │   │   ├── transactions/          # Financial transactions
│   │   │   ├── incidents/             # Machine incidents
│   │   │   ├── complaints/            # Customer complaints
│   │   │   ├── nomenclature/          # Products catalog
│   │   │   ├── recipes/               # Product recipes + versioning
│   │   │   ├── files/                 # File/photo management
│   │   │   ├── notifications/         # Multi-channel notifications
│   │   │   ├── telegram/              # Telegram bot integration
│   │   │   ├── web-push/              # Browser push notifications
│   │   │   ├── sales-import/          # Excel/CSV sales import
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
│   │   │   ├── access-requests/       # Access request management
│   │   │   ├── alerts/                # System alerts
│   │   │   ├── audit-logs/            # Audit logging
│   │   │   ├── counterparty/          # Counterparty/contracts
│   │   │   ├── data-parser/           # Data parsing utilities
│   │   │   ├── email/                 # Email service
│   │   │   ├── monitoring/            # System monitoring
│   │   │   ├── opening-balances/      # Opening balances
│   │   │   ├── operator-ratings/      # Operator performance
│   │   │   ├── purchase-history/      # Purchase tracking
│   │   │   ├── reconciliation/        # Financial reconciliation
│   │   │   ├── requests/              # Request management
│   │   │   ├── bull-board/            # Queue dashboard
│   │   │   ├── websocket/             # Real-time WebSocket
│   │   │   └── client/                # Client platform module
│   │   │       ├── entities/          # Client entities
│   │   │       ├── dto/               # Client DTOs
│   │   │       ├── controllers/       # Client controllers
│   │   │       ├── services/          # Client services
│   │   │       ├── guards/            # Client auth guard
│   │   │       └── client.module.ts
│   │   ├── common/                    # Shared utilities
│   │   │   ├── entities/              # Base entity classes
│   │   │   ├── filters/               # Exception filters
│   │   │   ├── guards/                # Auth guards
│   │   │   ├── decorators/            # Custom decorators
│   │   │   ├── pipes/                 # Validation pipes
│   │   │   └── modules/               # Common modules (rate-limit)
│   │   ├── config/                    # Configuration
│   │   ├── database/                  # Database management
│   │   │   ├── migrations/            # TypeORM migrations
│   │   │   ├── seeds/                 # Database seeders
│   │   │   └── scripts/               # DB utility scripts
│   │   ├── scheduled-tasks/           # Cron jobs
│   │   ├── health/                    # Health checks
│   │   ├── main.ts                    # Application entry point
│   │   └── app.module.ts              # Root module
│   ├── test/                          # E2E tests
│   ├── scripts/                       # Backend scripts
│   ├── docs/                          # Backend documentation
│   ├── supabase/                      # Supabase config (optional)
│   └── package.json
│
├── frontend/                          # Next.js 16 Frontend (App Router)
│   ├── src/
│   │   ├── app/                       # Next.js App Router
│   │   │   ├── (auth)/                # Auth pages
│   │   │   ├── (public)/              # Public client pages
│   │   │   │   ├── menu/[machineNumber]/  # Public machine menu
│   │   │   │   └── order/[orderId]/   # Order tracking
│   │   │   └── dashboard/             # Admin dashboard
│   │   │       └── machines/
│   │   │           └── [id]/
│   │   │               └── access/    # Machine access management
│   │   ├── components/                # React components (25+ dirs)
│   │   │   ├── ui/                    # UI primitives (shadcn)
│   │   │   ├── layout/                # Layout components
│   │   │   ├── dashboard/             # Dashboard widgets
│   │   │   ├── machines/              # Machine components
│   │   │   ├── machine-access/        # Machine access components
│   │   │   ├── tasks/                 # Task components
│   │   │   ├── incidents/             # Incident components
│   │   │   ├── equipment/             # Equipment components
│   │   │   ├── inventory/             # Inventory components
│   │   │   ├── charts/                # Chart components
│   │   │   ├── map/                   # Map components (Leaflet)
│   │   │   ├── monitoring/            # Monitoring widgets
│   │   │   ├── realtime/              # Real-time components
│   │   │   ├── notifications/         # Notification UI
│   │   │   ├── security/              # Security components
│   │   │   ├── audit/                 # Audit log viewer
│   │   │   ├── import/                # Data import UI
│   │   │   ├── search/                # Search components
│   │   │   └── help/                  # Help components
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── lib/                       # Utilities
│   │   ├── providers/                 # Context providers
│   │   ├── types/                     # TypeScript types
│   │   ├── i18n/                      # Internationalization
│   │   ├── stories/                   # Storybook stories
│   │   └── test/                      # Test utilities
│   ├── public/                        # Static assets
│   ├── .storybook/                    # Storybook config
│   └── package.json
│
├── mobile/                            # React Native (Expo) Mobile App
│   ├── src/
│   │   ├── components/                # Mobile components
│   │   ├── screens/                   # Screen components
│   │   │   ├── Staff/                 # Staff screens
│   │   │   └── Client/                # Client screens
│   │   ├── navigation/                # Navigation config
│   │   │   ├── AppNavigator.tsx       # Root navigator
│   │   │   ├── MainNavigator.tsx      # Staff navigator
│   │   │   └── ClientNavigator.tsx    # Client navigator
│   │   ├── hooks/                     # Mobile hooks
│   │   ├── services/                  # API services
│   │   │   ├── api.ts                 # Staff API
│   │   │   └── clientApi.ts           # Client API
│   │   ├── store/                     # Zustand store
│   │   │   ├── auth.store.ts          # Staff auth
│   │   │   └── client.store.ts        # Client state
│   │   └── types/                     # TypeScript types
│   ├── __tests__/                     # Jest tests
│   ├── assets/                        # Mobile assets
│   └── package.json
│
├── docs/                              # Documentation
├── .claude/                           # Claude Code Rules & Templates
├── scripts/                           # Root-level scripts
├── monitoring/                        # Monitoring stack
├── nginx/                             # Nginx configuration
├── .github/workflows/                 # CI/CD workflows
├── docker-compose.yml                 # Local development
└── Various root files (README, DEPLOYMENT, etc.)
```

---

## Technology Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 10.x | REST API + WebSocket |
| TypeORM | 0.3.x | Database ORM |
| PostgreSQL | 14+ | Primary database |
| Redis | 7.x | Cache, sessions, queues |
| Bull/BullMQ | 4.x | Job queue |
| Passport + JWT | - | Authentication |
| class-validator | 0.14.x | Input validation |
| Swagger | 8.x | API documentation |
| Telegraf | 4.x | Telegram bot |
| Socket.io | 4.x | WebSocket |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | React framework (App Router) |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| TailwindCSS | 3.x | Styling |
| Radix UI | latest | UI primitives |
| TanStack Query | 5.x | Data fetching |
| TanStack Table | 8.x | Data tables |
| Zustand | 5.x | State management |
| React Hook Form | 7.x | Form handling |
| Zod | 4.x | Schema validation |

### Mobile (React Native)
| Technology | Version | Purpose |
|------------|---------|---------|
| Expo | 54.x | React Native framework |
| React Native | 0.81.x | Mobile UI |
| React Navigation | 7.x | Navigation |
| TanStack Query | 5.x | Data fetching |
| Zustand | 5.x | State management |
| Expo Camera | 17.x | Photo capture |
| Expo Location | 19.x | Geolocation |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker + Docker Compose | Containerization |
| Railway.app | Cloud deployment |
| GitHub Actions | CI/CD |
| Prometheus + Grafana | Monitoring |

---

## Client Data Model

### Entity Overview

The client platform uses these entities:

```
┌─────────────────┐     ┌─────────────────┐
│   ClientUser    │────<│  ClientOrder    │
│                 │     │                 │
│ telegram_id     │     │ machine_id      │
│ points_balance  │     │ status          │
│ level           │     │ total_amount    │
└─────────────────┘     └────────┬────────┘
        │                        │
        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐
│ ClientFavorite  │     │ClientOrderItem  │
│                 │     │                 │
│ machine_id      │     │ nomenclature_id │
│ nomenclature_id │     │ quantity        │
└─────────────────┘     │ price           │
                        └─────────────────┘
```

### Key Entities

#### ClientUser
```typescript
@Entity('client_users')
class ClientUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  telegram_id: string;           // Telegram authentication

  @Column({ default: 0 })
  points_balance: number;        // Loyalty points

  @Column({ default: 'bronze' })
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
}
```

#### ClientOrder
```typescript
@Entity('client_orders')
class ClientOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  client_id: string;

  @Column()
  machine_id: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']
  })
  status: ClientOrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column({ nullable: true })
  pickup_code: string;           // 4-digit code for pickup
}
```

---

## Development Workflows

### 1. Creating a New Feature

```bash
# 1. Create feature branch
git checkout -b feature/task-photo-validation

# 2. Check if feature is in current phase (see .claude/phase-1-mvp-checklist.md)

# 3. Implement following module pattern

# 4. Write tests IMMEDIATELY
npm run test

# 5. Run all checks before commit
npm run lint
npm run type-check
npm run test
npm run build

# 6. Commit with conventional commits format
git commit -m "feat(tasks): add photo validation before completion

Implemented mandatory photo check for refill tasks.
Tasks cannot be completed without before/after photos.

Closes #123"

# 7. Push and create PR
git push origin feature/task-photo-validation
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

### 3. Branch Naming

```bash
feature/task-photo-validation      # New features
fix/inventory-update-bug           # Bug fixes
docs/add-api-documentation         # Documentation
refactor/simplify-auth-logic       # Refactoring
test/add-task-service-tests        # Tests
claude/session-id                  # Claude Code branches
```

---

## Code Conventions

### Backend (TypeScript/NestJS)

#### File Naming
```
kebab-case for all files:
  - user.service.ts
  - task.controller.ts
  - machine.entity.ts
  - create-task.dto.ts
```

#### Class/Interface Naming
```typescript
// Classes: PascalCase
class UserService {}
class TaskController {}
class Machine {}

// Interfaces: PascalCase (no I prefix)
interface CreateTaskDto {}
interface TaskResponse {}

// Types: PascalCase
type TaskStatus = 'created' | 'in_progress' | 'completed';

// Enums: PascalCase
enum MachineStatus {
  ACTIVE = 'active',
  OFFLINE = 'offline',
}
```

#### Path Aliases (tsconfig.json)
```typescript
import { BaseEntity } from '@/common/entities/base.entity';
import { TaskService } from '@modules/tasks/tasks.service';
import { DatabaseConfig } from '@config/database.config';
```

### Frontend (TypeScript/React/Next.js)

#### File Naming
```
PascalCase for components:
  - TaskList.tsx
  - MachineCard.tsx
  - DashboardLayout.tsx

camelCase for utilities/hooks:
  - useAuth.ts
  - useTasks.ts
  - formatDate.ts
```

#### Component Structure
```typescript
'use client'; // If using client-side features

import { useState } from 'react';
import { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
}

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await onComplete(task.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="task-card">
      {/* JSX */}
    </div>
  );
}
```

---

## Module Patterns

### Standard NestJS Module Structure

```
users/
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── user-response.dto.ts
├── entities/
│   └── user.entity.ts
├── users.controller.ts
├── users.service.ts
├── users.module.ts
└── users.service.spec.ts
```

### Machine Access Module Structure

```
machine-access/
├── dto/
│   ├── create-machine-access.dto.ts
│   ├── update-machine-access.dto.ts
│   ├── bulk-assign.dto.ts
│   └── apply-template.dto.ts
├── entities/
│   ├── machine-access.entity.ts
│   ├── access-template.entity.ts
│   └── access-template-row.entity.ts
├── machine-access.controller.ts
├── machine-access.service.ts
├── machine-access.module.ts
└── machine-access.service.spec.ts
```

### Machine Access Entity Pattern

```typescript
export enum MachineAccessRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  TECHNICIAN = 'technician',
  VIEWER = 'viewer',
}

@Entity('machine_access')
@Unique(['machine_id', 'user_id'])
@Index(['machine_id'])
@Index(['user_id'])
export class MachineAccess extends BaseEntity {
  @Column({ type: 'uuid' })
  machine_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: MachineAccessRole,
    default: MachineAccessRole.VIEWER,
  })
  role: MachineAccessRole;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

### Entity Pattern (TypeORM)

```typescript
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

export enum MachineStatus {
  ACTIVE = 'active',
  LOW_STOCK = 'low_stock',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline',
  DISABLED = 'disabled',
}

@Entity('machines')
@Index(['location_id'])
@Index(['machine_number'], { unique: true })
export class Machine extends BaseEntity {
  // BaseEntity provides: id, created_at, updated_at, deleted_at

  @Column({ type: 'varchar', length: 50, unique: true })
  machine_number: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({
    type: 'enum',
    enum: MachineStatus,
    default: MachineStatus.ACTIVE,
  })
  status: MachineStatus;

  @Column({ type: 'uuid' })
  location_id: string;

  @ManyToOne(() => Location, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;
}
```

### DTO Pattern (Validation)

```typescript
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMachineDto {
  @ApiProperty({ example: 'M-001' })
  @IsString()
  @MinLength(1, { message: 'Machine number is required' })
  machine_number: string;

  @ApiProperty({ example: 'Coffee Machine in Lobby' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @ApiPropertyOptional({ enum: MachineStatus })
  @IsOptional()
  @IsEnum(MachineStatus)
  status?: MachineStatus;

  @ApiProperty({ description: 'Location ID' })
  @IsUUID()
  location_id: string;
}
```

### Service Pattern

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class MachinesService {
  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
  ) {}

  async create(createMachineDto: CreateMachineDto): Promise<Machine> {
    const existing = await this.machineRepository.findOne({
      where: { machine_number: createMachineDto.machine_number },
    });

    if (existing) {
      throw new BadRequestException('Machine number already exists');
    }

    const machine = this.machineRepository.create(createMachineDto);
    return await this.machineRepository.save(machine);
  }

  async findOne(id: string): Promise<Machine> {
    const machine = await this.machineRepository.findOne({
      where: { id },
      relations: ['location'],
    });

    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }

    return machine;
  }
}
```

---

## Database Guidelines

### Migrations

```bash
# Generate migration after entity changes
npm run migration:generate -- -n AddMachineQrCode

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Entity Conventions

1. **Always extend BaseEntity** for id, timestamps, soft deletes
2. **Use snake_case for column names** (PostgreSQL convention)
3. **Add indexes** for foreign keys and frequently queried fields
4. **Use enums** for status/type fields
5. **Use jsonb** for flexible metadata

---

## Testing Requirements

### Test Coverage Requirements
- **Unit Tests**: Minimum 70% coverage (enforced)
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user flows

### Running Tests

```bash
# Backend
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:cov          # With coverage
npm run test:e2e          # E2E tests

# Frontend
npm run test              # Vitest
npm run test:ui           # Vitest UI
npm run test:coverage     # With coverage
npm run test:watch        # Watch mode

# Mobile
npm run test              # Jest
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
```

---

## Security Best Practices

### 1. Authentication & Authorization

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
@Post()
createMachine(@Body() dto: CreateMachineDto) {
  return this.machinesService.create(dto);
}
```

### 2. Input Validation

Always validate ALL inputs using DTOs with class-validator.

### 3. SQL Injection Prevention

```typescript
// SAFE - TypeORM prevents SQL injection
await this.repository.findOne({ where: { id: userId } });

// UNSAFE - Never use raw queries with user input
await this.repository.query(`SELECT * FROM users WHERE id = ${userId}`);
```

### 4. Rate Limiting

Multiple rate limit tiers are configured:
- `default`: 100 requests/minute
- `short`: 3 requests/second
- `medium`: 20 requests/10 seconds
- `long`: 100 requests/minute

### 5. Client Authentication

Client platform uses Telegram initData for authentication:

```typescript
@Injectable()
export class ClientAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const initData = request.headers['x-telegram-init-data'];

    if (!initData) {
      throw new UnauthorizedException('Telegram init data required');
    }

    // Validate with Telegram Bot API
    const validated = this.validateTelegramInitData(initData);
    request.clientUser = validated.user;

    return true;
  }
}
```

---

## Common Tasks Guide

### Task 1: Add New CRUD Module

1. Create module structure in `backend/src/modules/`
2. Use templates from `.claude/templates/backend/`
3. Register module in `app.module.ts`
4. Create migration if needed
5. Add tests

### Task 2: Add API Endpoint

1. Add method to service
2. Add endpoint to controller
3. Add tests

### Task 3: Update Database Schema

1. Modify entity
2. Generate migration: `npm run migration:generate -- -n MigrationName`
3. Review migration
4. Run migration: `npm run migration:run`

### Task 4: Add Scheduled Job

```typescript
// src/scheduled-tasks/scheduled-tasks.service.ts
@Cron('0 */6 * * *') // Every 6 hours
async checkLowStock() {
  // Implementation
}
```

### Task 5: Add Machine Access Role

1. Add new value to `MachineAccessRole` enum
2. Create migration to update enum type
3. Update frontend types
4. Add role label and color to helpers

### Task 6: Add Client Feature

1. Create/modify entity in `backend/src/modules/client/entities/`
2. Create DTO in `backend/src/modules/client/dto/`
3. Add service method in appropriate service
4. Add controller endpoint with `@UseGuards(ClientAuthGuard)`
5. Update frontend types
6. Add mobile screen if needed

---

## Pitfalls to Avoid

### CRITICAL MISTAKES

1. **Creating Machine Connectivity Features** - This project has NO machine connectivity
2. **Skipping Photo Validation** - Photos are MANDATORY for task completion
3. **Forgetting Inventory Updates** - Always update inventory after tasks
4. **Breaking Existing Features** - All changes must be additive
5. **Over-Engineering** - Keep it simple
6. **Ignoring Validation** - Always validate with DTOs
7. **Using `any` type** - Use proper interfaces
8. **Raw SQL queries** - Use TypeORM
9. **Missing tests** - Write tests immediately
10. **Hardcoded secrets** - Use environment variables
11. **Mixing Staff and Client Auth** - Use appropriate guards for each platform
12. **Forgetting Machine Number** - Use `machine_number` as primary identifier

---

## Quick Reference

### Environment Setup

```bash
# Backend setup
cd backend
cp .env.example .env
npm install
docker-compose up -d postgres redis minio
npm run migration:run
npm run start:dev

# Frontend setup
cd frontend
cp .env.example .env
npm install
npm run dev

# Mobile setup
cd mobile
npm install
npm run start
```

### Common Commands

```bash
# Backend
npm run start:dev         # Start dev server
npm run build             # Build for production
npm run test              # Run tests
npm run test:cov          # Run tests with coverage
npm run lint              # Lint code
npm run format            # Format code
npm run migration:generate -- -n MigrationName
npm run migration:run
npm run migration:revert
npm run create-superadmin # Create superadmin user

# Frontend
npm run dev               # Start dev server
npm run build             # Build for production
npm run start             # Start production server
npm run lint              # Lint code
npm run storybook         # Start Storybook

# Mobile
npm run start             # Start Expo
npm run android           # Run on Android
npm run ios               # Run on iOS
npm run test              # Run tests
```

### Key Files to Check

- **Architecture**: `.claude/rules.md` - READ FIRST!
- **API Docs**: `http://localhost:3000/api/docs` (Swagger)
- **Database Schema**: Check migration files
- **Environment**: `backend/.env.example`
- **Deployment**: `DEPLOYMENT.md`, `QUICK_START_RAILWAY.md`
- **Operations**: `OPERATIONS_RUNBOOK.md`

---

## Pre-Commit Checklist

Before committing code, ensure:

- [ ] Code follows naming conventions
- [ ] All public methods have JSDoc comments
- [ ] DTOs have proper validation decorators
- [ ] Tests are written and passing
- [ ] `npm run lint` passes with no errors
- [ ] `npm run type-check` passes (TypeScript)
- [ ] `npm run test` passes
- [ ] `npm run build` succeeds
- [ ] Commit message follows conventional commits format
- [ ] No hardcoded secrets or credentials
- [ ] Database migrations created (if schema changed)
- [ ] API documentation updated (Swagger)
- [ ] No breaking changes to existing features

---

## For AI Assistants: Best Practices

### When Creating New Code

1. **Check `.claude/rules.md` first** - Contains critical architecture rules
2. **Use templates** from `.claude/templates/backend/`
3. **Follow naming conventions** strictly
4. **Add JSDoc comments** to all public methods
5. **Write tests immediately** - Don't postpone
6. **Validate all inputs** using DTOs
7. **Never skip photo validation** for tasks
8. **Update inventory** when completing tasks
9. **Check current phase** in `.claude/phase-1-mvp-checklist.md`
10. **Keep it simple** - Avoid unnecessary abstractions
11. **Be additive** - Never break existing functionality

### When Modifying Existing Code

1. **Read the module first** to understand current patterns
2. **Maintain consistency** with existing code style
3. **Update tests** when changing logic
4. **Update DTOs** when changing entity fields
5. **Create migrations** for database changes
6. **Update Swagger docs** with `@ApiProperty` decorators
7. **Check for breaking changes** in API responses
8. **Keep backward compatibility** - Add, don't replace

### Red Flags to Watch For

- Creating machine connectivity/integration features
- Skipping photo validation in task completion
- Not updating inventory after tasks
- Using `any` type instead of proper interfaces
- Raw SQL queries instead of TypeORM
- Missing validation on user inputs
- No tests for new features
- Hardcoded secrets/credentials
- Breaking changes to existing APIs
- Modifying enums in incompatible ways
- Mixing staff and client authentication

---

## Specialized Agents

VendHub Manager has 10 specialized Claude Code agents for different development domains. Use these agents for focused, expert-level assistance.

### Available Agents

| Agent | File | Use For |
|-------|------|---------|
| **vendhub-dev-architect** | `.claude/agents/vendhub-dev-architect.md` | Architecture, feature planning, Sprint requirements |
| **vendhub-auth-security** | `.claude/agents/vendhub-auth-security.md` | JWT, RBAC, 2FA, security audits |
| **vendhub-database-expert** | `.claude/agents/vendhub-database-expert.md` | Migrations, queries, optimization |
| **vendhub-frontend-specialist** | `.claude/agents/vendhub-frontend-specialist.md` | React, Next.js, components |
| **vendhub-telegram-bot** | `.claude/agents/vendhub-telegram-bot.md` | Telegram commands, keyboards |
| **vendhub-tester** | `.claude/agents/vendhub-tester.md` | Unit, integration, E2E tests |
| **vendhub-api-developer** | `.claude/agents/vendhub-api-developer.md` | REST endpoints, DTOs, Swagger |
| **vendhub-devops** | `.claude/agents/vendhub-devops.md` | Docker, Railway, CI/CD, monitoring |
| **vendhub-mobile** | `.claude/agents/vendhub-mobile.md` | Expo, React Native, offline mode |
| **vendhub-qa-lead** | `.claude/agents/vendhub-qa-lead.md` | Releases, testing, quality metrics |

### When to Use Agents

```typescript
// Example: Implementing new authentication feature
// Use: vendhub-auth-security

// Example: Creating database migration
// Use: vendhub-database-expert

// Example: Deploying to Railway
// Use: vendhub-devops

// Example: Adding mobile offline support
// Use: vendhub-mobile

// Example: Planning a release
// Use: vendhub-qa-lead
```

### Agent Selection Guide

1. **New Feature** → `vendhub-dev-architect`
2. **Security/Auth** → `vendhub-auth-security`
3. **Database Changes** → `vendhub-database-expert`
4. **Frontend UI** → `vendhub-frontend-specialist`
5. **Mobile App** → `vendhub-mobile`
6. **Telegram Bot** → `vendhub-telegram-bot`
7. **API Endpoints** → `vendhub-api-developer`
8. **Testing** → `vendhub-tester`
9. **Deployment** → `vendhub-devops`
10. **Release/QA** → `vendhub-qa-lead`

---

## Project Status & Roadmap

### Current Status (2025-12-21)

| Component | Completion | Status |
|-----------|------------|--------|
| Backend API | 95% | Production Ready |
| Frontend Web | 62% | Active Development |
| Mobile App | 25% | Foundation Complete |
| Telegram Bot | 80% | Needs Commission Commands |
| DevOps/Infra | 90% | Railway Deployed |
| Documentation | 85% | Actively Maintained |

### Key Milestones

- **MVP Complete**: Backend + Frontend core functionality
- **Production Deploy**: Railway deployment active
- **Mobile Foundation**: Auth + API integration ready
- **Commission System**: Phase 1-3 complete with BullMQ

### Next Steps

1. **Week 1-2**: Stabilization and bug fixes
2. **Week 3-6**: Mobile app implementation
3. **Week 7**: Production launch preparation
4. **Week 8+**: Monitoring and support

See `.claude/ACTION_PLAN_100.md` for detailed roadmap.

---

**Last Updated**: 2025-12-21
**Version**: 2.2.0
**Maintained By**: VendHub Development Team
**For**: AI Assistants (Claude Code, GitHub Copilot, etc.)

**Key Principles**:
- Manual Operations
- Photo Validation
- 3-Level Inventory
- Additive Development
- Dual Platform (Staff + Client)
