# 🛡️ Claude Integration Instructions для VHM24

> **Version**: 2.0.0
> **Created**: 2026-01-02
> **Purpose**: Безопасная интеграция и доработка VHM24 с использованием кода из связанных проектов
> **Critical**: ВСЕ ИЗМЕНЕНИЯ ДОЛЖНЫ БЫТЬ НЕРАЗРУШАЮЩИМИ И АДДИТИВНЫМИ

---

## 📋 Оглавление

1. [Философия безопасности](#философия-безопасности)
2. [КРИТИЧЕСКИЕ ПРЕДУПРЕЖДЕНИЯ](#критические-предупреждения)
3. [Архитектура VHM24](#архитектура-vhm24)
4. [Репозитории-источники](#репозитории-источники)
5. [Карта заимствований](#карта-заимствований)
6. [Правила безопасной интеграции](#правила-безопасной-интеграции)
7. [Шаблоны кода](#шаблоны-кода)
8. [Пошаговые инструкции](#пошаговые-инструкции)
9. [Feature Flags](#feature-flags)
10. [Тестирование](#тестирование)
11. [Чек-листы](#чек-листы)

---

## 🔒 Философия безопасности

### Золотые правила

> **НИКОГДА не ломай то, что работает. Расширяй, не заменяй.**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 ПРИНЦИП НЕРАЗРУШАЮЩЕЙ ИНТЕГРАЦИИ                        │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Создай бэкап перед любым изменением                                 │
│  2. Добавляй новое рядом со старым                                      │
│  3. Тестируй старое после добавления нового                             │
│  4. Удаляй старое только после миграции пользователей                   │
│  5. Документируй каждое изменение                                       │
│  6. Все новые колонки — NULLABLE или с DEFAULT                          │
│  7. Миграции ВСЕГДА с up() И down()                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Критерии безопасности операций

| Операция | Уровень | Требования |
|----------|---------|------------|
| Добавление нового модуля | ✅ БЕЗОПАСНО | Без зависимостей от существующих |
| Расширение API (новые endpoints) | ✅ БЕЗОПАСНО | С обратной совместимостью |
| ADD COLUMN (nullable/default) | ✅ БЕЗОПАСНО | Всегда nullable или с default |
| Модификация существующих интерфейсов | ⚠️ ОСТОРОЖНО | Требует ревью |
| Изменение существующих endpoint response | ⚠️ ОСТОРОЖНО | Версионирование API |
| ALTER COLUMN | ❌ ОПАСНО | Запрещено без миграции данных |
| DROP TABLE / DROP COLUMN | ❌ ЗАПРЕЩЕНО | Категорически запрещено |
| Удаление существующих endpoints | ❌ ЗАПРЕЩЕНО | Только deprecation |

---

## 🚨 КРИТИЧЕСКИЕ ПРЕДУПРЕЖДЕНИЯ

### ⛔ ПЕРЕД ЛЮБОЙ ИНТЕГРАЦИЕЙ ПРОЧИТАЙТЕ ЭТО!

```
╔══════════════════════════════════════════════════════════════════════════╗
║  🛑 МОДУЛИ КОТОРЫЕ УЖЕ СУЩЕСТВУЮТ В VHM24 — НЕ СОЗДАВАЙТЕ НОВЫЕ!        ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  ✅ recipes          — СУЩЕСТВУЕТ (recipe.entity.ts, 51 строка)          ║
║  ✅ nomenclature     — СУЩЕСТВУЕТ (nomenclature.entity.ts, 81 строка)    ║
║  ✅ telegram         — СУЩЕСТВУЕТ (13 подмодулей, ~100 файлов)           ║
║  ✅ inventory        — СУЩЕСТВУЕТ (3-уровневый: warehouse/operator/mach) ║
║  ✅ counterparties   — СУЩЕСТВУЕТ (counterparty.entity.ts)               ║
║  ✅ transactions     — СУЩЕСТВУЕТ                                        ║
║  ✅ tasks            — СУЩЕСТВУЕТ (с photo validation)                   ║
║  ✅ machines         — СУЩЕСТВУЕТ                                        ║
║                                                                          ║
║  ДЛЯ ЭТИХ МОДУЛЕЙ: используйте ALTER TABLE ADD COLUMN                   ║
║  НЕ ИСПОЛЬЗУЙТЕ: CREATE TABLE                                           ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### Существующая структура Recipe Entity

```typescript
// backend/src/modules/recipes/entities/recipe.entity.ts
// УЖЕ СОДЕРЖИТ:
@Entity('recipes')
export class Recipe extends BaseEntity {
  product_id: string;              // ✅ Есть
  name: string;                    // ✅ Есть
  type_code: string;               // ✅ Есть
  description: string | null;      // ✅ Есть
  is_active: boolean;              // ✅ Есть
  preparation_time_seconds;        // ✅ УЖЕ ЕСТЬ!
  temperature_celsius;             // ✅ УЖЕ ЕСТЬ!
  serving_size_ml: number;         // ✅ Есть
  total_cost: number;              // ✅ Есть
  settings: Record<string, any>;   // ✅ Есть (jsonb)
  ingredients: RecipeIngredient[]; // ✅ Есть (OneToMany)
}
```

### Существующая структура Nomenclature Entity

```typescript
// backend/src/modules/nomenclature/entities/nomenclature.entity.ts
// УЖЕ СОДЕРЖИТ:
@Entity('nomenclature')
export class Nomenclature extends BaseEntity {
  sku: string;                     // ✅ Есть
  name: string;                    // ✅ Есть
  category_code: string;           // ✅ Есть
  unit_of_measure_code: string;    // ✅ Есть
  purchase_price: number | null;   // ✅ Есть
  selling_price: number | null;    // ✅ Есть
  min_stock_level: number;         // ✅ Есть
  shelf_life_days: number | null;  // ✅ Есть
  is_ingredient: boolean;          // ✅ УЖЕ ЕСТЬ!
  default_supplier_id: string;     // ✅ Есть
  // ... и многое другое
}
```

### ⚠️ Что НЕ существует и МОЖНО создавать

| Модуль | Таблица | Действие |
|--------|---------|----------|
| containers | `containers`, `container_refills` | ✅ Создавать новые |
| ingredient_batches | `ingredient_batches` | ✅ Создавать новые |
| route_optimization | `routes`, `route_stops` | ✅ Создавать новые |
| ai_engine | `ai_requests`, `ai_cache` | ✅ Создавать новые |
| workflows | `workflows`, `workflow_executions` | ✅ Создавать новые |

---

## 🏗️ Архитектура VHM24

### Технологический стек

| Компонент | Технология | Версия | Примечание |
|-----------|------------|--------|------------|
| Backend | NestJS | 10.x | Основной фреймворк |
| Database | PostgreSQL | 14+ | |
| ORM | **TypeORM** | 0.3.x | ⚠️ НЕ Drizzle! |
| Auth | JWT + RBAC | refresh tokens | 7 ролей |
| API Docs | Swagger/OpenAPI | 8.x | /api/docs |
| Telegram | **Telegraf** (интегрированный) | 4.x | НЕ Grammy, НЕ standalone |
| Cache | Redis | 7.x | Сессии, очереди |
| Queue | BullMQ | 4.x | Job processing |
| File Upload | ExcelJS, csv-parser | | Excel/CSV |
| PDF | PDFKit | | Отчёты |

### Структура проекта

```
VHM24/
├── .claude/                    # 📚 Claude инструкции (ЧИТАТЬ ПЕРВЫМ!)
│   ├── agents/                # Специализированные агенты
│   ├── INTEGRATION_INSTRUCTIONS.md  # ЭТО ВЫ ЧИТАЕТЕ
│   └── PROJECT_CUSTOM_INSTRUCTIONS.md
├── backend/                   # 🔧 NestJS Backend
│   ├── src/
│   │   ├── modules/           # 50+ модулей
│   │   │   ├── recipes/       # ⚠️ УЖЕ СУЩЕСТВУЕТ
│   │   │   ├── nomenclature/  # ⚠️ УЖЕ СУЩЕСТВУЕТ
│   │   │   ├── telegram/      # ⚠️ УЖЕ СУЩЕСТВУЕТ (13 подмодулей)
│   │   │   ├── inventory/     # ⚠️ УЖЕ СУЩЕСТВУЕТ
│   │   │   ├── machines/      # ⚠️ УЖЕ СУЩЕСТВУЕТ
│   │   │   ├── tasks/         # ⚠️ УЖЕ СУЩЕСТВУЕТ
│   │   │   └── ...
│   │   ├── database/
│   │   │   └── migrations/    # 82+ TypeORM миграций
│   │   └── common/
│   └── test/
├── frontend/                  # 🎨 Next.js 16 Frontend
├── mobile/                    # 📱 Expo 54 Mobile App
└── docs/                      # Документация
```

### Ключевые модули VHM24 (50+)

| Модуль | Endpoint | Статус | Примечание |
|--------|----------|--------|------------|
| auth | `/auth/*` | ✅ Production | JWT + 2FA + RBAC |
| machines | `/machines/*` | ✅ Production | QR + Connectivity |
| tasks | `/tasks/*` | ✅ Production | Photo-mandatory |
| inventory | `/inventory/*` | ✅ Production | 3-level system |
| transactions | `/transactions/*` | ✅ Production | Sales, Collections |
| incidents | `/incidents/*` | ✅ Production | Auto-create offline |
| complaints | `/complaints/*` | ✅ Production | QR-based |
| notifications | `/notifications/*` | ✅ Production | Multi-channel |
| **telegram** | `/telegram/*` | ✅ Production | **13 подмодулей** |
| **recipes** | `/recipes/*` | ✅ Production | **УЖЕ ПОЛНЫЙ** |
| **nomenclature** | `/nomenclature/*` | ✅ Production | **УЖЕ ПОЛНЫЙ** |
| counterparties | `/counterparties/*` | ✅ Production | Suppliers |
| web-push | `/web-push/*` | ✅ Production | VAPID |
| reports | `/reports/*` | ✅ Production | PDF generation |
| sales-import | `/sales-import/*` | ✅ Production | Excel/CSV async |
| intelligent-import | `/intelligent-import/*` | ✅ Production | AI mapping |

---

## 📦 Репозитории-источники

### 1. data-parse-desk (AI + Excel + ML)

**URL**: https://github.com/jamsmac/data-parse-desk

**Технологии**: React 18, Vite 6, ExcelJS 4.4, Papa Parse 5.5, Supabase, Gemini/GPT

**Что можно взять**:

| Компонент | Целевой модуль VHM24 | Приоритет |
|-----------|---------------------|-----------|
| AI Column Mapping | intelligent-import (ENHANCE) | ⭐ HIGH |
| Formula Engine | NEW: formula-engine | ⭐ HIGH |
| OCR Processing | files (ENHANCE) | MEDIUM |
| NL Query Bot | telegram (ENHANCE) | MEDIUM |
| Rollup Calculator | data-parser (ENHANCE) | LOW |

**⚠️ Несовместимости**:
- ❌ Supabase Edge Functions → адаптировать для NestJS
- ✅ ExcelJS/Papa Parse patterns → можно использовать

### 2. VH24 (tRPC + Raw Materials)

**URL**: https://github.com/jamsmac/VH24

**Технологии**: tRPC, Drizzle ORM, React 19, Grammy, Docker

**⭐ КЛЮЧЕВОЙ ИСТОЧНИК бизнес-логики**:

| Компонент | Целевой модуль VHM24 | Приоритет |
|-----------|---------------------|-----------|
| Containers (бункеры) | NEW: containers | ⭐ HIGH |
| Batch Tracking (партии) | NEW: ingredient-batches | ⭐ HIGH |
| Recipe Consumption Calc | recipes (ENHANCE) | ⭐ HIGH |
| Auto-Deduct Ingredients | inventory (ENHANCE) | HIGH |
| Task Checklists | tasks (ENHANCE) | MEDIUM |
| Manager Approvals | tasks (ENHANCE) | MEDIUM |
| Route Optimization | NEW: route-optimization | LOW |

**⚠️ КРИТИЧЕСКИЕ несовместимости**:
- ❌ **tRPC → REST API**: VHM24 использует NestJS REST
- ❌ **Drizzle → TypeORM**: Схемы ТРЕБУЮТ переписывания
- ❌ **Grammy → Telegraf**: Разные Telegram библиотеки
- ✅ **Бизнес-логика**: Можно адаптировать алгоритмы

### 3. vendify-menu-maps (Menus + Maps)

**URL**: https://github.com/jamsmac/vendify-menu-maps

**Технологии**: React, Vite, Supabase, shadcn/ui, Tailwind CSS

**Что можно взять**:

| Компонент | Целевой модуль VHM24 | Приоритет |
|-----------|---------------------|-----------|
| Map Components | frontend (ADD) | MEDIUM |
| shadcn/ui components | frontend/components/ui | HIGH |
| Public Menu Display | client module (ENHANCE) | HIGH |
| Admin Manual patterns | help module (ENHANCE) | LOW |

**⚠️ Несовместимости**:
- ❌ Supabase Auth → VHM24 использует JWT
- ✅ React компоненты → можно использовать напрямую

### 4. AIAssistant (Multi-model + MCP)

**URL**: https://github.com/jamsmac/AIAssistant

**Технологии**: FastAPI, Gemini, Grok, OpenRouter, MCP

**Что можно взять**:

| Компонент | Целевой модуль VHM24 | Приоритет |
|-----------|---------------------|-----------|
| Multi-model AI Routing | NEW: ai-engine | MEDIUM |
| Context Memory | ai-engine | MEDIUM |
| Smart Caching (920x speedup) | common/cache (ENHANCE) | HIGH |
| Workflow Engine | NEW: workflows | MEDIUM |
| Cost Tracking | ai-engine | LOW |

**⚠️ Несовместимости**:
- ❌ FastAPI → адаптировать для NestJS
- ✅ AI routing logic → можно использовать

### 5. vhm24v2 (Patterns)

**URL**: https://github.com/jamsmac/vhm24v2

**Технологии**: Vite, Drizzle ORM, pnpm, Vitest

**Что можно взять**:

| Компонент | Целевой модуль VHM24 | Приоритет |
|-----------|---------------------|-----------|
| Shared types structure | shared/ | MEDIUM |
| Vitest patterns | test/ | LOW |
| Scripts utilities | scripts/ | LOW |

**⚠️ Несовместимости**:
- ❌ **Drizzle ORM** → НЕ копировать, VHM24 использует TypeORM

---

## 📋 Карта заимствований

### ⚠️ ВАЖНО: Проверьте актуальное состояние модулей в VHM24!

### Высокий приоритет — НОВЫЕ модули (БЕЗОПАСНО)

| Источник | Компонент | Целевой модуль | Сложность | Риск |
|----------|-----------|----------------|-----------|------|
| VH24 | Containers (бункеры) | `backend/src/modules/containers/` | Средняя | ✅ Низкий |
| VH24 | Batch Tracking | `backend/src/modules/ingredient-batches/` | Средняя | ✅ Низкий |
| data-parse-desk | Formula Engine | `backend/src/modules/formula-engine/` | Средняя | ✅ Низкий |
| AIAssistant | Workflow Engine | `backend/src/modules/workflows/` | Высокая | ✅ Низкий |
| AIAssistant | AI Engine | `backend/src/modules/ai-engine/` | Высокая | ✅ Низкий |

### Средний приоритет — РАСШИРЕНИЕ существующих модулей (ОСТОРОЖНО)

| Источник | Компонент | Целевой модуль | Сложность | Риск |
|----------|-----------|----------------|-----------|------|
| VH24 | Recipe Consumption Calc | `recipes/services/` ADD NEW SERVICE | Высокая | ⚠️ Средний |
| VH24 | Auto-Deduct Ingredients | `inventory/services/` ADD NEW SERVICE | Высокая | ⚠️ Средний |
| data-parse-desk | AI Column Mapping | `intelligent-import/` ENHANCE | Средняя | ⚠️ Средний |
| vendify-menu-maps | Public Menu | `client/` ENHANCE | Средняя | ✅ Низкий |

### Низкий приоритет — Требует серьёзной адаптации

| Источник | Компонент | Целевой модуль | Сложность | Риск |
|----------|-----------|----------------|-----------|------|
| VH24 | Route Optimization | NEW module | Очень высокая | ⚠️ Средний |
| AIAssistant | MCP Integration | NEW module | Очень высокая | ⚠️ Средний |
| VH24 | Demand Forecasting | analytics | Очень высокая | ⚠️ Средний |

### ❌ НЕ ИНТЕГРИРОВАТЬ (несовместимо)

| Источник | Компонент | Причина |
|----------|-----------|---------|
| vhm24v2, VH24 | Drizzle схемы/миграции | VHM24 использует TypeORM |
| vendify-menu-maps | Supabase Auth | VHM24 использует JWT |
| VH24 | tRPC роутеры | VHM24 использует NestJS REST |
| VH24 | Grammy bot | VHM24 использует Telegraf |

---

## 🔧 Правила безопасной интеграции

### Правило 1: Изоляция новых модулей

```typescript
// ✅ ПРАВИЛЬНО: Создаём новый изолированный модуль
// backend/src/modules/containers/containers.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Container, ContainerRefill]),
    // Импортируем ТОЛЬКО необходимые существующие модули
    forwardRef(() => MachinesModule), // для связи container -> machine
  ],
  controllers: [ContainersController],
  providers: [ContainersService],
  exports: [ContainersService],
})
export class ContainersModule {}

// ❌ НЕПРАВИЛЬНО: Модифицировать существующий MachinesModule напрямую
```

### Правило 2: Обратная совместимость API

```typescript
// ✅ ПРАВИЛЬНО: Добавляем новый endpoint
// GET /machines/:id (существующий) - НЕ ТРОГАЕМ
// GET /machines/:id/extended (новый) - ДОБАВЛЯЕМ

@Get(':id/extended')
@ApiOperation({ summary: 'Получить автомат с контейнерами' })
async getMachineExtended(@Param('id', ParseUUIDPipe) id: string) {
  const machine = await this.machinesService.findOne(id);
  const containers = await this.containersService.findByMachine(id);
  return { ...machine, containers };
}

// ❌ НЕПРАВИЛЬНО: Менять response существующего endpoint
```

### Правило 3: Миграции только ADD, не ALTER

```typescript
// ✅ ПРАВИЛЬНО: Добавляем новые таблицы
export class AddContainers1704200000000 implements MigrationInterface {
  name = 'AddContainers1704200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Проверяем зависимости
    const hasMachines = await queryRunner.hasTable('machines');
    const hasNomenclature = await queryRunner.hasTable('nomenclature');

    if (!hasMachines || !hasNomenclature) {
      throw new Error('Required tables must exist');
    }

    await queryRunner.createTable(
      new Table({
        name: 'containers',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'machine_id', type: 'uuid' },
          { name: 'nomenclature_id', type: 'uuid', isNullable: true },
          { name: 'slot_number', type: 'int' },
          { name: 'capacity', type: 'decimal', precision: 10, scale: 3 },
          { name: 'current_quantity', type: 'decimal', precision: 10, scale: 3, default: 0 },
          { name: 'min_level', type: 'decimal', precision: 10, scale: 3, isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'active'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('containers', true, true, true);
  }
}

// ⚠️ ОСТОРОЖНО: Добавление колонки в существующую таблицу
// Только nullable или с DEFAULT!
await queryRunner.addColumn('machines', new TableColumn({
  name: 'container_slots_count',
  type: 'int',
  isNullable: true, // ⚠️ ОБЯЗАТЕЛЬНО nullable!
  default: null,
}));

// ❌ ЗАПРЕЩЕНО:
// - ALTER COLUMN
// - DROP COLUMN
// - Изменение типов данных
```

### Правило 4: Расширение существующего сервиса

```typescript
// ✅ ПРАВИЛЬНО: Создаём НОВЫЙ сервис, не трогая существующий
// backend/src/modules/recipes/services/recipe-consumption.service.ts

@Injectable()
export class RecipeConsumptionService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(RecipeIngredient)
    private readonly ingredientRepository: Repository<RecipeIngredient>,
    private readonly dataSource: DataSource,
  ) {}

  // НОВЫЕ методы для расчёта расхода
  async calculateConsumption(recipeId: string, quantity: number = 1) {
    // Логика из VH24, адаптированная для TypeORM
  }

  async deductIngredients(recipeId: string, machineId: string, quantity: number) {
    // Атомарное списание
  }
}

// Регистрация в СУЩЕСТВУЮЩЕМ модуле (ADD, не REPLACE):
// backend/src/modules/recipes/recipes.module.ts
@Module({
  providers: [
    RecipesService,           // Существующий - НЕ ТРОГАТЬ
    RecipeConsumptionService, // Новый - ДОБАВИТЬ
  ],
  exports: [
    RecipesService,           // Существующий
    RecipeConsumptionService, // Новый
  ],
})
export class RecipesModule {}
```

---

## 📝 Шаблоны кода

### Шаблон: Новый NestJS модуль

#### Entity Template

```typescript
// backend/src/modules/[module-name]/entities/[entity-name].entity.ts
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('[table_name]')
@Index(['machine_id'])
export class [EntityName] extends BaseEntity {
  // BaseEntity provides: id (uuid), created_at, updated_at, deleted_at

  @ApiProperty({ description: 'Название' })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({ description: 'Описание' })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'ID автомата' })
  @Column({ type: 'uuid', name: 'machine_id' })
  machine_id: string;

  @ManyToOne('Machine', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: any;

  @ApiProperty({ description: 'Активен' })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
```

#### DTO Template

```typescript
// backend/src/modules/[module-name]/dto/create-[entity-name].dto.ts
import { IsString, IsOptional, IsUUID, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Create[EntityName]Dto {
  @ApiProperty({ description: 'Название', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Описание' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'ID автомата' })
  @IsUUID()
  machine_id: string;

  @ApiPropertyOptional({ description: 'Активен', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

// update-[entity-name].dto.ts
import { PartialType } from '@nestjs/swagger';
import { Create[EntityName]Dto } from './create-[entity-name].dto';

export class Update[EntityName]Dto extends PartialType(Create[EntityName]Dto) {}
```

#### Service Template

```typescript
// backend/src/modules/[module-name]/[module-name].service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { [EntityName] } from './entities/[entity-name].entity';
import { Create[EntityName]Dto } from './dto/create-[entity-name].dto';
import { Update[EntityName]Dto } from './dto/update-[entity-name].dto';

@Injectable()
export class [ModuleName]Service {
  constructor(
    @InjectRepository([EntityName])
    private readonly repository: Repository<[EntityName]>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: Create[EntityName]Dto): Promise<[EntityName]> {
    const entity = this.repository.create(dto);
    return this.repository.save(entity);
  }

  async findAll(): Promise<[EntityName][]> {
    return this.repository.find({
      where: { is_active: true },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<[EntityName]> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`[EntityName] с ID ${id} не найден`);
    }
    return entity;
  }

  async findByMachine(machineId: string): Promise<[EntityName][]> {
    return this.repository.find({
      where: { machine_id: machineId, is_active: true },
    });
  }

  async update(id: string, dto: Update[EntityName]Dto): Promise<[EntityName]> {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.repository.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    // Мягкое удаление
    entity.is_active = false;
    await this.repository.save(entity);
  }
}
```

#### Controller Template

```typescript
// backend/src/modules/[module-name]/[module-name].controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { [ModuleName]Service } from './[module-name].service';
import { Create[EntityName]Dto } from './dto/create-[entity-name].dto';
import { Update[EntityName]Dto } from './dto/update-[entity-name].dto';

@ApiTags('[module-name]')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('[module-name]')
export class [ModuleName]Controller {
  constructor(private readonly service: [ModuleName]Service) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Создать [entity-name]' })
  @ApiResponse({ status: 201, description: 'Создано' })
  create(@Body() dto: Create[EntityName]Dto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все [entity-name]' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить [entity-name] по ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get('machine/:machineId')
  @ApiOperation({ summary: 'Получить [entity-name] по автомату' })
  findByMachine(@Param('machineId', ParseUUIDPipe) machineId: string) {
    return this.service.findByMachine(machineId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить [entity-name]' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Update[EntityName]Dto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Удалить [entity-name] (мягкое)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
```

#### Module Template

```typescript
// backend/src/modules/[module-name]/[module-name].module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { [EntityName] } from './entities/[entity-name].entity';
import { [ModuleName]Service } from './[module-name].service';
import { [ModuleName]Controller } from './[module-name].controller';
import { MachinesModule } from '../machines/machines.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([[EntityName]]),
    forwardRef(() => MachinesModule), // Если нужна связь
  ],
  controllers: [[ModuleName]Controller],
  providers: [[ModuleName]Service],
  exports: [[ModuleName]Service],
})
export class [ModuleName]Module {}
```

### Шаблон: Containers Module (из VH24)

```typescript
// backend/src/modules/containers/entities/container.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('containers')
@Index(['machine_id'])
@Unique(['machine_id', 'slot_number'])
export class Container extends BaseEntity {
  @ApiProperty({ description: 'ID автомата' })
  @Column({ type: 'uuid', name: 'machine_id' })
  machine_id: string;

  @ManyToOne('Machine', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: any;

  @ApiProperty({ description: 'ID номенклатуры (ингредиента)' })
  @Column({ type: 'uuid', name: 'nomenclature_id', nullable: true })
  nomenclature_id: string | null;

  @ManyToOne('Nomenclature', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: any;

  @ApiProperty({ description: 'Номер слота в автомате' })
  @Column({ type: 'int' })
  slot_number: number;

  @ApiProperty({ description: 'Название' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  @ApiProperty({ description: 'Максимальная ёмкость' })
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  capacity: number;

  @ApiProperty({ description: 'Текущий уровень' })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  current_quantity: number;

  @ApiProperty({ description: 'Единица измерения' })
  @Column({ type: 'varchar', length: 20, default: 'г' })
  unit: string;

  @ApiProperty({ description: 'Минимальный уровень для оповещения' })
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  min_level: number | null;

  @ApiProperty({ description: 'Последняя заправка' })
  @Column({ type: 'timestamp', nullable: true })
  last_refill_date: Date | null;

  @ApiProperty({ description: 'Статус' })
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;
}
```

### Шаблон: Recipe Consumption Service (из VH24)

```typescript
// backend/src/modules/recipes/services/recipe-consumption.service.ts
// ДОБАВИТЬ КАК НОВЫЙ ФАЙЛ, не трогая recipes.service.ts!

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Recipe } from '../entities/recipe.entity';
import { RecipeIngredient } from '../entities/recipe-ingredient.entity';

interface IngredientConsumption {
  nomenclature_id: string;
  nomenclature_name: string;
  total_quantity: number;
  unit: string;
}

@Injectable()
export class RecipeConsumptionService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(RecipeIngredient)
    private readonly ingredientRepository: Repository<RecipeIngredient>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Рассчитать расход ингредиентов для заданного количества порций
   */
  async calculateConsumption(
    recipeId: string,
    quantity: number = 1,
  ): Promise<IngredientConsumption[]> {
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId },
      relations: ['ingredients', 'ingredients.nomenclature'],
    });

    if (!recipe) {
      throw new NotFoundException(`Рецепт с ID ${recipeId} не найден`);
    }

    return recipe.ingredients.map((ing) => ({
      nomenclature_id: ing.nomenclature_id,
      nomenclature_name: ing.nomenclature?.name || 'Неизвестно',
      total_quantity: Number(ing.quantity) * quantity,
      unit: ing.unit,
    }));
  }

  /**
   * Списать ингредиенты после продажи
   */
  async deductIngredients(
    recipeId: string,
    machineId: string,
    quantity: number = 1,
  ): Promise<void> {
    const consumption = await this.calculateConsumption(recipeId, quantity);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of consumption) {
        // Списание из machine_inventory
        const result = await queryRunner.query(
          `UPDATE machine_inventory
           SET quantity = quantity - $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE machine_id = $2
             AND nomenclature_id = $3
             AND quantity >= $1
           RETURNING id`,
          [item.total_quantity, machineId, item.nomenclature_id],
        );

        if (!result || result.length === 0) {
          throw new BadRequestException(
            `Недостаточно ингредиента "${item.nomenclature_name}" в автомате`,
          );
        }

        // Логирование операции
        await queryRunner.query(
          `INSERT INTO inventory_movements
           (machine_id, nomenclature_id, quantity, movement_type, created_at)
           VALUES ($1, $2, $3, 'consumption', CURRENT_TIMESTAMP)`,
          [machineId, item.nomenclature_id, -item.total_quantity],
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Проверить достаточность ингредиентов
   */
  async checkAvailability(
    recipeId: string,
    machineId: string,
    quantity: number = 1,
  ): Promise<{ available: boolean; missing: IngredientConsumption[] }> {
    const consumption = await this.calculateConsumption(recipeId, quantity);
    const missing: IngredientConsumption[] = [];

    for (const item of consumption) {
      const [result] = await this.dataSource.query(
        `SELECT quantity FROM machine_inventory
         WHERE machine_id = $1 AND nomenclature_id = $2`,
        [machineId, item.nomenclature_id],
      );

      const currentQty = result?.quantity || 0;
      if (currentQty < item.total_quantity) {
        missing.push({
          ...item,
          total_quantity: item.total_quantity - Number(currentQty),
        });
      }
    }

    return { available: missing.length === 0, missing };
  }
}
```

---

## 🚩 Feature Flags

### Конфигурация

```typescript
// backend/src/config/feature-flags.config.ts
export interface FeatureFlags {
  CONTAINERS_ENABLED: boolean;
  RECIPE_CONSUMPTION_ENABLED: boolean;
  BATCH_TRACKING_ENABLED: boolean;
  ROUTE_OPTIMIZATION_ENABLED: boolean;
  AI_ENGINE_ENABLED: boolean;
  WORKFLOW_ENGINE_ENABLED: boolean;
  AI_COLUMN_MAPPING_ENABLED: boolean;
}

export const getFeatureFlags = (): FeatureFlags => ({
  CONTAINERS_ENABLED: process.env.FEATURE_CONTAINERS === 'true',
  RECIPE_CONSUMPTION_ENABLED: process.env.FEATURE_RECIPE_CONSUMPTION === 'true',
  BATCH_TRACKING_ENABLED: process.env.FEATURE_BATCH_TRACKING === 'true',
  ROUTE_OPTIMIZATION_ENABLED: process.env.FEATURE_ROUTES === 'true',
  AI_ENGINE_ENABLED: process.env.FEATURE_AI_ENGINE === 'true',
  WORKFLOW_ENGINE_ENABLED: process.env.FEATURE_WORKFLOWS === 'true',
  AI_COLUMN_MAPPING_ENABLED: process.env.FEATURE_AI_COLUMN_MAPPING === 'true',
});
```

### Guard для Feature Flags

```typescript
// backend/src/common/guards/feature-flag.guard.ts
import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getFeatureFlags, FeatureFlags } from '@/config/feature-flags.config';

export const FEATURE_FLAG_KEY = 'feature_flag';
export const FeatureFlag = (flag: keyof FeatureFlags) =>
  SetMetadata(FEATURE_FLAG_KEY, flag);

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFlag = this.reflector.getAllAndOverride<keyof FeatureFlags>(
      FEATURE_FLAG_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFlag) return true;

    const flags = getFeatureFlags();
    if (!flags[requiredFlag]) {
      throw new HttpException(
        `Функция "${requiredFlag}" временно недоступна`,
        HttpStatus.NOT_IMPLEMENTED,
      );
    }

    return true;
  }
}

// Использование:
@Controller('containers')
@UseGuards(FeatureFlagGuard)
@FeatureFlag('CONTAINERS_ENABLED')
export class ContainersController { }
```

### Переменные окружения

```bash
# .env — добавить
# =================================
# FEATURE FLAGS (новые функции)
# =================================
FEATURE_CONTAINERS=true
FEATURE_RECIPE_CONSUMPTION=true
FEATURE_BATCH_TRACKING=false
FEATURE_ROUTES=false
FEATURE_AI_ENGINE=false
FEATURE_WORKFLOWS=false
FEATURE_AI_COLUMN_MAPPING=false
```

---

## 🧪 Тестирование

### Минимальные требования

| Тип теста | Покрытие | Обязательность |
|-----------|----------|----------------|
| Unit Tests | 80%+ | Все новые сервисы |
| Integration Tests | 100% | Все новые endpoints |
| E2E Tests | Critical flows | Основные сценарии |
| Regression | 100% | Все существующие тесты должны пройти |

### Команды

```bash
# Запустить все тесты
npm run test

# Тесты с покрытием
npm run test:cov

# E2E тесты
npm run test:e2e

# Конкретный модуль
npm run test -- --testPathPattern=containers

# Миграции
npm run migration:run
npm run migration:revert
```

### Test Template

```typescript
// backend/src/modules/containers/containers.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ContainersService } from './containers.service';
import { Container } from './entities/container.entity';

describe('ContainersService', () => {
  let service: ContainersService;
  let repository: Repository<Container>;

  const mockContainer = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    machine_id: '123e4567-e89b-12d3-a456-426614174001',
    slot_number: 1,
    capacity: 1000,
    current_quantity: 500,
    status: 'active',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContainersService,
        {
          provide: getRepositoryToken(Container),
          useValue: {
            find: jest.fn().mockResolvedValue([mockContainer]),
            findOne: jest.fn().mockResolvedValue(mockContainer),
            create: jest.fn().mockReturnValue(mockContainer),
            save: jest.fn().mockResolvedValue(mockContainer),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: { save: jest.fn() },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ContainersService>(ContainersService);
    repository = module.get<Repository<Container>>(getRepositoryToken(Container));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByMachine', () => {
    it('should return containers for machine', async () => {
      const result = await service.findByMachine(mockContainer.machine_id);
      expect(result).toEqual([mockContainer]);
    });
  });
});
```

---

## ✅ Чек-листы

### Чек-лист: Перед интеграцией

```markdown
## Подготовка
□ Прочитан CLAUDE.md
□ Прочитан INTEGRATION_INSTRUCTIONS.md
□ Проверено — целевой модуль НЕ существует (или нужно расширение)
□ Определена область ответственности модуля
□ Создан feature flag

## Ветка и бэкап
□ Создана feature branch: feature/integrate-[name]
□ Запущены все тесты — baseline зафиксирован
□ git status — чистый working directory
```

### Чек-лист: Добавление нового модуля

```markdown
## Разработка
□ Создана миграция (только CREATE TABLE, не ALTER)
□ Миграция имеет up() И down()
□ Создан Entity (extends BaseEntity)
□ Созданы DTOs с валидацией
□ Создан Service
□ Создан Controller с Swagger
□ Создан Module с exports
□ Модуль зарегистрирован в AppModule

## Тестирование
□ Unit тесты для Service (80%+)
□ Тесты для Controller
□ Все существующие тесты проходят
□ npm run lint — без ошибок
□ npm run build — успешно
```

### Чек-лист: Расширение существующего модуля

```markdown
## КРИТИЧЕСКИ ВАЖНО
□ Проверено — модуль УЖЕ существует
□ Изучена текущая структура Entity
□ НЕ создаю новую таблицу (использую ADD COLUMN)

## Изменения
□ Создан НОВЫЙ сервис (не модифицирую существующий)
□ Добавлены НОВЫЕ endpoints (не меняю существующие)
□ Новые колонки — nullable или с default
□ Response существующих endpoints НЕ изменён

## Проверка
□ API обратно совместим
□ Все существующие тесты проходят
□ Новые тесты написаны
```

### Чек-лист: После интеграции

```markdown
## Финальная проверка
□ npm run test — все тесты проходят
□ npm run test:cov — покрытие не снизилось
□ npm run lint — без ошибок
□ npm run build — успешно
□ Swagger документация обновлена
□ Feature flag документирован

## Документация
□ README модуля создан
□ CHANGELOG обновлён
□ Commit message по формату Conventional Commits
```

---

## ⛔ Запрещённые действия

```
╔════════════════════════════════════════════════════════════════════════╗
║  КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО                                               ║
╠════════════════════════════════════════════════════════════════════════╣
║  • DROP TABLE, DROP COLUMN                                             ║
║  • ALTER COLUMN с изменением типа                                      ║
║  • Удалять или переименовывать существующие endpoints                  ║
║  • Изменять response format существующих endpoints                     ║
║  • Удалять существующие сервисы                                        ║
║  • Изменять логику аутентификации без ревью                           ║
║  • Коммитить напрямую в main                                          ║
║  • Деплоить без тестирования                                          ║
║  • Создавать CREATE TABLE для уже существующих таблиц                  ║
║  • Использовать Drizzle (VHM24 использует TypeORM)                     ║
║  • Использовать Grammy (VHM24 использует Telegraf)                     ║
╚════════════════════════════════════════════════════════════════════════╝
```

---

## 📊 Матрица принятия решений

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Что вы хотите сделать?                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Добавить новую функцию         ──→ Проверить: модуль существует?       │
│         ↓                                    ↓                          │
│      ДА существует              ──→ Создать НОВЫЙ сервис внутри         │
│         ↓                            (НЕ трогать существующий)          │
│      НЕТ                        ──→ Создать новый модуль                │
│                                                                         │
│  Добавить поле в таблицу        ──→ ADD COLUMN (nullable/default)       │
│                                                                         │
│  Изменить существующее поле     ──→ СТОП! Нужен отдельный план          │
│                                     миграции данных                     │
│                                                                         │
│  Удалить функционал             ──→ СТОП! Только deprecation            │
│                                     на 2+ версии                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📞 Ресурсы

- **Репозиторий**: https://github.com/jamsmac/VHM24
- **Swagger API**: http://localhost:3000/api/docs
- **NestJS Docs**: https://docs.nestjs.com
- **TypeORM Docs**: https://typeorm.io
- **Существующие агенты**: `.claude/agents/`

---

**Last Updated**: 2026-01-02
**Version**: 2.0.0

---

**Помните**: Когда сомневаетесь — ДОБАВЛЯЙТЕ, не МОДИФИЦИРУЙТЕ.
