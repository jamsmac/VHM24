import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { RedisCacheModule } from '@/common/cache/redis-cache.module';
import { TelegramUser } from './entities/telegram-user.entity';
import { TelegramSettings } from './entities/telegram-settings.entity';
import { TelegramMessageLog } from './entities/telegram-message-log.entity';
import { User } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';
import { TelegramBotService } from './services/telegram-bot.service';
import { TelegramUsersService } from './services/telegram-users.service';
import { TelegramSettingsService } from './services/telegram-settings.service';
import { TelegramNotificationsService } from './services/telegram-notifications.service';
import { TelegramSessionService } from './services/telegram-session.service';
import { TelegramVoiceService } from './services/telegram-voice.service';
import { TelegramResilientApiService } from './services/telegram-resilient-api.service';
import { TelegramI18nService } from './services/telegram-i18n.service';
import { TelegramQrService } from './services/telegram-qr.service';
import { TelegramLocationService } from './services/telegram-location.service';
import { TelegramQuickActionsService } from './services/telegram-quick-actions.service';
import { TelegramManagerToolsService } from './services/telegram-manager-tools.service';
import { TelegramPhotoCompressionService } from './services/telegram-photo-compression.service';
import { CartStorageService } from './services/cart-storage.service';
import { TelegramQueueProcessor } from './processors/telegram-queue.processor';
import { TelegramUsersController } from './controllers/telegram-users.controller';
import { TelegramSettingsController } from './controllers/telegram-settings.controller';
import { TelegramNotificationsController } from './controllers/telegram-notifications.controller';
import { TasksModule } from '../tasks/tasks.module';
import { FilesModule } from '../files/files.module';
import { UsersModule } from '../users/users.module';
import { MachinesModule } from '../machines/machines.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AccessRequestsModule } from '../access-requests/access-requests.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramUser, TelegramSettings, TelegramMessageLog, User, Task]),
    BullModule.registerQueue({
      name: 'telegram-messages',
    }),
    RedisCacheModule,
    TasksModule,
    FilesModule,
    UsersModule,
    MachinesModule,
    IncidentsModule,
    TransactionsModule,
    InventoryModule,
    AccessRequestsModule,
  ],
  controllers: [
    TelegramUsersController,
    TelegramSettingsController,
    TelegramNotificationsController,
  ],
  providers: [
    TelegramBotService,
    TelegramUsersService,
    TelegramSettingsService,
    TelegramNotificationsService,
    TelegramSessionService,
    TelegramVoiceService,
    TelegramResilientApiService,
    TelegramI18nService,
    TelegramQrService,
    TelegramLocationService,
    TelegramQuickActionsService,
    TelegramManagerToolsService,
    TelegramPhotoCompressionService,
    CartStorageService,
    TelegramQueueProcessor,
  ],
  exports: [
    TelegramBotService,
    TelegramUsersService,
    TelegramSettingsService,
    TelegramNotificationsService,
    TelegramSessionService,
    TelegramVoiceService,
    TelegramResilientApiService,
    TelegramI18nService,
    TelegramQrService,
    TelegramLocationService,
    TelegramQuickActionsService,
    TelegramManagerToolsService,
    TelegramPhotoCompressionService,
    CartStorageService,
  ],
})
export class TelegramModule {}
