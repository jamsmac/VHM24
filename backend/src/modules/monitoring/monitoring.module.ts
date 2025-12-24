import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './services/metrics.service';
import { MetricsController } from './controllers/metrics.controller';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

/**
 * Monitoring Module
 *
 * Provides application monitoring capabilities:
 * - Prometheus metrics collection
 * - Performance tracking
 * - Request/response metrics
 * - Business metrics (inventory, tasks, machines)
 * - Health status metrics
 */
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'vendhub_',
        },
      },
      // Path set to null to disable built-in controller - using custom one in HealthModule
      path: null as unknown as string,
      defaultLabels: {
        app: 'vendhub',
        env: process.env.NODE_ENV || 'development',
      },
    }),
  ],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
  exports: [MetricsService],
})
export class MonitoringModule {}
