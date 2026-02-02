import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { RedisCacheModule } from '@/common/cache/redis-cache.module';

// Shared entities
import { TelegramUser } from './shared/entities/telegram-user.entity';
import { TelegramSettings } from './shared/entities/telegram-settings.entity';
import { TelegramMessageLog } from './shared/entities/telegram-message-log.entity';
import { TelegramBotAnalytics } from './shared/entities/telegram-bot-analytics.entity';
import { User } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';
import { Material } from '../requests/entities/material.entity';

// Submodule imports
import { TelegramCoreModule } from './core/telegram-core.module';
import { TelegramInfrastructureModule } from './infrastructure/telegram-infrastructure.module';
import { TelegramUsersModule } from './users/telegram-users.module';
import { TelegramUiModule } from './ui/telegram-ui.module';
import { TelegramMediaModule } from './media/telegram-media.module';
import { TelegramLocationModule } from './location/telegram-location.module';
import { TelegramI18nModule } from './i18n/telegram-i18n.module';
import { TelegramTasksModule } from './tasks/telegram-tasks.module';
import { TelegramManagersModule } from './managers/telegram-managers.module';
import { TelegramQuickActionsModule } from './quick-actions/telegram-quick-actions.module';
import { TelegramNotificationsModule } from './notifications/telegram-notifications.module';
import { TelegramCommerceModule } from './commerce/telegram-commerce.module';

// Controllers (from users submodule, re-exported)
import { TelegramUsersController } from './users/controllers/telegram-users.controller';
import { TelegramSettingsController } from './users/controllers/telegram-settings.controller';

// External modules
import { TasksModule } from '../tasks/tasks.module';
import { FilesModule } from '../files/files.module';
import { UsersModule } from '../users/users.module';
import { MachinesModule } from '../machines/machines.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AccessRequestsModule } from '../access-requests/access-requests.module';
import { RequestsModule } from '../requests/requests.module';

/**
 * Telegram Module
 *
 * Main module for Telegram bot functionality.
 * Composed of submodules:
 * - infrastructure/ - Session management, queue processing, resilient API
 * - users/ - User management, settings
 * - ui/ - Keyboard and message handlers
 * - media/ - Voice, QR, photo compression
 * - location/ - GPS location services
 * - i18n/ - Internationalization
 * - commerce/ - Cart, catalog, checkout
 * - tasks/ - Task command handlers
 * - managers/ - Manager tools and analytics
 * - quick-actions/ - One-tap shortcuts for operators
 * - notifications/ - Notification sending service
 * - core/ - Main TelegramBotService
 *
 * @module TelegramModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TelegramUser,
      TelegramSettings,
      TelegramMessageLog,
      TelegramBotAnalytics,
      User,
      Task,
      Material,
    ]),
    BullModule.registerQueue({
      name: 'telegram-messages',
    }),
    RedisCacheModule,
    // Submodules
    TelegramCoreModule,
    TelegramInfrastructureModule,
    TelegramUsersModule,
    TelegramUiModule,
    TelegramMediaModule,
    TelegramLocationModule,
    TelegramI18nModule,
    TelegramTasksModule,
    TelegramManagersModule,
    TelegramQuickActionsModule,
    // Notifications and Commerce as proper module imports (not manual providers)
    TelegramNotificationsModule,
    TelegramCommerceModule,
    // External modules
    forwardRef(() => TasksModule),
    FilesModule,
    UsersModule,
    forwardRef(() => MachinesModule),
    forwardRef(() => IncidentsModule),
    forwardRef(() => TransactionsModule),
    forwardRef(() => InventoryModule),
    AccessRequestsModule,
    RequestsModule,
  ],
  controllers: [
    TelegramUsersController,
    TelegramSettingsController,
    // TelegramNotificationsController is registered in TelegramNotificationsModule
  ],
  providers: [
    // All services come from proper submodule imports
  ],
  exports: [
    // Re-export submodules (makes their exported services available)
    TelegramCoreModule,
    TelegramInfrastructureModule,
    TelegramUsersModule,
    TelegramUiModule,
    TelegramMediaModule,
    TelegramLocationModule,
    TelegramI18nModule,
    TelegramTasksModule,
    TelegramManagersModule,
    TelegramQuickActionsModule,
    TelegramNotificationsModule,
    TelegramCommerceModule,
  ],
})
export class TelegramModule {}
