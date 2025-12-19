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
13. [Specialized Claude Agents](#specialized-claude-agents)

---

## Project Overview

**VendHub Manager** is a complete vending machine management system (ERP/CRM/CMMS) built for manual operations architecture. It manages:

- **Machines**: Vending machine fleet management
- **Tasks**: Photo-validated operator workflows (refill, collection, maintenance)
- **Inventory**: 3-level inventory system (warehouse -> operator -> machine)
- **Finance**: Transactions, collections, expenses
- **Operations**: User management, incidents, complaints
- **Integrations**: Telegram bot, web push, sales imports
- **Mobile**: React Native/Expo operator mobile app

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
- Refill (pополнение) - Load products into machine
- Collection (инкассация) - Collect cash from machine
- Maintenance (обслуживание) - Service machine
- Inspection (проверка) - Check machine condition
- Repair (ремонт) - Fix machine issues
- Cleaning (мойка) - Clean machine/components

---

## Codebase Structure

```
VendHub/
├── backend/                           # NestJS 10 Backend API
│   ├── src/
│   │   ├── modules/                   # Feature modules (domain-driven)
│   │   │   ├── auth/                  # JWT authentication
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
│   │   │   ├── guards/                # Auth guards
│   │   │   ├── decorators/            # Custom decorators
│   │   │   └── pipes/                 # Validation pipes
│   │   ├── config/                    # Configuration
│   │   │   ├── typeorm.config.ts      # Database config
│   │   │   └── env.validation.ts      # Environment validation
│   │   ├── database/                  # Database management
│   │   │   ├── migrations/            # TypeORM migrations
│   │   │   └── seeds/                 # Database seeders
│   │   ├── scheduled-tasks/           # Cron jobs
│   │   ├── health/                    # Health checks
│   │   ├── main.ts                    # Application entry point
│   │   └── app.module.ts              # Root module
│   ├── test/                          # E2E tests
│   ├── .env.example                   # Environment variables template
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                          # Next.js 16 Frontend (App Router)
│   ├── src/
│   │   ├── app/                       # Next.js App Router
│   │   │   ├── (auth)/               # Auth pages (login, register)
│   │   │   └── (dashboard)/          # Dashboard pages
│   │   ├── components/                # React components
│   │   │   ├── ui/                   # UI primitives (shadcn/ui)
│   │   │   ├── layout/               # Layout components
│   │   │   ├── dashboard/            # Dashboard widgets
│   │   │   ├── machines/             # Machine components
│   │   │   ├── tasks/                # Task components
│   │   │   ├── incidents/            # Incident components
│   │   │   ├── equipment/            # Equipment components
│   │   │   ├── inventory/            # Inventory components
│   │   │   ├── charts/               # Chart components
│   │   │   ├── map/                  # Map components
│   │   │   ├── monitoring/           # Monitoring components
│   │   │   ├── notifications/        # Notification components
│   │   │   ├── realtime/             # Real-time components
│   │   │   ├── security/             # Security components
│   │   │   ├── audit/                # Audit components
│   │   │   ├── import/               # Import components
│   │   │   ├── search/               # Search components
│   │   │   └── help/                 # Help components
│   │   ├── lib/                       # Utilities
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── providers/                 # Context providers
│   │   ├── i18n/                      # Internationalization
│   │   ├── stories/                   # Storybook stories
│   │   └── types/                     # TypeScript types
│   ├── public/                        # Static assets
│   ├── package.json
│   └── next.config.js
│
├── mobile/                            # React Native/Expo Mobile App
│   ├── src/
│   │   ├── screens/                   # App screens
│   │   ├── components/                # Reusable components
│   │   ├── navigation/                # Navigation setup
│   │   ├── services/                  # API services
│   │   ├── store/                     # Zustand state management
│   │   ├── hooks/                     # Custom hooks
│   │   └── types/                     # TypeScript types
│   ├── __tests__/                     # Jest tests
│   ├── App.tsx                        # Root component
│   ├── app.json                       # Expo config
│   ├── eas.json                       # EAS Build config
│   └── package.json
│
├── docs/                              # Documentation
│   ├── architecture/                  # Architecture docs
│   └── dictionaries/                  # System dictionaries
│
├── .claude/                           # Claude Code Rules & Templates
│   ├── README.md                      # Developer onboarding guide
│   ├── rules.md                       # CRITICAL: Coding rules
│   ├── testing-guide.md               # Testing guidelines
│   ├── deployment-guide.md            # Deployment instructions
│   ├── phase-1-mvp-checklist.md       # MVP development checklist
│   ├── agents/                        # Specialized Claude agents
│   │   ├── vendhub-dev-architect.md
│   │   ├── vendhub-api-developer.md
│   │   ├── vendhub-auth-security.md
│   │   ├── vendhub-database-expert.md
│   │   ├── vendhub-frontend-specialist.md
│   │   ├── vendhub-telegram-bot.md
│   │   └── vendhub-tester.md
│   ├── prompts/                       # AI prompts
│   ├── scripts/                       # Utility scripts
│   └── templates/                     # Code templates
│       └── backend/
│           ├── service-template.ts
│           └── controller-template.ts
│
├── monitoring/                        # Monitoring configuration
│   ├── prometheus/                    # Prometheus config
│   └── grafana/                       # Grafana dashboards
│
├── scripts/                           # Deployment/utility scripts
│
├── .github/
│   └── workflows/
│       ├── ci.yml                     # CI pipeline
│       ├── deploy-staging.yml         # Staging deployment
│       └── deploy-production.yml      # Production deployment
│
├── docker-compose.yml                 # Local development setup
├── docker-compose.prod.yml            # Production docker setup
├── README.md                          # Project README
├── CLAUDE.md                          # This file (AI assistant guide)
├── DEPLOYMENT.md                      # Deployment guide
├── SECURITY.md                        # Security documentation
├── OPERATIONS_RUNBOOK.md              # Operations runbook
└── CHANGELOG.md                       # Changelog
```

---

## Technology Stack

### Backend
- **Framework**: NestJS 10 (TypeScript)
- **Database**: PostgreSQL 14+
- **ORM**: TypeORM with migrations
- **Authentication**: JWT with refresh tokens, 2FA (TOTP)
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

### Frontend
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
- **Type Safety**: TypeScript 5

### Mobile (React Native/Expo)
- **Framework**: Expo SDK 54
- **Navigation**: React Navigation 7
- **State Management**: Zustand, TanStack Query
- **Storage**: Expo Secure Store, AsyncStorage
- **Camera**: Expo Camera
- **Location**: Expo Location
- **Maps**: React Native Maps
- **Push Notifications**: Expo Notifications
- **Testing**: Jest with jest-expo
- **Type Safety**: TypeScript 5

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 14+ (Supabase for production)
- **Cache/Queue**: Redis 7
- **Object Storage**: MinIO (dev), Cloudflare R2 (prod)
- **CI/CD**: GitHub Actions
- **Hosting**: Railway (production)
- **Monitoring**: Prometheus + Grafana

---

## Development Workflows

### 1. Creating a New Feature

```bash
# 1. Create feature branch
git checkout -b feature/task-photo-validation

# 2. Check if feature is in current phase (see .claude/phase-1-mvp-checklist.md)

# 3. Implement following module pattern (see below)

# 4. Write tests IMMEDIATELY (not later!)
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
- `build`: Build system changes

**Example**:
```
feat(inventory): implement 3-level inventory transfer

Add automatic inventory transfer when refill tasks complete:
- Warehouse -> Operator (task creation)
- Operator -> Machine (task completion)

Includes validation for insufficient stock.

Closes #456
```

### 3. Branch Naming

```bash
feature/task-photo-validation      # New features
fix/inventory-update-bug           # Bug fixes
docs/add-api-documentation         # Documentation
refactor/simplify-auth-logic       # Refactoring
test/add-task-service-tests        # Tests
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

#### Function/Method Naming
```typescript
// camelCase for methods
async createTask() {}
async getUserById() {}
async updateInventory() {}

// Boolean methods start with is/has/can
isTaskComplete() {}
hasPhotos() {}
canCompleteTask() {}
```

#### Constants
```typescript
// UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 5_000_000;
const DEFAULT_PAGE_SIZE = 20;
const TASK_PHOTO_REQUIRED = true;
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

/**
 * Task card component with completion action
 *
 * Used in operator task list to display and complete tasks
 */
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

### Mobile (React Native/Expo)

#### File Naming
```
PascalCase for components and screens:
  - TaskListScreen.tsx
  - MachineCard.tsx

camelCase for utilities/hooks:
  - useAuth.ts
  - api.ts
```

#### Screen Structure
```typescript
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface TaskListScreenProps {}

export function TaskListScreen({}: TaskListScreenProps) {
  const navigation = useNavigation();

  return (
    <View>
      <Text>Tasks</Text>
    </View>
  );
}
```

---

## Module Patterns

### Standard NestJS Module Structure

```
users/
├── dto/
│   ├── create-user.dto.ts         # Input validation for create
│   ├── update-user.dto.ts         # Input validation for update
│   └── user-response.dto.ts       # Response shape (optional)
├── entities/
│   └── user.entity.ts             # TypeORM entity
├── users.controller.ts            # REST API endpoints
├── users.service.ts               # Business logic
├── users.module.ts                # Module definition
└── users.service.spec.ts          # Unit tests
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
  settings: Record<string, unknown>;
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
import { MachineStatus } from '../entities/machine.entity';

export class CreateMachineDto {
  @ApiProperty({ example: 'M-001' })
  @IsString()
  @MinLength(1, { message: 'Machine number is required' })
  machine_number: string;

  @ApiProperty({ example: 'Coffee Machine in Lobby' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @ApiPropertyOptional({ enum: MachineStatus, default: MachineStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MachineStatus)
  status?: MachineStatus;

  @ApiProperty({ example: 'uuid', description: 'Location ID' })
  @IsUUID()
  location_id: string;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  low_stock_threshold_percent?: number;
}
```

### Service Pattern

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Machine } from './entities/machine.entity';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';

@Injectable()
export class MachinesService {
  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
  ) {}

  /**
   * Create a new machine
   *
   * Validates location exists and machine_number is unique
   *
   * @param createMachineDto - Machine creation data
   * @returns Created machine
   * @throws BadRequestException if machine_number already exists
   */
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

  /**
   * Find all machines with optional filters
   */
  async findAll(filters?: Record<string, unknown>): Promise<Machine[]> {
    return await this.machineRepository.find({
      where: filters,
      relations: ['location'],
    });
  }

  /**
   * Find machine by ID
   *
   * @throws NotFoundException if machine not found
   */
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

  /**
   * Update machine
   */
  async update(id: string, updateMachineDto: UpdateMachineDto): Promise<Machine> {
    await this.findOne(id);
    await this.machineRepository.update(id, updateMachineDto);
    return await this.findOne(id);
  }

  /**
   * Soft delete machine
   */
  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.machineRepository.softDelete(id);
  }
}
```

### Controller Pattern

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MachinesService } from './machines.service';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@modules/auth/guards/roles.guard';

@ApiTags('machines')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('machines')
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create new machine' })
  create(@Body() createMachineDto: CreateMachineDto) {
    return this.machinesService.create(createMachineDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all machines' })
  findAll(@Query() filters: Record<string, unknown>) {
    return this.machinesService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get machine by ID' })
  findOne(@Param('id') id: string) {
    return this.machinesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update machine' })
  update(@Param('id') id: string, @Body() updateMachineDto: UpdateMachineDto) {
    return this.machinesService.update(id, updateMachineDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete machine' })
  remove(@Param('id') id: string) {
    return this.machinesService.remove(id);
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
6. **Avoid `any` types** - use `Record<string, unknown>` or specific interfaces

### Relationships

```typescript
// One-to-Many
@Entity('machines')
export class Machine extends BaseEntity {
  @OneToMany(() => Task, (task) => task.machine)
  tasks: Task[];
}

// Many-to-One
@Entity('tasks')
export class Task extends BaseEntity {
  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, (machine) => machine.tasks, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;
}

// Many-to-Many
@Entity('tasks')
export class Task extends BaseEntity {
  @ManyToMany(() => Nomenclature)
  @JoinTable({
    name: 'task_items',
    joinColumn: { name: 'task_id' },
    inverseJoinColumn: { name: 'nomenclature_id' },
  })
  items: Nomenclature[];
}
```

---

## Testing Requirements

### Test Coverage Requirements
- **Unit Tests**: Minimum 70% coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user flows

### Backend Unit Test Pattern

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { BadRequestException } from '@nestjs/common';

describe('TasksService', () => {
  let service: TasksService;
  let mockTaskRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockTaskRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('completeTask', () => {
    it('should throw error if no photos before', async () => {
      const taskId = 'test-task-id';
      mockTaskRepository.findOne.mockResolvedValue({ id: taskId });

      await expect(service.completeTask(taskId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
```

### Frontend Test Pattern (Vitest)

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TaskCard } from './TaskCard';

describe('TaskCard', () => {
  it('renders task title', () => {
    const task = { id: '1', title: 'Refill Machine' };
    render(<TaskCard task={task} onComplete={() => {}} />);
    expect(screen.getByText('Refill Machine')).toBeInTheDocument();
  });
});
```

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

# Mobile
npm run test              # Jest
npm run test:coverage     # With coverage
```

---

## Security Best Practices

### 1. Authentication & Authorization

```typescript
// Use guards for all protected routes
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
@Post()
createMachine(@Body() dto: CreateMachineDto) {
  return this.machinesService.create(dto);
}
```

### 2. Input Validation

```typescript
// ALWAYS validate ALL inputs using DTOs
export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsEnum(TaskType)
  type: TaskType;

  @IsUUID()
  machine_id: string;
}
```

### 3. SQL Injection Prevention

```typescript
// SAFE - TypeORM prevents SQL injection
await this.repository.findOne({ where: { id: userId } });

// UNSAFE - Never use raw queries with user input
await this.repository.query(`SELECT * FROM users WHERE id = ${userId}`);
```

### 4. File Upload Security

```typescript
// Validate file type and size
if (file.size > 5_000_000) {
  throw new BadRequestException('File too large (max 5MB)');
}

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
if (!allowedMimes.includes(file.mimetype)) {
  throw new BadRequestException('Invalid file type');
}
```

### 5. Rate Limiting

```typescript
// Already configured in main.ts via @nestjs/throttler
// Default: 100 requests per minute per IP
```

---

## Common Tasks Guide

### Task 1: Add New CRUD Module

1. **Create module directory**:
```bash
cd backend/src/modules
mkdir my-module
cd my-module
```

2. **Create files**:
```
my-module/
├── dto/
│   ├── create-my-entity.dto.ts
│   └── update-my-entity.dto.ts
├── entities/
│   └── my-entity.entity.ts
├── my-module.controller.ts
├── my-module.service.ts
├── my-module.module.ts
└── my-module.service.spec.ts
```

3. **Use templates** from `.claude/templates/backend/`

4. **Register module** in `app.module.ts`:
```typescript
import { MyModule } from './modules/my-module/my-module.module';

@Module({
  imports: [
    // ... other modules
    MyModule,
  ],
})
export class AppModule {}
```

5. **Create migration**:
```bash
npm run migration:generate -- -n CreateMyEntityTable
npm run migration:run
```

### Task 2: Add API Endpoint to Existing Module

1. **Add method to service**:
```typescript
async findByStatus(status: string): Promise<MyEntity[]> {
  return await this.repository.find({ where: { status } });
}
```

2. **Add endpoint to controller**:
```typescript
@Get('by-status/:status')
@ApiOperation({ summary: 'Get entities by status' })
findByStatus(@Param('status') status: string) {
  return this.myModuleService.findByStatus(status);
}
```

3. **Add tests**

### Task 3: Update Database Schema

1. **Modify entity**
2. **Generate migration**: `npm run migration:generate -- -n AddNewFieldToMachine`
3. **Review migration** in `src/database/migrations/`
4. **Run migration**: `npm run migration:run`

### Task 4: Add Scheduled Job

```typescript
// src/scheduled-tasks/scheduled-tasks.service.ts
@Cron('0 */6 * * *') // Every 6 hours
async checkLowStock() {
  const lowStockMachines = await this.machinesService.findLowStock();
  for (const machine of lowStockMachines) {
    await this.notificationsService.sendLowStockAlert(machine);
  }
}
```

---

## Pitfalls to Avoid

### CRITICAL MISTAKES

#### 1. Creating Machine Connectivity Features
```typescript
// WRONG - This project has NO machine connectivity!
async getMachineOnlineStatus(machineId: string) {
  return await this.machineAPI.ping(machineId); // NO SUCH API!
}

// CORRECT - Status updated manually by operators
async updateMachineStatus(machineId: string, status: MachineStatus) {
  return await this.machineRepository.update(machineId, { status });
}
```

#### 2. Skipping Photo Validation
```typescript
// WRONG - Photos are MANDATORY
async completeTask(taskId: string) {
  await this.taskRepository.update(taskId, { status: 'completed' });
}

// CORRECT - Always validate photos
async completeTask(taskId: string) {
  await this.validateTaskPhotos(taskId); // Throws if missing
  await this.taskRepository.update(taskId, { status: 'completed' });
}
```

#### 3. Forgetting Inventory Updates
```typescript
// WRONG - Inventory not updated after refill
async completeRefillTask(task: Task) {
  await this.taskRepository.update(task.id, { status: 'completed' });
}

// CORRECT - Always update inventory
async completeRefillTask(task: Task) {
  await this.taskRepository.update(task.id, { status: 'completed' });
  await this.inventoryService.updateAfterRefill(task); // CRITICAL!
}
```

#### 4. Using `any` Type
```typescript
// WRONG
async findAll(filters?: any): Promise<Machine[]> {}

// CORRECT
async findAll(filters?: Record<string, unknown>): Promise<Machine[]> {}
// or define a proper interface
```

#### 5. Over-Engineering
```typescript
// WRONG - Unnecessary abstraction
abstract class BaseInventoryStrategy {
  abstract updateInventory(): Promise<void>;
}

// CORRECT - Keep it simple
async updateWarehouseInventory(data: InventoryUpdate) { ... }
async updateOperatorInventory(data: InventoryUpdate) { ... }
async updateMachineInventory(data: InventoryUpdate) { ... }
```

---

## Specialized Claude Agents

The project includes specialized Claude agents in `.claude/agents/` for different domains:

| Agent | Purpose |
|-------|---------|
| `vendhub-dev-architect` | Architecture decisions, feature planning, Sprint requirements |
| `vendhub-api-developer` | NestJS API development, controllers, services, DTOs |
| `vendhub-auth-security` | Authentication, authorization, security features |
| `vendhub-database-expert` | Database design, migrations, query optimization |
| `vendhub-frontend-specialist` | React/Next.js frontend development |
| `vendhub-telegram-bot` | Telegram bot integration |
| `vendhub-tester` | Test writing and coverage improvement |

Use these agents by referencing the corresponding markdown files for domain-specific guidance.

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
- **Deployment**: `DEPLOYMENT.md`
- **Security**: `SECURITY.md`

---

## For AI Assistants: Best Practices

### When Creating New Code

1. **Check `.claude/rules.md` first** - Contains critical architecture rules
2. **Use templates** from `.claude/templates/backend/`
3. **Follow naming conventions** strictly (kebab-case files, PascalCase classes)
4. **Add JSDoc comments** to all public methods
5. **Write tests immediately** - Don't postpone
6. **Validate all inputs** using DTOs with class-validator
7. **Never skip photo validation** for tasks
8. **Update inventory** when completing refill/collection tasks
9. **Check current phase** in `.claude/phase-1-mvp-checklist.md`
10. **Keep it simple** - Avoid unnecessary abstractions
11. **Avoid `any` types** - Use proper TypeScript types

### When Modifying Existing Code

1. **Read the module first** to understand current patterns
2. **Maintain consistency** with existing code style
3. **Update tests** when changing logic
4. **Update DTOs** when changing entity fields
5. **Create migrations** for database changes
6. **Update Swagger docs** with `@ApiProperty` decorators
7. **Check for breaking changes** in API responses

### When Debugging Issues

1. **Check logs** - NestJS provides detailed error messages
2. **Verify database state** - Check if migrations ran
3. **Test validation** - DTOs might be rejecting requests
4. **Check environment variables** - Compare with `.env.example`
5. **Review recent commits** - `git log --oneline -20`

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

## Support

For questions or clarifications:

1. Check **`.claude/rules.md`** - Most answers are there
2. Review **`.claude/phase-1-mvp-checklist.md`** - For implementation priorities
3. Look at existing modules - Follow established patterns
4. Check documentation in `docs/` directory
5. Review specialized agents in `.claude/agents/`

---

**Last Updated**: 2025-12-19
**Version**: 2.0.0
**Maintained By**: VendHub Development Team
**For**: AI Assistants (Claude Code, GitHub Copilot, etc.)

**Key Principles**:
- Manual Operations Architecture
- Photo Validation is Mandatory
- 3-Level Inventory System
- Tasks are the Central Mechanism
