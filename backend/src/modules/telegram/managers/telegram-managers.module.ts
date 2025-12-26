import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TelegramManagerToolsService } from './services/telegram-manager-tools.service';
import { TelegramUser } from '../shared/entities/telegram-user.entity';
import { User } from '../../users/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';

import { TelegramInfrastructureModule } from '../infrastructure/telegram-infrastructure.module';
import { TelegramI18nModule } from '../i18n/telegram-i18n.module';
import { TasksModule } from '../../tasks/tasks.module';
import { UsersModule } from '../../users/users.module';
import { FilesModule } from '../../files/files.module';

/**
 * Telegram Managers Module
 *
 * Provides management tools for supervisors and admins via Telegram:
 * - Task assignment to operators
 * - Team broadcasting
 * - Performance analytics
 * - Operator status monitoring
 * - Task approval workflows
 *
 * @module TelegramManagersModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramUser, User, Task]),
    TelegramInfrastructureModule,
    TelegramI18nModule,
    forwardRef(() => TasksModule),
    UsersModule,
    FilesModule,
  ],
  providers: [TelegramManagerToolsService],
  exports: [TelegramManagerToolsService],
})
export class TelegramManagersModule {}
