import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CartStorageService } from './services/cart-storage.service';
import { TelegramSalesService } from './services/telegram-sales.service';
import { CatalogHandler } from './handlers/catalog.handler';
import { CartHandler } from './handlers/cart.handler';

import { Material } from '../../requests/entities/material.entity';
import { TelegramInfrastructureModule } from '../infrastructure/telegram-infrastructure.module';
import { TelegramNotificationsModule } from '../notifications/telegram-notifications.module';
import { TelegramI18nModule } from '../i18n/telegram-i18n.module';
import { UsersModule } from '../../users/users.module';
import { RequestsModule } from '../../requests/requests.module';
import { MachinesModule } from '../../machines/machines.module';
import { TransactionsModule } from '../../transactions/transactions.module';

/**
 * Telegram Commerce Module
 *
 * Provides commerce-related services for Telegram bot:
 * - Material catalog browsing
 * - Cart management (Redis-backed, 24h TTL)
 * - Request checkout flow
 * - Sales entry via Telegram (/sales command)
 *
 * @module TelegramCommerceModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Material]),
    TelegramInfrastructureModule,
    TelegramNotificationsModule,
    TelegramI18nModule,
    UsersModule,
    RequestsModule,
    MachinesModule,
    TransactionsModule,
  ],
  providers: [CartStorageService, TelegramSalesService, CatalogHandler, CartHandler],
  exports: [CartStorageService, TelegramSalesService, CatalogHandler, CartHandler],
})
export class TelegramCommerceModule {}
