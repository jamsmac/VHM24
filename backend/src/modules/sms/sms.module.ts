import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmsService } from './sms.service';

/**
 * SMS Module
 *
 * Provides SMS messaging functionality using Twilio.
 * Exports SmsService for use in other modules (e.g., NotificationsModule).
 */
@Module({
  imports: [ConfigModule],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
