# Input Validation для VendHub

## Установка

```bash
npm install class-validator class-transformer
npm install sanitize-html
```

## Global Validation Pipe

```typescript
// backend/src/main.ts
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      // Удалять свойства, которых нет в DTO
      whitelist: true,

      // Выбрасывать ошибку если есть неизвестные свойства
      forbidNonWhitelisted: true,

      // Автоматически преобразовывать типы
      transform: true,

      // Опции трансформации
      transformOptions: {
        enableImplicitConversion: true,
      },

      // Отключить детальные сообщения в production
      disableErrorMessages: process.env.NODE_ENV === 'production',

      // Валидировать вложенные объекты
      validateCustomDecorators: true,
    }),
  );

  await app.listen(3000);
}
```

## DTO Validation Patterns

### Базовый DTO

```typescript
// backend/src/modules/tasks/dto/create-task.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsUUID,
  IsOptional,
  MaxLength,
  MinLength,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TaskType, TaskPriority } from '../enums';

export class CreateTaskDto {
  @IsEnum(TaskType)
  @IsNotEmpty()
  type: TaskType;

  @IsUUID()
  @IsNotEmpty()
  machineId: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Transform(({ value }) => sanitizeHtml(value)) // XSS protection
  description?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority = TaskPriority.NORMAL;

  @IsArray()
  @IsOptional()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TaskItemDto)
  items?: TaskItemDto[];
}
```

### Вложенный DTO

```typescript
// backend/src/modules/tasks/dto/task-item.dto.ts
import { IsUUID, IsInt, Min, Max } from 'class-validator';

export class TaskItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  quantity: number;
}
```

### Query Parameters DTO

```typescript
// backend/src/common/dto/pagination.dto.ts
import { IsInt, Min, Max, IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
```

## Custom Validators

### UUID Array Validator

```typescript
// backend/src/common/validators/is-uuid-array.validator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { validate as isUUID } from 'uuid';

@ValidatorConstraint({ name: 'isUuidArray', async: false })
export class IsUuidArrayConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (!Array.isArray(value)) return false;
    return value.every((item) => isUUID(item));
  }

  defaultMessage(): string {
    return 'Each value in array must be a valid UUID';
  }
}

export function IsUuidArray(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: IsUuidArrayConstraint,
    });
  };
}

// Использование
@IsUuidArray()
machineIds: string[];
```

### Phone Number Validator (Uzbekistan)

```typescript
// backend/src/common/validators/is-uzbek-phone.validator.ts
@ValidatorConstraint({ name: 'isUzbekPhone', async: false })
export class IsUzbekPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    // +998 XX XXX XX XX
    const phoneRegex = /^\+998[0-9]{9}$/;
    return phoneRegex.test(value?.replace(/\s/g, ''));
  }

  defaultMessage(): string {
    return 'Phone number must be in format +998XXXXXXXXX';
  }
}

export function IsUzbekPhone(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: IsUzbekPhoneConstraint,
    });
  };
}
```

## Sanitization

### HTML Sanitizer

```typescript
// backend/src/common/transformers/sanitize.transformer.ts
import * as sanitizeHtml from 'sanitize-html';
import { Transform } from 'class-transformer';

// Строгая санитизация (удалить все HTML)
export function SanitizeStrict() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    });
  });
}

// Разрешить базовое форматирование
export function SanitizeBasic() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return sanitizeHtml(value, {
      allowedTags: ['b', 'i', 'em', 'strong', 'br'],
      allowedAttributes: {},
    });
  });
}

// Использование в DTO
export class CreateCommentDto {
  @IsString()
  @SanitizeStrict()
  title: string;

  @IsString()
  @SanitizeBasic()
  content: string;
}
```

### Trim and Normalize

```typescript
// backend/src/common/transformers/normalize.transformer.ts
import { Transform } from 'class-transformer';

// Удалить пробелы по краям
export function Trim() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  });
}

// Привести к lowercase
export function ToLowerCase() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.toLowerCase();
  });
}

// Нормализовать email
export function NormalizeEmail() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim().toLowerCase();
  });
}

// Использование
export class LoginDto {
  @IsEmail()
  @NormalizeEmail()
  email: string;

  @IsString()
  @Trim()
  password: string;
}
```

## SQL Injection Prevention

TypeORM автоматически защищает от SQL injection при использовании параметризованных запросов:

```typescript
// ✅ Безопасно (параметризованный запрос)
const user = await this.userRepository.findOne({
  where: { email },
});

// ✅ Безопасно (query builder с параметрами)
const tasks = await this.taskRepository
  .createQueryBuilder('task')
  .where('task.machineId = :machineId', { machineId })
  .andWhere('task.status = :status', { status })
  .getMany();

// ❌ ОПАСНО (конкатенация строк)
// НИКОГДА так не делать!
const result = await this.dataSource.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

## Error Messages

```typescript
// Кастомные сообщения об ошибках
export class CreateUserDto {
  @IsEmail({}, { message: 'Некорректный email адрес' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @Matches(/[A-Z]/, { message: 'Пароль должен содержать заглавную букву' })
  @Matches(/[0-9]/, { message: 'Пароль должен содержать цифру' })
  password: string;
}
```

## Exception Filter для валидации

```typescript
// backend/src/common/filters/validation-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse() as any;

    response.status(status).json({
      statusCode: status,
      error: 'Validation Error',
      message: 'Некорректные данные запроса',
      details: Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message
        : [exceptionResponse.message],
      timestamp: new Date().toISOString(),
    });
  }
}
```
