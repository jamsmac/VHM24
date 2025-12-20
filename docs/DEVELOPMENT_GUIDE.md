# VendHub Manager - Development Guide

> **Version**: 1.0.0
> **Last Updated**: 2025-12-19

A comprehensive guide for developers working on the VendHub Manager project.

---

## Table of Contents

1. [Development Environment Setup](#1-development-environment-setup)
2. [Project Structure](#2-project-structure)
3. [Coding Standards](#3-coding-standards)
4. [Backend Development](#4-backend-development)
5. [Frontend Development](#5-frontend-development)
6. [Mobile Development](#6-mobile-development)
7. [Database Operations](#7-database-operations)
8. [Testing](#8-testing)
9. [Git Workflow](#9-git-workflow)
10. [Debugging](#10-debugging)
11. [Common Tasks](#11-common-tasks)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. DEVELOPMENT ENVIRONMENT SETUP

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Docker** and Docker Compose
- **Git**
- **VS Code** (recommended) with extensions:
  - ESLint
  - Prettier
  - TypeScript Vue Plugin
  - Tailwind CSS IntelliSense

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/jamsmac/VHM24.git
cd VHM24

# 2. Start infrastructure services
docker-compose up -d postgres redis minio

# 3. Setup backend
cd backend
cp .env.example .env
npm install
npm run migration:run
npm run create-superadmin  # Creates admin@vendhub.com / Admin123!

# 4. Setup frontend
cd ../frontend
cp .env.example .env.local
npm install

# 5. Setup mobile (optional)
cd ../mobile
npm install
```

### Running Services

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Mobile (optional)
cd mobile
npm run start
```

### Service URLs

| Service | URL |
|---------|-----|
| Backend API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/api/docs |
| Frontend | http://localhost:3001 |
| MinIO Console | http://localhost:9001 |
| Bull Dashboard | http://localhost:3000/api/admin/queues |

### Environment Variables

#### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/vendhub

# Redis
REDIS_URL=redis://localhost:6379

# JWT (generate secure keys for production!)
JWT_SECRET=your-secure-64-character-secret-key-here-replace-in-production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Encryption (32 bytes base64)
ENCRYPTION_KEY=your-32-byte-base64-encryption-key

# File Storage
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=vendhub
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3001

# Telegram (optional for local dev)
TELEGRAM_BOT_TOKEN=your-bot-token
```

#### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_NAME=VendHub Manager
```

---

## 2. PROJECT STRUCTURE

### Overview

```
VHM24/
├── backend/           # NestJS API
├── frontend/          # Next.js Dashboard
├── mobile/            # React Native App
├── docs/              # Documentation
├── monitoring/        # Prometheus + Grafana configs
├── nginx/             # Nginx configurations
├── scripts/           # Deployment scripts
├── .claude/           # AI assistant rules & templates
└── .github/           # CI/CD workflows
```

### Backend Structure

```
backend/src/
├── modules/           # Feature modules (45 modules)
│   └── [module]/
│       ├── dto/       # Data Transfer Objects
│       ├── entities/  # TypeORM entities
│       ├── *.controller.ts
│       ├── *.service.ts
│       ├── *.module.ts
│       └── *.spec.ts
├── common/            # Shared code
│   ├── entities/      # BaseEntity
│   ├── decorators/    # Custom decorators
│   ├── guards/        # Auth guards
│   ├── filters/       # Exception filters
│   └── pipes/         # Validation pipes
├── config/            # Configuration
├── database/          # Migrations & seeds
└── scheduled-tasks/   # Cron jobs
```

### Frontend Structure

```
frontend/src/
├── app/               # Next.js App Router pages
│   ├── (auth)/        # Auth pages (login, register)
│   ├── (public)/      # Public pages (menu, order)
│   └── dashboard/     # Protected dashboard pages
├── components/        # React components
│   ├── ui/            # Shadcn UI primitives
│   └── [feature]/     # Feature-specific components
├── hooks/             # Custom React hooks
├── lib/               # Utilities & API client
├── providers/         # Context providers
└── types/             # TypeScript definitions
```

---

## 3. CODING STANDARDS

### File Naming

```
# Backend - kebab-case
user.service.ts
create-user.dto.ts
machine.entity.ts

# Frontend - PascalCase for components
MachineCard.tsx
TaskList.tsx
useAuth.ts (hooks)
```

### TypeScript Conventions

```typescript
// Use interfaces for DTOs and API responses
interface CreateMachineDto {
  machine_number: string;
  name: string;
  location_id: string;
}

// Use type for unions and simple types
type MachineStatus = 'active' | 'offline' | 'maintenance';

// Use enums for fixed sets of values
enum TaskType {
  REFILL = 'refill',
  COLLECTION = 'collection',
  CLEANING = 'cleaning',
}

// NEVER use `any` - use proper types
// BAD
const data: any = response;

// GOOD
const data: MachineResponse = response;
```

### Import Order

```typescript
// 1. Node modules
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// 2. Path aliases (@/)
import { BaseEntity } from '@/common/entities/base.entity';
import { TaskService } from '@modules/tasks/tasks.service';

// 3. Relative imports
import { CreateMachineDto } from './dto/create-machine.dto';
import { Machine } from './entities/machine.entity';
```

### JSDoc Comments

```typescript
/**
 * Creates a new vending machine
 * @param dto - Machine creation data
 * @returns Created machine entity
 * @throws BadRequestException if machine_number already exists
 */
async create(dto: CreateMachineDto): Promise<Machine> {
  // implementation
}
```

---

## 4. BACKEND DEVELOPMENT

### Creating a New Module

```bash
# 1. Create module structure
mkdir -p backend/src/modules/my-feature/{dto,entities}

# 2. Create files
touch backend/src/modules/my-feature/my-feature.{module,controller,service}.ts
touch backend/src/modules/my-feature/entities/my-entity.entity.ts
touch backend/src/modules/my-feature/dto/{create,update}-my-entity.dto.ts
touch backend/src/modules/my-feature/my-feature.service.spec.ts
```

### Entity Template

```typescript
// entities/machine.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

export enum MachineStatus {
  ACTIVE = 'active',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
}

@Entity('machines')
@Index(['location_id'])
@Index(['machine_number'], { unique: true })
export class Machine extends BaseEntity {
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
}
```

### DTO Template

```typescript
// dto/create-machine.dto.ts
import { IsString, IsEnum, IsUUID, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MachineStatus } from '../entities/machine.entity';

export class CreateMachineDto {
  @ApiProperty({ example: 'M-001', description: 'Unique machine number' })
  @IsString()
  @MinLength(1, { message: 'Machine number is required' })
  machine_number: string;

  @ApiProperty({ example: 'Coffee Machine Lobby' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ enum: MachineStatus })
  @IsOptional()
  @IsEnum(MachineStatus)
  status?: MachineStatus;

  @ApiProperty({ description: 'Location UUID' })
  @IsUUID()
  location_id: string;
}
```

### Service Template

```typescript
// my-feature.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Machine } from './entities/machine.entity';
import { CreateMachineDto } from './dto/create-machine.dto';

@Injectable()
export class MachinesService {
  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
  ) {}

  async create(dto: CreateMachineDto): Promise<Machine> {
    // Check for duplicates
    const existing = await this.machineRepository.findOne({
      where: { machine_number: dto.machine_number },
    });

    if (existing) {
      throw new BadRequestException('Machine number already exists');
    }

    const machine = this.machineRepository.create(dto);
    return this.machineRepository.save(machine);
  }

  async findOne(id: string): Promise<Machine> {
    const machine = await this.machineRepository.findOne({
      where: { id },
      relations: ['location'],
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${id} not found`);
    }

    return machine;
  }
}
```

### Controller Template

```typescript
// my-feature.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { MachinesService } from './machines.service';
import { CreateMachineDto } from './dto/create-machine.dto';

@ApiTags('Machines')
@ApiBearerAuth()
@Controller('machines')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new machine' })
  create(@Body() dto: CreateMachineDto) {
    return this.machinesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get machine by ID' })
  findOne(@Param('id') id: string) {
    return this.machinesService.findOne(id);
  }
}
```

---

## 5. FRONTEND DEVELOPMENT

### Component Template

```tsx
// components/machines/MachineCard.tsx
'use client';

import { useState } from 'react';
import { Machine } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MachineCardProps {
  machine: Machine;
  onSelect?: (id: string) => void;
}

export function MachineCard({ machine, onSelect }: MachineCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    onSelect?.(machine.id);
  };

  return (
    <Card onClick={handleClick} className="cursor-pointer hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{machine.name}</span>
          <Badge variant={machine.status === 'active' ? 'success' : 'secondary'}>
            {machine.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {machine.machine_number}
        </p>
      </CardContent>
    </Card>
  );
}
```

### Custom Hook Template

```typescript
// hooks/useMachines.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Machine, CreateMachineDto } from '@/types';

export function useMachines() {
  return useQuery<Machine[]>({
    queryKey: ['machines'],
    queryFn: () => api.get('/machines').then(res => res.data),
  });
}

export function useMachine(id: string) {
  return useQuery<Machine>({
    queryKey: ['machines', id],
    queryFn: () => api.get(`/machines/${id}`).then(res => res.data),
    enabled: !!id,
  });
}

export function useCreateMachine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMachineDto) =>
      api.post('/machines', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });
}
```

### Page Template (App Router)

```tsx
// app/dashboard/machines/page.tsx
import { Suspense } from 'react';
import { MachinesList } from '@/components/machines/MachinesList';
import { MachinesHeader } from '@/components/machines/MachinesHeader';
import { Skeleton } from '@/components/ui/skeleton';

export default function MachinesPage() {
  return (
    <div className="space-y-6">
      <MachinesHeader />
      <Suspense fallback={<MachinesListSkeleton />}>
        <MachinesList />
      </Suspense>
    </div>
  );
}

function MachinesListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}
```

---

## 6. MOBILE DEVELOPMENT

### Screen Template

```tsx
// screens/Tasks/TaskDetailScreen.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTask } from '@/hooks/useTasks';
import { Button } from '@/components/Button';
import { PhotoCapture } from '@/components/PhotoCapture';

type RouteParams = {
  TaskDetail: { taskId: string };
};

export function TaskDetailScreen() {
  const route = useRoute<RouteProp<RouteParams, 'TaskDetail'>>();
  const { taskId } = route.params;
  const { data: task, isLoading } = useTask(taskId);

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{task?.type}</Text>
        <StatusBadge status={task?.status} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Machine</Text>
        <Text style={styles.value}>{task?.machine?.name}</Text>
      </View>

      <PhotoCapture
        taskId={taskId}
        category="task_photo_before"
        label="Photo Before"
      />

      <Button
        title="Start Task"
        onPress={() => handleStartTask(taskId)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: 'bold' },
  content: { marginTop: 16 },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 16, marginTop: 4 },
});
```

---

## 7. DATABASE OPERATIONS

### Creating Migrations

```bash
# Generate migration from entity changes
cd backend
npm run migration:generate -- -n AddMachineQrCode

# Create empty migration
npm run migration:create -- -n CustomMigration
```

### Migration Template

```typescript
// migrations/1234567890-AddMachineQrCode.ts
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMachineQrCode1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'machines',
      new TableColumn({
        name: 'qr_code_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );

    // Add index
    await queryRunner.query(`
      CREATE INDEX idx_machines_qr_code ON machines(qr_code_url)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('machines', 'qr_code_url');
  }
}
```

### Running Migrations

```bash
# Run all pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

---

## 8. TESTING

### Running Tests

```bash
# Backend
cd backend
npm run test              # Unit tests
npm run test:watch        # Watch mode
npm run test:cov          # With coverage
npm run test:e2e          # E2E tests

# Frontend
cd frontend
npm run test              # Vitest
npm run test:ui           # Vitest UI
npm run test:coverage     # With coverage

# Mobile
cd mobile
npm run test              # Jest
npm run test:watch        # Watch mode
```

### Unit Test Template

```typescript
// machines.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MachinesService } from './machines.service';
import { Machine } from './entities/machine.entity';

describe('MachinesService', () => {
  let service: MachinesService;
  let repository: Repository<Machine>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachinesService,
        {
          provide: getRepositoryToken(Machine),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MachinesService>(MachinesService);
    repository = module.get<Repository<Machine>>(getRepositoryToken(Machine));
  });

  describe('create', () => {
    it('should create a machine', async () => {
      const dto = { machine_number: 'M-001', name: 'Test Machine' };
      const machine = { id: '1', ...dto };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(machine);
      mockRepository.save.mockResolvedValue(machine);

      const result = await service.create(dto);

      expect(result).toEqual(machine);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw if machine_number exists', async () => {
      const dto = { machine_number: 'M-001', name: 'Test' };
      mockRepository.findOne.mockResolvedValue({ id: '1' });

      await expect(service.create(dto)).rejects.toThrow('already exists');
    });
  });
});
```

---

## 9. GIT WORKFLOW

### Branch Naming

```bash
feature/task-photo-validation    # New features
fix/inventory-update-bug         # Bug fixes
docs/add-api-documentation       # Documentation
refactor/simplify-auth-logic     # Refactoring
test/add-task-service-tests      # Tests
```

### Commit Message Format

```bash
# Format: <type>(<scope>): <subject>

# Types: feat, fix, docs, style, refactor, test, chore, perf

# Examples:
feat(tasks): add photo validation before completion
fix(inventory): correct quantity calculation on transfer
docs(api): add Swagger documentation for machines endpoint
refactor(auth): simplify JWT token validation logic
test(machines): add unit tests for MachinesService
```

### Pull Request Checklist

Before creating a PR, ensure:

- [ ] Code follows project conventions
- [ ] All tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated if needed
- [ ] Migration created if schema changed
- [ ] No hardcoded secrets

---

## 10. DEBUGGING

### Backend Debugging

```bash
# Start with debugging enabled
npm run start:debug

# VS Code launch.json
{
  "type": "node",
  "request": "attach",
  "name": "Attach NestJS",
  "port": 9229,
  "restart": true
}
```

### Useful Debug Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Get authenticated user info
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users/me

# Check Bull queues
open http://localhost:3000/api/admin/queues
```

### Database Debugging

```bash
# Connect to PostgreSQL
docker exec -it vhm24-postgres-1 psql -U postgres -d vendhub

# Useful queries
SELECT * FROM machines LIMIT 10;
SELECT COUNT(*) FROM tasks WHERE status = 'pending';
```

---

## 11. COMMON TASKS

### Adding a New API Endpoint

1. Add method to service
2. Add endpoint to controller with guards
3. Create/update DTOs with validation
4. Add Swagger decorators
5. Write tests
6. Update API documentation

### Adding a Database Field

1. Add field to entity with decorators
2. Generate migration: `npm run migration:generate -- -n AddFieldName`
3. Review generated migration
4. Run migration: `npm run migration:run`
5. Update DTOs
6. Update frontend types
7. Update UI if needed

### Creating a Scheduled Task

```typescript
// scheduled-tasks/scheduled-tasks.service.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ScheduledTasksService {
  @Cron(CronExpression.EVERY_6_HOURS)
  async checkLowStockMachines() {
    // Implementation
  }

  @Cron('0 0 * * *') // Daily at midnight
  async generateDailyReport() {
    // Implementation
  }
}
```

---

## 12. TROUBLESHOOTING

### Common Issues

#### Port already in use

```bash
# Find process using port
lsof -i :3000
# Kill process
kill -9 <PID>
```

#### Database connection failed

```bash
# Check if PostgreSQL is running
docker-compose ps
# Restart database
docker-compose restart postgres
```

#### Migration failed

```bash
# Check migration status
npm run migration:show
# Revert and retry
npm run migration:revert
npm run migration:run
```

#### TypeScript compilation errors

```bash
# Clear cache and rebuild
rm -rf dist
npm run build
```

#### Mobile app not connecting to API

1. Check backend is running on correct port
2. Update API URL in mobile config
3. For iOS simulator, use `localhost`
4. For Android emulator, use `10.0.2.2`

### Getting Help

1. Check existing documentation in `/docs`
2. Review CLAUDE.md for AI assistant guidance
3. Check GitHub issues for similar problems
4. Ask in team chat with error details

---

**Version**: 1.0.0
**Last Updated**: 2025-12-19
**Project**: VendHub Manager (VHM24)
