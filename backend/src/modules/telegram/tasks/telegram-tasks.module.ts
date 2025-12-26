import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TelegramTaskHandler } from './handlers/telegram-task.handler';
import { TelegramMessageLog } from '../shared/entities/telegram-message-log.entity';

import { TelegramInfrastructureModule } from '../infrastructure/telegram-infrastructure.module';
import { TelegramUiModule } from '../ui/telegram-ui.module';
import { TasksModule } from '../../tasks/tasks.module';
import { UsersModule } from '../../users/users.module';

/**
 * Telegram Tasks Module
 *
 * Provides task-related handlers for Telegram bot:
 * - Task list display
 * - Task start/complete commands
 * - Step-by-step task execution
 * - Checklist progress tracking
 *
 * @module TelegramTasksModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramMessageLog]),
    TelegramInfrastructureModule,
    TelegramUiModule,
    forwardRef(() => TasksModule),
    UsersModule,
  ],
  providers: [TelegramTaskHandler],
  exports: [TelegramTaskHandler],
})
export class TelegramTasksModule {}
