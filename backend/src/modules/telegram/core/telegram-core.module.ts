import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { TelegramBotService } from './services/telegram-bot.service';
import { TelegramCommandHandlerService } from './services/telegram-command-handler.service';
import { TelegramCallbackHandlerService } from './services/telegram-callback-handler.service';
import { TelegramTaskCallbackService } from './services/telegram-task-callback.service';
import { TelegramAdminCallbackService } from './services/telegram-admin-callback.service';
import { TelegramSprint3Service } from './services/telegram-sprint3.service';
import { TelegramTaskOperationsService } from './services/telegram-task-operations.service';
import { TelegramDataCommandsService } from './services/telegram-data-commands.service';
import { TelegramNlpService } from './services/telegram-nlp.service';
import { TelegramUIService } from './services/telegram-ui.service';
import { TelegramUtilitiesService } from './services/telegram-utilities.service';

// Shared entities
import { TelegramUser } from '../shared/entities/telegram-user.entity';
import { TelegramSettings } from '../shared/entities/telegram-settings.entity';
import { TelegramMessageLog } from '../shared/entities/telegram-message-log.entity';

// Submodule imports
import { TelegramInfrastructureModule } from '../infrastructure/telegram-infrastructure.module';
import { TelegramMediaModule } from '../media/telegram-media.module';
import { TelegramManagersModule } from '../managers/telegram-managers.module';
import { TelegramUiModule } from '../ui/telegram-ui.module';
import { TelegramCommerceModule } from '../commerce/telegram-commerce.module';

// External modules
import { TasksModule } from '../../tasks/tasks.module';
import { FilesModule } from '../../files/files.module';
import { UsersModule } from '../../users/users.module';
import { MachinesModule } from '../../machines/machines.module';
import { IncidentsModule } from '../../incidents/incidents.module';
import { TransactionsModule } from '../../transactions/transactions.module';
import { InventoryModule } from '../../inventory/inventory.module';
import { AccessRequestsModule } from '../../access-requests/access-requests.module';
import { AuditLogModule } from '../../audit-logs/audit-log.module';

/**
 * Telegram Core Module
 *
 * Core module containing the main TelegramBotService.
 * This is the central orchestrator for all Telegram bot functionality.
 *
 * Dependencies:
 * - TelegramInfrastructureModule: Session management
 * - TelegramMediaModule: Voice and photo handling
 * - TelegramManagersModule: Manager tools
 * - External modules: Tasks, Files, Users, Machines, etc.
 *
 * @module TelegramCoreModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TelegramUser,
      TelegramSettings,
      TelegramMessageLog,
    ]),
    BullModule.registerQueue({
      name: 'telegram-messages',
    }),
    // Submodules
    TelegramInfrastructureModule,
    TelegramMediaModule,
    TelegramManagersModule,
    TelegramUiModule,
    // Commerce module provides TelegramSalesService needed by TelegramBotService
    // forwardRef needed: TelegramCommerceModule → TelegramNotificationsModule → TelegramCoreModule
    forwardRef(() => TelegramCommerceModule),
    // External modules with forwardRef for circular dependencies
    forwardRef(() => TasksModule),
    FilesModule,
    UsersModule,
    forwardRef(() => MachinesModule),
    forwardRef(() => IncidentsModule),
    forwardRef(() => TransactionsModule),
    forwardRef(() => InventoryModule),
    AccessRequestsModule,
    AuditLogModule,
  ],
  providers: [
    TelegramBotService,
    TelegramCommandHandlerService,
    TelegramCallbackHandlerService,
    TelegramTaskCallbackService,
    TelegramAdminCallbackService,
    TelegramSprint3Service,
    TelegramTaskOperationsService,
    TelegramDataCommandsService,
    TelegramNlpService,
    TelegramUIService,
    TelegramUtilitiesService,
  ],
  exports: [
    TelegramBotService,
    TelegramCommandHandlerService,
    TelegramCallbackHandlerService,
    TelegramTaskCallbackService,
    TelegramAdminCallbackService,
    TelegramSprint3Service,
    TelegramTaskOperationsService,
    TelegramDataCommandsService,
    TelegramNlpService,
    TelegramUIService,
    TelegramUtilitiesService,
  ],
})
export class TelegramCoreModule {}
