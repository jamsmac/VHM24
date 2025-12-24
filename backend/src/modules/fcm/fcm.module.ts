import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FcmService } from './fcm.service';
import { FcmController } from './fcm.controller';
import { FcmToken } from './entities/fcm-token.entity';
import { UsersModule } from '@/modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FcmToken]),
    ConfigModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [FcmController],
  providers: [FcmService],
  exports: [FcmService],
})
export class FcmModule {}
