# CLAUDE.md - AI Assistant Guide for VendHub Manager

> **Last Updated**: 2025-12-19
> **Version**: 2.0.0
> **Target Audience**: AI Assistants (Claude, GPT, etc.)

This document provides comprehensive guidance for AI assistants working on the VendHub Manager codebase. It explains the architecture, conventions, workflows, and critical rules that must be followed.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Critical Architecture Principles](#critical-architecture-principles)
3. [Codebase Structure](#codebase-structure)
4. [Technology Stack](#technology-stack)
5. [Development Workflows](#development-workflows)
6. [Code Conventions](#code-conventions)
7. [Module Patterns](#module-patterns)
8. [Database Guidelines](#database-guidelines)
9. [Testing Requirements](#testing-requirements)
10. [Security Best Practices](#security-best-practices)
11. [Common Tasks Guide](#common-tasks-guide)
12. [Pitfalls to Avoid](#pitfalls-to-avoid)

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

## Codebase Structure

```
VHM24/
├── backend/                           # NestJS 10 Backend API
│   ├── src/
│   │   ├── modules/                   # Feature modules (45 modules)
│   │   │   ├── auth/                  # JWT authentication + 2FA
│   │   │   ├── users/                 # User management + RBAC
│   │   │   ├── machines/              # Machine CRUD + QR codes
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
│   │   │   └── websocket/             # Real-time WebSocket
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
│   │   │   └── (auth)/                # Auth pages
│   │   ├── components/                # React components (20+ dirs)
│   │   │   ├── ui/                    # UI primitives (shadcn)
│   │   │   ├── layout/                # Layout components
│   │   │   ├── dashboard/             # Dashboard widgets
│   │   │   ├── machines/              # Machine components
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
│   │   ├── navigation/                # Navigation config
│   │   ├── hooks/                     # Mobile hooks
│   │   ├── services/                  # API services
│   │   ├── store/                     # Zustand store
│   │   └── types/                     # TypeScript types
│   ├── __tests__/                     # Jest tests
│   ├── assets/                        # Mobile assets
│   └── package.json
│
├── docs/                              # Documentation
│   ├── architecture/                  # Architecture docs
│   ├── dictionaries/                  # System dictionaries
│   ├── devops/                        # DevOps guides
│   ├── vendhub_import/                # Import guides
│   └── archive/                       # Archived docs
│
├── .claude/                           # Claude Code Rules & Templates
│   ├── README.md                      # Developer onboarding
│   ├── rules.md                       # CRITICAL: Coding rules
│   ├── testing-guide.md               # Testing guidelines
│   ├── deployment-guide.md            # Deployment instructions
│   ├── phase-1-mvp-checklist.md       # MVP checklist
│   ├── comprehensive-analysis-prompt.md
│   ├── project-review-prompt.md
│   ├── agents/                        # Agent configurations
│   ├── prompts/                       # Prompt templates
│   ├── scripts/                       # Helper scripts
│   └── templates/                     # Code templates
│       └── backend/                   # Backend templates
│
├── scripts/                           # Root-level scripts
│   ├── backup/                        # Backup scripts
│   ├── deployment/                    # Deployment scripts
│   ├── quick-analysis.sh              # Quick analysis
│   ├── seed.mjs                       # Seed data
│   └── setup-railway.sh               # Railway setup
│
├── monitoring/                        # Monitoring stack
│   ├── prometheus/                    # Prometheus config
│   ├── grafana/                       # Grafana dashboards
│   └── alertmanager/                  # Alert configs
│
├── nginx/                             # Nginx configuration
│   └── conf.d/                        # Site configs
│
├── .github/
│   └── workflows/
│       ├── ci.yml                     # CI pipeline
│       ├── deploy-production.yml      # Production deploy
│       └── deploy-staging.yml         # Staging deploy
│
├── .railway/                          # Railway.app config
├── docker-compose.yml                 # Local development
├── docker-compose.prod.yml            # Production setup
├── docker-compose.production.yml      # Alternative prod config
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
| OpenAI | 6.x | AI-powered imports |
| PDFKit | 0.17.x | PDF generation |
| ExcelJS | 4.x | Excel export/import |
| Sharp | 0.34.x | Image processing |
| Prometheus | 15.x | Metrics |
| Winston | 3.x | Logging |
| Sentry | 10.x | Error tracking |

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
| Recharts | 3.x | Charts |
| Leaflet | 1.9.x | Maps |
| Socket.io Client | 4.x | WebSocket |
| next-intl | 4.x | Internationalization |
| next-themes | 0.4.x | Theme switching |
| Vitest | 4.x | Testing |
| Storybook | 10.x | Component development |
| Playwright | 1.57.x | E2E testing |

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
| Expo Notifications | 0.32.x | Push notifications |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker + Docker Compose | Containerization |
| Railway.app | Cloud deployment |
| Nginx | Reverse proxy |
| MinIO (dev) / Cloudflare R2 (prod) | Object storage |
| GitHub Actions | CI/CD |
| Prometheus + Grafana | Monitoring |
| AlertManager | Alerting |

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
  IsNumber,
  IsUUID,
  MinLength,
  Min,
  Max,
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

---

## Pitfalls to Avoid

### CRITICAL MISTAKES

1. **Creating Machine Connectivity Features** - This project has NO machine connectivity
2. **Skipping Photo Validation** - Photos are MANDATORY for task completion
3. **Forgetting Inventory Updates** - Always update inventory after tasks
4. **Over-Engineering** - Keep it simple
5. **Ignoring Validation** - Always validate with DTOs
6. **Using `any` type** - Use proper interfaces
7. **Raw SQL queries** - Use TypeORM
8. **Missing tests** - Write tests immediately
9. **Hardcoded secrets** - Use environment variables

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

## Additional Documentation

### Project Documentation
- **README.md** - Main project README
- **DEPLOYMENT.md** - Deployment guide
- **OPERATIONS_RUNBOOK.md** - Operations guide
- **SECURITY.md** - Security documentation
- **DEVELOPMENT_STATUS.md** - Current development status
- **CHANGELOG.md** - Change history

### Module-Specific Guides
- **mobile/README.md** - Mobile app guide
- **mobile/IMPLEMENTATION_GUIDE.md** - Mobile implementation details
- **mobile/BUILD_GUIDE.md** - Mobile build instructions

### Claude Code Documentation
- **.claude/README.md** - Developer onboarding
- **.claude/rules.md** - Coding rules (CRITICAL)
- **.claude/testing-guide.md** - Testing guide
- **.claude/deployment-guide.md** - Deployment guide
- **.claude/phase-1-mvp-checklist.md** - MVP checklist

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

### When Modifying Existing Code

1. **Read the module first** to understand current patterns
2. **Maintain consistency** with existing code style
3. **Update tests** when changing logic
4. **Update DTOs** when changing entity fields
5. **Create migrations** for database changes
6. **Update Swagger docs** with `@ApiProperty` decorators
7. **Check for breaking changes** in API responses

### Red Flags to Watch For

- Creating machine connectivity/integration features
- Skipping photo validation in task completion
- Not updating inventory after tasks
- Using `any` type instead of proper interfaces
- Raw SQL queries instead of TypeORM
- Missing validation on user inputs
- No tests for new features
- Hardcoded secrets/credentials

---

**Last Updated**: 2025-12-19
**Version**: 2.0.0
**Maintained By**: VendHub Development Team
**For**: AI Assistants (Claude Code, GitHub Copilot, etc.)

**Key Principle**: Manual Operations, Photo Validation, 3-Level Inventory
