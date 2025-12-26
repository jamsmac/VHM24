import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TelegramLocationService } from './services/telegram-location.service';

import { Task } from '../../tasks/entities/task.entity';

/**
 * Telegram Location Module
 *
 * Provides location-based services for Telegram bot:
 * - GPS location processing
 * - Route optimization for nearby tasks
 * - Task geo-fencing verification
 *
 * @module TelegramLocationModule
 */
@Module({
  imports: [TypeOrmModule.forFeature([Task])],
  providers: [TelegramLocationService],
  exports: [TelegramLocationService],
})
export class TelegramLocationModule {}
