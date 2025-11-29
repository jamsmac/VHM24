import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { MachinesService } from './machines.service';
import { MachinesController } from './machines.controller';
import { QrCodeService } from './qr-code.service';
import { WriteoffProcessor } from './processors/writeoff.processor';
import { Machine } from './entities/machine.entity';
import { MachineLocationHistory } from './entities/machine-location-history.entity';
import { TransactionsModule } from '../transactions/transactions.module';

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
    forwardRef(() => TransactionsModule),
  ],
  controllers: [MachinesController],
  providers: [MachinesService, QrCodeService, WriteoffProcessor],
  exports: [MachinesService, QrCodeService],
})
export class MachinesModule {}
