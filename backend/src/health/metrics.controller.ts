import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { register } from 'prom-client';

/**
 * Metrics Controller
 *
 * Exposes Prometheus-compatible metrics for monitoring
 * Combines prom-client default metrics with custom business metrics
 */
@ApiTags('Metrics')
@Controller('metrics')
@SkipThrottle()
export class MetricsController {
  constructor(
    @InjectQueue('commission-calculations')
    private commissionQueue: Queue,
    @InjectQueue('sales-import')
    private salesImportQueue: Queue,
    @InjectConnection()
    private connection: Connection,
  ) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  async getMetrics(): Promise<string> {
    const metrics: string[] = [];

    // Get default metrics from prom-client registry (from MonitoringModule)
    try {
      const promMetrics = await register.metrics();
      metrics.push(promMetrics);
    } catch {
      // Registry might not be initialized
    }

    // Additional custom metrics below
    // Process metrics
    metrics.push('# HELP vendhub_process_uptime_seconds Process uptime in seconds');
    metrics.push('# TYPE vendhub_process_uptime_seconds gauge');
    metrics.push(`vendhub_process_uptime_seconds ${process.uptime()}`);

    metrics.push('# HELP process_memory_bytes Process memory usage in bytes');
    metrics.push('# TYPE process_memory_bytes gauge');
    const memUsage = process.memoryUsage();
    metrics.push(`process_memory_bytes{type="rss"} ${memUsage.rss}`);
    metrics.push(`process_memory_bytes{type="heapTotal"} ${memUsage.heapTotal}`);
    metrics.push(`process_memory_bytes{type="heapUsed"} ${memUsage.heapUsed}`);
    metrics.push(`process_memory_bytes{type="external"} ${memUsage.external}`);

    // Database metrics
    try {
      const dbResult = await this.connection.query(
        'SELECT count(*) as count FROM pg_stat_activity WHERE state = $1',
        ['active'],
      );
      const activeConnections = parseInt(dbResult[0]?.count || '0');

      metrics.push('# HELP database_connections_active Active database connections');
      metrics.push('# TYPE database_connections_active gauge');
      metrics.push(`database_connections_active ${activeConnections}`);
    } catch {
      // Database might be down, skip metrics
    }

    // Queue metrics
    try {
      const [commissionCounts, salesCounts] = await Promise.all([
        this.commissionQueue.getJobCounts(),
        this.salesImportQueue.getJobCounts(),
      ]);

      // Commission queue metrics
      metrics.push('# HELP bullmq_queue_waiting Jobs waiting in queue');
      metrics.push('# TYPE bullmq_queue_waiting gauge');
      metrics.push(
        `bullmq_queue_waiting{queue="commission-calculations"} ${commissionCounts.waiting}`,
      );
      metrics.push(`bullmq_queue_waiting{queue="sales-import"} ${salesCounts.waiting}`);

      metrics.push('# HELP bullmq_queue_active Jobs currently being processed');
      metrics.push('# TYPE bullmq_queue_active gauge');
      metrics.push(
        `bullmq_queue_active{queue="commission-calculations"} ${commissionCounts.active}`,
      );
      metrics.push(`bullmq_queue_active{queue="sales-import"} ${salesCounts.active}`);

      metrics.push('# HELP bullmq_queue_completed Total completed jobs');
      metrics.push('# TYPE bullmq_queue_completed counter');
      metrics.push(
        `bullmq_queue_completed{queue="commission-calculations"} ${commissionCounts.completed}`,
      );
      metrics.push(`bullmq_queue_completed{queue="sales-import"} ${salesCounts.completed}`);

      metrics.push('# HELP bullmq_queue_failed Total failed jobs');
      metrics.push('# TYPE bullmq_queue_failed counter');
      metrics.push(
        `bullmq_queue_failed{queue="commission-calculations"} ${commissionCounts.failed}`,
      );
      metrics.push(`bullmq_queue_failed{queue="sales-import"} ${salesCounts.failed}`);

      metrics.push('# HELP bullmq_queue_delayed Delayed jobs in queue');
      metrics.push('# TYPE bullmq_queue_delayed gauge');
      metrics.push(
        `bullmq_queue_delayed{queue="commission-calculations"} ${commissionCounts.delayed}`,
      );
      metrics.push(`bullmq_queue_delayed{queue="sales-import"} ${salesCounts.delayed}`);
    } catch {
      // Queue might be down, skip metrics
    }

    return metrics.join('\n') + '\n';
  }
}
