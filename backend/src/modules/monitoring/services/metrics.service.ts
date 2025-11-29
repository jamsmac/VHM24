import { Injectable } from '@nestjs/common';
import {
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

/**
 * Metrics Service
 *
 * Collects and manages application metrics for Prometheus monitoring:
 * - Request metrics (count, duration, errors)
 * - Business metrics (tasks, inventory, machines)
 * - Security metrics (login attempts, auth failures)
 * - Performance metrics (database queries, cache hits)
 */
@Injectable()
export class MetricsService {
  // Request Metrics
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestTotal: Counter<string>;
  private readonly httpRequestErrors: Counter<string>;

  // Business Metrics
  private readonly tasksTotal: Counter<string>;
  private readonly tasksCompleted: Counter<string>;
  private readonly tasksDuration: Histogram<string>;
  private readonly inventoryMovements: Counter<string>;
  private readonly machinesActive: Gauge<string>;
  private readonly machinesOffline: Gauge<string>;

  // Security Metrics
  private readonly loginAttempts: Counter<string>;
  private readonly loginFailures: Counter<string>;
  private readonly twoFactorAuthentications: Counter<string>;
  private readonly sessionCreations: Counter<string>;
  private readonly auditLogEvents: Counter<string>;

  // Performance Metrics
  private readonly databaseQueryDuration: Histogram<string>;
  private readonly cacheHits: Counter<string>;
  private readonly cacheMisses: Counter<string>;
  private readonly queueJobsProcessed: Counter<string>;
  private readonly queueJobsFailed: Counter<string>;

  constructor() {
    // Initialize Request Metrics
    this.httpRequestDuration = new Histogram({
      name: 'vendhub_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.httpRequestTotal = new Counter({
      name: 'vendhub_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.httpRequestErrors = new Counter({
      name: 'vendhub_http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'status'],
    });

    // Initialize Business Metrics
    this.tasksTotal = new Counter({
      name: 'vendhub_tasks_created_total',
      help: 'Total number of tasks created',
      labelNames: ['type', 'priority'],
    });

    this.tasksCompleted = new Counter({
      name: 'vendhub_tasks_completed_total',
      help: 'Total number of tasks completed',
      labelNames: ['type', 'status'],
    });

    this.tasksDuration = new Histogram({
      name: 'vendhub_task_duration_seconds',
      help: 'Duration of task completion in seconds',
      labelNames: ['type'],
      buckets: [300, 600, 1800, 3600, 7200], // 5min, 10min, 30min, 1hr, 2hr
    });

    this.inventoryMovements = new Counter({
      name: 'vendhub_inventory_movements_total',
      help: 'Total number of inventory movements',
      labelNames: ['type', 'direction'],
    });

    this.machinesActive = new Gauge({
      name: 'vendhub_machines_active',
      help: 'Number of active machines',
      labelNames: ['status'],
    });

    this.machinesOffline = new Gauge({
      name: 'vendhub_machines_offline',
      help: 'Number of offline machines',
      labelNames: ['reason'],
    });

    // Initialize Security Metrics
    this.loginAttempts = new Counter({
      name: 'vendhub_login_attempts_total',
      help: 'Total number of login attempts',
      labelNames: ['result'],
    });

    this.loginFailures = new Counter({
      name: 'vendhub_login_failures_total',
      help: 'Total number of failed login attempts',
      labelNames: ['reason'],
    });

    this.twoFactorAuthentications = new Counter({
      name: 'vendhub_2fa_authentications_total',
      help: 'Total number of 2FA authentications',
      labelNames: ['method', 'result'],
    });

    this.sessionCreations = new Counter({
      name: 'vendhub_sessions_created_total',
      help: 'Total number of sessions created',
      labelNames: ['type'],
    });

    this.auditLogEvents = new Counter({
      name: 'vendhub_audit_log_events_total',
      help: 'Total number of audit log events',
      labelNames: ['action', 'entity_type'],
    });

    // Initialize Performance Metrics
    this.databaseQueryDuration = new Histogram({
      name: 'vendhub_database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1],
    });

    this.cacheHits = new Counter({
      name: 'vendhub_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type'],
    });

    this.cacheMisses = new Counter({
      name: 'vendhub_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type'],
    });

    this.queueJobsProcessed = new Counter({
      name: 'vendhub_queue_jobs_processed_total',
      help: 'Total number of queue jobs processed',
      labelNames: ['queue', 'job_type', 'status'],
    });

    this.queueJobsFailed = new Counter({
      name: 'vendhub_queue_jobs_failed_total',
      help: 'Total number of queue jobs failed',
      labelNames: ['queue', 'job_type', 'reason'],
    });
  }

  // Request Metrics Methods
  recordHttpRequest(method: string, route: string, status: number, duration: number): void {
    const labels = { method, route, status: status.toString() };
    this.httpRequestTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration);

    if (status >= 400) {
      this.httpRequestErrors.inc(labels);
    }
  }

  // Business Metrics Methods
  recordTaskCreated(type: string, priority: string): void {
    this.tasksTotal.inc({ type, priority });
  }

  recordTaskCompleted(type: string, status: string, duration?: number): void {
    this.tasksCompleted.inc({ type, status });
    if (duration) {
      this.tasksDuration.observe({ type }, duration);
    }
  }

  recordInventoryMovement(type: string, direction: string): void {
    this.inventoryMovements.inc({ type, direction });
  }

  updateMachineStatus(
    active: number,
    offline: number,
    offlineReasons: Record<string, number>,
  ): void {
    this.machinesActive.set({ status: 'active' }, active);
    this.machinesOffline.set({ reason: 'total' }, offline);

    Object.entries(offlineReasons).forEach(([reason, count]) => {
      this.machinesOffline.set({ reason }, count);
    });
  }

  // Security Metrics Methods
  recordLoginAttempt(result: 'success' | 'failure'): void {
    this.loginAttempts.inc({ result });
  }

  recordLoginFailure(reason: string): void {
    this.loginFailures.inc({ reason });
  }

  record2FAAuthentication(method: string, result: 'success' | 'failure'): void {
    this.twoFactorAuthentications.inc({ method, result });
  }

  recordSessionCreation(type: string): void {
    this.sessionCreations.inc({ type });
  }

  recordAuditLogEvent(action: string, entityType: string): void {
    this.auditLogEvents.inc({ action, entity_type: entityType });
  }

  // Performance Metrics Methods
  recordDatabaseQuery(operation: string, table: string, duration: number): void {
    this.databaseQueryDuration.observe({ operation, table }, duration);
  }

  recordCacheHit(cacheType: string): void {
    this.cacheHits.inc({ cache_type: cacheType });
  }

  recordCacheMiss(cacheType: string): void {
    this.cacheMisses.inc({ cache_type: cacheType });
  }

  recordQueueJob(
    queue: string,
    jobType: string,
    status: 'completed' | 'failed',
    reason?: string,
  ): void {
    if (status === 'completed') {
      this.queueJobsProcessed.inc({ queue, job_type: jobType, status });
    } else {
      this.queueJobsFailed.inc({ queue, job_type: jobType, reason: reason || 'unknown' });
    }
  }

  // Utility Methods
  async collectBusinessMetrics(): Promise<void> {
    // This method would be called periodically to update business metrics
    // Implementation would query the database and update gauges
    // Example:
    // const machineStats = await this.machineRepository.getMachineStatusCounts();
    // this.updateMachineStatus(machineStats.active, machineStats.offline, machineStats.offlineReasons);
  }
}
