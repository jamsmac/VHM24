import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bull';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [
    TerminusModule,
    BullModule.registerQueue({ name: 'commission-calculations' }, { name: 'sales-import' }),
  ],
  controllers: [HealthController, MetricsController],
})
export class HealthModule {}
