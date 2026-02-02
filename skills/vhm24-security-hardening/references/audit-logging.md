# Audit Logging для VendHub

## Назначение

Audit logging отслеживает все важные действия в системе:
- Кто сделал действие
- Что было сделано
- Когда это произошло
- С какими данными

## Audit Entity

```typescript
// backend/src/modules/audit/entities/audit-log.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['entityType', 'entityId'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Кто выполнил действие
  @Column({ nullable: true })
  @Index()
  userId: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  userRole: string;

  // Что было сделано
  @Column({ type: 'enum', enum: AuditAction })
  @Index()
  action: AuditAction;

  // Над чем было выполнено действие
  @Column()
  entityType: string; // 'Task', 'Machine', 'User'

  @Column({ nullable: true })
  entityId: string;

  // Детали изменений
  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, any>;

  // Метаданные
  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  correlationId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
```

## Audit Service

```typescript
// backend/src/modules/audit/audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

export interface AuditContext {
  userId?: string;
  username?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(
    action: AuditAction,
    entityType: string,
    entityId: string | null,
    context: AuditContext,
    options?: {
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      const auditLog = this.auditRepository.create({
        action,
        entityType,
        entityId,
        userId: context.userId,
        username: context.username,
        userRole: context.userRole,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        correlationId: context.correlationId,
        oldValues: this.sanitizeData(options?.oldValues),
        newValues: this.sanitizeData(options?.newValues),
        metadata: options?.metadata,
      });

      await this.auditRepository.save(auditLog);

      this.logger.log({
        message: 'Audit log created',
        action,
        entityType,
        entityId,
        userId: context.userId,
      });
    } catch (error) {
      // Не прерывать основной процесс из-за ошибки логирования
      this.logger.error({
        message: 'Failed to create audit log',
        error: error.message,
        action,
        entityType,
      });
    }
  }

  // Удаление чувствительных данных из логов
  private sanitizeData(data: Record<string, any> | undefined): Record<string, any> | null {
    if (!data) return null;

    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'cardNumber'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  // Получение логов для entity
  async getLogsForEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  // Получение логов пользователя
  async getLogsForUser(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
```

## Audit Interceptor

```typescript
// backend/src/common/interceptors/audit.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';
import { AuditAction } from '../../modules/audit/entities/audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, path, user, ip, headers, body } = request;

    // Определить action по HTTP методу
    const actionMap: Record<string, AuditAction> = {
      POST: AuditAction.CREATE,
      PUT: AuditAction.UPDATE,
      PATCH: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    };

    const action = actionMap[method];
    if (!action) return next.handle();

    // Извлечь entityType из path
    const entityType = this.extractEntityType(path);

    return next.handle().pipe(
      tap({
        next: (result) => {
          this.auditService.log(action, entityType, result?.id, {
            userId: user?.id,
            username: user?.username,
            userRole: user?.role,
            ipAddress: ip,
            userAgent: headers['user-agent'],
            correlationId: request.correlationId,
          }, {
            newValues: body,
            metadata: { responseId: result?.id },
          });
        },
      }),
    );
  }

  private extractEntityType(path: string): string {
    // /api/tasks/123 -> Task
    const match = path.match(/\/api\/(\w+)/);
    if (match) {
      const entity = match[1];
      return entity.charAt(0).toUpperCase() + entity.slice(1, -1); // tasks -> Task
    }
    return 'Unknown';
  }
}
```

## Audit Decorator

```typescript
// backend/src/common/decorators/audit.decorator.ts
import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';
import { AuditInterceptor } from '../interceptors/audit.interceptor';

export const AUDIT_METADATA = 'audit';

export interface AuditOptions {
  action?: string;
  entityType?: string;
  captureOldValues?: boolean;
}

export const Audit = (options?: AuditOptions) =>
  applyDecorators(
    SetMetadata(AUDIT_METADATA, options),
    UseInterceptors(AuditInterceptor),
  );

// Использование
@Controller('tasks')
export class TasksController {
  @Audit({ entityType: 'Task', captureOldValues: true })
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }
}
```

## Security Events Logging

```typescript
// backend/src/modules/audit/security-audit.service.ts
@Injectable()
export class SecurityAuditService {
  constructor(private readonly auditService: AuditService) {}

  async logLoginSuccess(userId: string, context: AuditContext) {
    await this.auditService.log(
      AuditAction.LOGIN,
      'User',
      userId,
      context,
      { metadata: { success: true } },
    );
  }

  async logLoginFailure(username: string, context: AuditContext, reason: string) {
    await this.auditService.log(
      AuditAction.LOGIN_FAILED,
      'User',
      null,
      { ...context, username },
      { metadata: { reason, attemptedUsername: username } },
    );
  }

  async logPasswordChange(userId: string, context: AuditContext) {
    await this.auditService.log(
      AuditAction.PASSWORD_CHANGE,
      'User',
      userId,
      context,
    );
  }

  async logPermissionChange(
    targetUserId: string,
    context: AuditContext,
    oldPermissions: string[],
    newPermissions: string[],
  ) {
    await this.auditService.log(
      AuditAction.PERMISSION_CHANGE,
      'User',
      targetUserId,
      context,
      {
        oldValues: { permissions: oldPermissions },
        newValues: { permissions: newPermissions },
      },
    );
  }
}
```

## Audit Log Retention

```typescript
// backend/src/modules/audit/audit-cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditCleanupService {
  private readonly logger = new Logger(AuditCleanupService.name);
  private readonly retentionDays = 90; // Хранить 90 дней

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldLogs() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    const result = await this.auditRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    this.logger.log({
      message: 'Audit logs cleanup completed',
      deletedCount: result.affected,
      cutoffDate: cutoffDate.toISOString(),
    });
  }
}
```

## Audit API для админов

```typescript
// backend/src/modules/audit/audit.controller.ts
@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getLogs(
    @Query() query: AuditQueryDto,
  ): Promise<PaginatedResponse<AuditLog>> {
    return this.auditService.search(query);
  }

  @Get('user/:userId')
  async getUserLogs(@Param('userId') userId: string) {
    return this.auditService.getLogsForUser(userId);
  }

  @Get('entity/:type/:id')
  async getEntityLogs(
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.auditService.getLogsForEntity(type, id);
  }

  @Get('security')
  async getSecurityLogs(@Query('days') days = 7) {
    return this.auditService.getSecurityEvents(days);
  }
}
```
