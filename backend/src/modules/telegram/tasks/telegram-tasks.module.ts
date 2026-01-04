import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { TelegramTaskHandler } from './handlers/telegram-task.handler';
import { TelegramWorkflowService } from './services/telegram-workflow.service';
import { TelegramMessageLog } from '../shared/entities/telegram-message-log.entity';

import { TelegramInfrastructureModule } from '../infrastructure/telegram-infrastructure.module';
import { TelegramNotificationsModule } from '../notifications/telegram-notifications.module';
import { TelegramUiModule } from '../ui/telegram-ui.module';
import { TasksModule } from '../../tasks/tasks.module';
import { UsersModule } from '../../users/users.module';
import { MachinesModule } from '../../machines/machines.module';

/**
 * Telegram Tasks Module
 *
 * Provides task-related handlers for Telegram bot:
 * - Task list display
 * - Task start/complete commands
 * - Step-by-step task execution
 * - Checklist progress tracking
 * - Automated workflows (reminders, briefings)
 *
 * @module TelegramTasksModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramMessageLog]),
    ScheduleModule.forRoot(),
    TelegramInfrastructureModule,
    TelegramNotificationsModule,
    TelegramUiModule,
    forwardRef(() => TasksModule),
    UsersModule,
    forwardRef(() => MachinesModule),
  ],
  providers: [TelegramTaskHandler, TelegramWorkflowService],
  exports: [TelegramTaskHandler, TelegramWorkflowService],
})
export class TelegramTasksModule {}
