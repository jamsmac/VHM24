import { Module, forwardRef } from '@nestjs/common';

import { TelegramVoiceService } from './services/telegram-voice.service';
import { TelegramQrService } from './services/telegram-qr.service';
import { TelegramPhotoCompressionService } from './services/telegram-photo-compression.service';
import { TelegramLocationService } from './services/telegram-location.service';

import { TelegramInfrastructureModule } from '../infrastructure/telegram-infrastructure.module';
import { TasksModule } from '../../tasks/tasks.module';
import { UsersModule } from '../../users/users.module';
import { MachinesModule } from '../../machines/machines.module';
import { LocationsModule } from '../../locations/locations.module';

/**
 * Telegram Media Module
 *
 * Provides media processing services for Telegram bot:
 * - Voice message transcription (OpenAI Whisper)
 * - QR code detection and parsing
 * - Photo compression for bandwidth optimization
 * - Location-based task discovery
 *
 * @module TelegramMediaModule
 */
@Module({
  imports: [
    TelegramInfrastructureModule,
    forwardRef(() => TasksModule),
    UsersModule,
    forwardRef(() => MachinesModule),
    forwardRef(() => LocationsModule),
  ],
  providers: [
    TelegramVoiceService,
    TelegramQrService,
    TelegramPhotoCompressionService,
    TelegramLocationService,
  ],
  exports: [
    TelegramVoiceService,
    TelegramQrService,
    TelegramPhotoCompressionService,
    TelegramLocationService,
  ],
})
export class TelegramMediaModule {}
