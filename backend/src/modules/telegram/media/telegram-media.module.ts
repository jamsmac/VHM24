import { Module } from '@nestjs/common';

import { TelegramVoiceService } from './services/telegram-voice.service';
import { TelegramQrService } from './services/telegram-qr.service';
import { TelegramPhotoCompressionService } from './services/telegram-photo-compression.service';

/**
 * Telegram Media Module
 *
 * Provides media processing services for Telegram bot:
 * - Voice message transcription (OpenAI Whisper)
 * - QR code detection and parsing
 * - Photo compression for bandwidth optimization
 *
 * @module TelegramMediaModule
 */
@Module({
  providers: [TelegramVoiceService, TelegramQrService, TelegramPhotoCompressionService],
  exports: [TelegramVoiceService, TelegramQrService, TelegramPhotoCompressionService],
})
export class TelegramMediaModule {}
