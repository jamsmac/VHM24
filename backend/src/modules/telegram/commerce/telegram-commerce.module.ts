import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CartStorageService } from './services/cart-storage.service';
import { CatalogHandler } from './handlers/catalog.handler';
import { CartHandler } from './handlers/cart.handler';

import { Material } from '../../requests/entities/material.entity';
import { TelegramInfrastructureModule } from '../infrastructure/telegram-infrastructure.module';
import { TelegramNotificationsModule } from '../notifications/telegram-notifications.module';
import { UsersModule } from '../../users/users.module';
import { RequestsModule } from '../../requests/requests.module';

/**
 * Telegram Commerce Module
 *
 * Provides commerce-related services for Telegram bot:
 * - Material catalog browsing
 * - Cart management (Redis-backed, 24h TTL)
 * - Request checkout flow
 *
 * @module TelegramCommerceModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Material]),
    TelegramInfrastructureModule,
    TelegramNotificationsModule,
    UsersModule,
    RequestsModule,
  ],
  providers: [CartStorageService, CatalogHandler, CartHandler],
  exports: [CartStorageService, CatalogHandler, CartHandler],
})
export class TelegramCommerceModule {}
