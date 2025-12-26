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

// Services from submodules (re-exported for backward compatibility)
import { TelegramBotService } from './core/services/telegram-bot.service';
import { TelegramSessionService } from './infrastructure/services/telegram-session.service';
import { TelegramResilientApiService } from './infrastructure/services/telegram-resilient-api.service';
import { TelegramQueueProcessor } from './infrastructure/processors/telegram-queue.processor';
import { TelegramUsersService } from './users/services/telegram-users.service';
import { TelegramSettingsService } from './users/services/telegram-settings.service';
import { TelegramKeyboardHandler } from './ui/handlers/telegram-keyboard.handler';
import { TelegramMessageHandler } from './ui/handlers/telegram-message.handler';
import { TelegramVoiceService } from './media/services/telegram-voice.service';
import { TelegramQrService } from './media/services/telegram-qr.service';
import { TelegramPhotoCompressionService } from './media/services/telegram-photo-compression.service';
import { TelegramLocationService } from './location/services/telegram-location.service';
import { TelegramI18nService } from './i18n/services/telegram-i18n.service';
import { TelegramTaskHandler } from './tasks/handlers/telegram-task.handler';
import { TelegramManagerToolsService } from './managers/services/telegram-manager-tools.service';
import { TelegramQuickActionsService } from './quick-actions/services/telegram-quick-actions.service';
import { TelegramNotificationsService } from './notifications/services/telegram-notifications.service';

// Commerce (uses forwardRef due to circular dependency)
import { CartStorageService } from './commerce/services/cart-storage.service';
import { CartHandler } from './commerce/handlers/cart.handler';
import { CatalogHandler } from './commerce/handlers/catalog.handler';

// Controllers (from users submodule, re-exported)
import { TelegramUsersController } from './users/controllers/telegram-users.controller';
import { TelegramSettingsController } from './users/controllers/telegram-settings.controller';
import { TelegramNotificationsController } from './notifications/controllers/telegram-notifications.controller';

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
    TelegramNotificationsController,
  ],
  providers: [
    // Notifications service (from notifications submodule, provided here for TelegramBotService dependency)
    TelegramNotificationsService,
    // Commerce handlers
    CartStorageService,
    CartHandler,
    CatalogHandler,
  ],
  exports: [
    // Main services
    TelegramBotService,
    TelegramNotificationsService,
    TelegramQuickActionsService,
    TelegramManagerToolsService,
    TelegramTaskHandler,
    // Re-export from infrastructure
    TelegramSessionService,
    TelegramResilientApiService,
    TelegramQueueProcessor,
    // Re-export from users
    TelegramUsersService,
    TelegramSettingsService,
    // Re-export from ui
    TelegramKeyboardHandler,
    TelegramMessageHandler,
    // Re-export from media
    TelegramVoiceService,
    TelegramQrService,
    TelegramPhotoCompressionService,
    // Re-export from location
    TelegramLocationService,
    // Re-export from i18n
    TelegramI18nService,
    // Re-export from commerce
    CartStorageService,
  ],
})
export class TelegramModule {}
