import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsRealtimeController } from './controllers/analytics.controller';
import { AnalyticsCalculationService } from './services/analytics-calculation.service';
import { AnalyticsListener } from './analytics.listener';
import { DailyStats } from './entities/daily-stats.entity';
import { AnalyticsSnapshot } from './entities/analytics-snapshot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DailyStats, AnalyticsSnapshot])],
  controllers: [AnalyticsController, AnalyticsRealtimeController],
  providers: [AnalyticsService, AnalyticsCalculationService, AnalyticsListener],
  exports: [AnalyticsService, AnalyticsCalculationService],
})
export class AnalyticsModule {}
