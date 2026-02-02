# Swagger/OpenAPI Setup для VendHub

## Установка

```bash
npm install @nestjs/swagger swagger-ui-express
```

## Конфигурация

```typescript
// backend/src/config/swagger.config.ts
import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('VendHub API')
  .setDescription(`
    VendHub OS - Система управления парком вендинг-машин.

    ## Authentication
    API использует JWT Bearer token для аутентификации.
    Получите токен через \`POST /api/auth/login\`.

    ## Rate Limiting
    - General: 100 requests/minute
    - Auth endpoints: 5 requests/minute

    ## Errors
    Все ошибки возвращаются в формате:
    \`\`\`json
    {
      "statusCode": 400,
      "message": "Error description",
      "error": "Bad Request"
    }
    \`\`\`
  `)
  .setVersion('1.0.0')
  .setContact('VendHub Team', 'https://vendhub.uz', 'support@vendhub.uz')
  .setLicense('Proprietary', '')
  .addServer('http://localhost:3000', 'Development')
  .addServer('https://api-staging.vendhub.uz', 'Staging')
  .addServer('https://api.vendhub.uz', 'Production')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter JWT token',
    },
    'JWT',
  )
  .addTag('auth', 'Authentication & Authorization')
  .addTag('users', 'User Management')
  .addTag('machines', 'Vending Machine Management')
  .addTag('tasks', 'Task Management (Refill, Collection, Maintenance)')
  .addTag('inventory', 'Inventory Management')
  .addTag('analytics', 'Analytics & Reports')
  .addTag('telegram', 'Telegram Bot Integration')
  .build();

export const swaggerOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
  },
  customSiteTitle: 'VendHub API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
};
```

## Подключение в main.ts

```typescript
// backend/src/main.ts
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig, swaggerOptions } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger только в development/staging
  if (process.env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, swaggerOptions);

    // Export OpenAPI spec
    const fs = require('fs');
    fs.writeFileSync('./docs/api/openapi.json', JSON.stringify(document, null, 2));
  }

  await app.listen(3000);
}
```

## Decorators для Controller

```typescript
// backend/src/modules/tasks/tasks.controller.ts
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('tasks')
@ApiBearerAuth('JWT')
@Controller('tasks')
export class TasksController {
  @ApiOperation({
    summary: 'Get all tasks',
    description: 'Returns paginated list of tasks with optional filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'type', required: false, enum: TaskType })
  @ApiResponse({
    status: 200,
    description: 'List of tasks',
    type: PaginatedTasksResponse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(@Query() query: TasksQueryDto) {
    return this.tasksService.findAll(query);
  }

  @ApiOperation({ summary: 'Create new task' })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, type: TaskEntity })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }
}
```

## Decorators для DTO

```typescript
// backend/src/modules/tasks/dto/create-task.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Type of task',
    enum: TaskType,
    example: TaskType.REFILL,
  })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiProperty({
    description: 'Machine UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  machineId: string;

  @ApiPropertyOptional({
    description: 'Task description',
    maxLength: 500,
    example: 'Refill coffee beans and milk',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Items to refill/collect',
    type: [TaskItemDto],
    required: false,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TaskItemDto)
  items?: TaskItemDto[];
}
```

## Response Schemas

```typescript
// backend/src/common/dto/paginated-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class PaginatedResponse<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;
}

// Конкретная реализация
export class PaginatedTasksResponse extends PaginatedResponse<TaskEntity> {
  @ApiProperty({ type: [TaskEntity] })
  data: TaskEntity[];
}
```

## Entity Schemas

```typescript
// backend/src/modules/tasks/entities/task.entity.ts
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';

@Entity('tasks')
export class TaskEntity {
  @ApiProperty({
    description: 'Unique task identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ enum: TaskType, example: TaskType.REFILL })
  @Column({ type: 'enum', enum: TaskType })
  type: TaskType;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.PENDING })
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @ApiProperty({ example: '2025-02-01T10:00:00Z' })
  @CreateDateColumn()
  createdAt: Date;

  // Скрыть от документации
  @ApiHideProperty()
  @Column({ select: false })
  internalNotes: string;
}
```

## Export OpenAPI Spec

```bash
# Получить JSON
curl http://localhost:3000/api/docs-json > openapi.json

# Получить YAML
curl http://localhost:3000/api/docs-yaml > openapi.yaml

# Генерация клиента
npx openapi-generator-cli generate \
  -i openapi.json \
  -g typescript-axios \
  -o ./generated/api-client
```
