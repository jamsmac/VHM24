import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { EmailModule } from '../email/email.module';
import { TelegramModule } from '../telegram/telegram.module';
import { WebPushModule } from '../web-push/web-push.module';
import { FcmModule } from '../fcm/fcm.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreference]),
    EmailModule,
    forwardRef(() => TelegramModule),
    WebPushModule,
    FcmModule,
    SmsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
