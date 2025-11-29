import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsListener } from './analytics.listener';
import { DailyStats } from './entities/daily-stats.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DailyStats])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsListener],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
