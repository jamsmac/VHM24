import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Reflector } from '@nestjs/core';
import { MachinesService } from './machines.service';
import { MachinesController } from './machines.controller';
import { QrCodeService } from './qr-code.service';
import { WriteoffProcessor } from './processors/writeoff.processor';
import { Machine } from './entities/machine.entity';
import { MachineLocationHistory } from './entities/machine-location-history.entity';
import { TransactionsModule } from '../transactions/transactions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit-logs/audit-log.module';
import { UsersModule } from '../users/users.module';
import { RedisCacheModule } from '@/common/cache/redis-cache.module';
import { ReportsCacheInterceptor } from '@modules/reports/interceptors/cache.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Machine, MachineLocationHistory]),
    BullModule.registerQueue({
      name: 'machine-writeoff',
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs for debugging
      },
    }),
    RedisCacheModule,
    forwardRef(() => TransactionsModule),
    NotificationsModule,
    AuditLogModule,
    UsersModule,
  ],
  controllers: [MachinesController],
  providers: [MachinesService, QrCodeService, WriteoffProcessor, ReportsCacheInterceptor, Reflector],
  exports: [MachinesService, QrCodeService],
})
export class MachinesModule {}
