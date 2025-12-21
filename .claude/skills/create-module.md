---
name: create-module
description: Создание нового NestJS модуля с полной структурой (entity, dto, controller, service, module, tests).
---

# Create NestJS Module

Создай новый модуль следуя структуре VendHub.

## Запроси информацию

Перед созданием спроси:
1. Название модуля (например: "complaints", "equipment")
2. Основные поля entity
3. Нужны ли связи с другими entities

## Структура модуля

```
backend/src/modules/{module-name}/
├── dto/
│   ├── create-{module-name}.dto.ts
│   ├── update-{module-name}.dto.ts
│   └── {module-name}-response.dto.ts
├── entities/
│   └── {module-name}.entity.ts
├── {module-name}.controller.ts
├── {module-name}.service.ts
├── {module-name}.module.ts
└── {module-name}.service.spec.ts
```

## Шаблоны

### Entity (entity.ts)
```typescript
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('{table_name}')
@Index(['{foreign_key}_id'])
export class {EntityName} extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  // Add other fields...

  @Column({ type: 'uuid' })
  created_by_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;
}
```

### DTO (create.dto.ts)
```typescript
import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Create{EntityName}Dto {
  @ApiProperty({ example: 'Example name' })
  @IsString()
  @MinLength(1)
  name: string;
}
```

### Service (service.ts)
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class {EntityName}Service {
  constructor(
    @InjectRepository({EntityName})
    private readonly repository: Repository<{EntityName}>,
  ) {}

  async create(dto: Create{EntityName}Dto, userId: string) {
    const entity = this.repository.create({
      ...dto,
      created_by_id: userId,
    });
    return this.repository.save(entity);
  }

  async findAll() {
    return this.repository.find({
      relations: ['created_by'],
    });
  }

  async findOne(id: string) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['created_by'],
    });
    if (!entity) {
      throw new NotFoundException(`{EntityName} with ID ${id} not found`);
    }
    return entity;
  }
}
```

### Controller (controller.ts)
```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('{module-name}')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('{module-name}')
export class {EntityName}Controller {
  constructor(private readonly service: {EntityName}Service) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create new {entity}' })
  create(@Body() dto: Create{EntityName}Dto, @CurrentUser() user) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all {entities}' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get {entity} by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
```

### Module (module.ts)
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([{EntityName}])],
  controllers: [{EntityName}Controller],
  providers: [{EntityName}Service],
  exports: [{EntityName}Service],
})
export class {EntityName}Module {}
```

## После создания

1. Зарегистрируй модуль в `app.module.ts`
2. Создай миграцию: `npm run migration:generate -- -n Create{EntityName}Table`
3. Запусти миграцию: `npm run migration:run`
4. Добавь тесты
