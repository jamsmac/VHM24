import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebPushService } from './web-push.service';
import { WebPushController } from './web-push.controller';
import { PushSubscription } from './entities/push-subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription]), ConfigModule],
  controllers: [WebPushController],
  providers: [WebPushService],
  exports: [WebPushService],
})
export class WebPushModule {}
