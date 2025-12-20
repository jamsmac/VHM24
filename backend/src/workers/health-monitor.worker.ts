/**
 * Health Monitor Worker
 *
 * This standalone worker monitors the health of:
 * - BullMQ queues (waiting, active, failed, delayed)
 * - Database connections
 * - Redis connections
 * - Application health endpoints
 *
 * It runs periodic health checks and can trigger alerts if issues are detected.
 *
 * External Alerting:
 * - Slack: Set SLACK_WEBHOOK_URL environment variable
 * - Email: Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, ALERT_EMAIL_TO
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { Queue } from 'bull';
import { Connection } from 'typeorm';
import Redis from 'ioredis';
import * as nodemailer from 'nodemailer';

const logger = new Logger('HealthMonitorWorker');

interface QueueHealth {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

interface SystemHealth {
  timestamp: string;
  queues: QueueHealth[];
  database: {
    connected: boolean;
    activeConnections: number;
  };
  redis: {
    connected: boolean;
    usedMemory: string;
  };
  status: 'healthy' | 'degraded' | 'unhealthy';
}

// Alert configuration from environment
const ALERT_CONFIG = {
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  emailEnabled:
    !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.ALERT_EMAIL_TO),
  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT || '587'),
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  alertEmailTo: process.env.ALERT_EMAIL_TO,
  alertEmailFrom: process.env.SMTP_FROM_EMAIL || 'alerts@vendhub.com',
};

// Track last alert status to prevent duplicate alerts
let lastAlertStatus: SystemHealth['status'] | null = null;
let lastAlertTime: Date | null = null;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown between alerts

/**
 * Send alert to Slack via webhook
 */
async function sendSlackAlert(health: SystemHealth): Promise<boolean> {
  if (!ALERT_CONFIG.slackWebhookUrl) {
    return false;
  }

  try {
    const statusEmoji = health.status === 'unhealthy' ? '🔴' : '🟡';
    const statusText = health.status === 'unhealthy' ? 'UNHEALTHY' : 'DEGRADED';

     
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} VendHub System Alert: ${statusText}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Database:*\n${health.database.connected ? '✅ Connected' : '❌ Disconnected'}\nConnections: ${health.database.activeConnections}`,
          },
          {
            type: 'mrkdwn',
            text: `*Redis:*\n${health.redis.connected ? '✅ Connected' : '❌ Disconnected'}\nMemory: ${health.redis.usedMemory}`,
          },
        ],
      },
    ];

    // Add queue information
    for (const queue of health.queues) {
      blocks.push({
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Queue: ${queue.name}*\nWaiting: ${queue.waiting} | Active: ${queue.active} | Failed: ${queue.failed}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${queue.paused ? '⏸️ Paused' : '▶️ Running'}`,
          },
        ],
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Timestamp: ${health.timestamp}`,
        },
      ],
    });

    const response = await fetch(ALERT_CONFIG.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });

    if (response.ok) {
      logger.log('Slack alert sent successfully');
      return true;
    } else {
      logger.error(`Slack alert failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    logger.error(`Failed to send Slack alert: ${error.message}`);
    return false;
  }
}

/**
 * Send alert via email
 */
async function sendEmailAlert(health: SystemHealth): Promise<boolean> {
  if (!ALERT_CONFIG.emailEnabled) {
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: ALERT_CONFIG.smtpHost,
      port: ALERT_CONFIG.smtpPort,
      secure: ALERT_CONFIG.smtpPort === 465,
      auth: {
        user: ALERT_CONFIG.smtpUser,
        pass: ALERT_CONFIG.smtpPassword,
      },
    });

    const statusEmoji = health.status === 'unhealthy' ? '🔴' : '🟡';
    const statusText = health.status.toUpperCase();

    const queueRows = health.queues
      .map(
        (q) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${q.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${q.waiting}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${q.active}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${q.failed}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${q.paused ? 'Paused' : 'Running'}</td>
        </tr>
      `,
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${health.status === 'unhealthy' ? '#f44336' : '#ff9800'}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { background-color: #333; color: white; padding: 10px; text-align: left; }
            .status-box { padding: 10px; margin: 10px 0; border-radius: 5px; }
            .ok { background-color: #e8f5e9; border-left: 4px solid #4CAF50; }
            .error { background-color: #ffebee; border-left: 4px solid #f44336; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statusEmoji} System Alert: ${statusText}</h1>
            </div>
            <div class="content">
              <h2>System Status</h2>

              <div class="status-box ${health.database.connected ? 'ok' : 'error'}">
                <strong>Database:</strong> ${health.database.connected ? '✅ Connected' : '❌ Disconnected'}
                <br>Active Connections: ${health.database.activeConnections}
              </div>

              <div class="status-box ${health.redis.connected ? 'ok' : 'error'}">
                <strong>Redis:</strong> ${health.redis.connected ? '✅ Connected' : '❌ Disconnected'}
                <br>Used Memory: ${health.redis.usedMemory}
              </div>

              <h3>Queue Status</h3>
              <table>
                <tr>
                  <th>Queue</th>
                  <th>Waiting</th>
                  <th>Active</th>
                  <th>Failed</th>
                  <th>Status</th>
                </tr>
                ${queueRows}
              </table>

              <p><em>Timestamp: ${health.timestamp}</em></p>
            </div>
            <div class="footer">
              <p>VendHub Manager - Health Monitor Alert</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"VendHub Alerts" <${ALERT_CONFIG.alertEmailFrom}>`,
      to: ALERT_CONFIG.alertEmailTo,
      subject: `${statusEmoji} VendHub System Alert: ${statusText}`,
      html,
      text: `VendHub System Alert: ${statusText}\n\nDatabase: ${health.database.connected ? 'Connected' : 'Disconnected'}\nRedis: ${health.redis.connected ? 'Connected' : 'Disconnected'}\n\nTimestamp: ${health.timestamp}`,
    });

    logger.log('Email alert sent successfully');
    return true;
  } catch (error) {
    logger.error(`Failed to send email alert: ${error.message}`);
    return false;
  }
}

/**
 * Send alerts to all configured external systems
 */
async function sendExternalAlerts(health: SystemHealth): Promise<void> {
  // Only send alerts for degraded or unhealthy status
  if (health.status === 'healthy') {
    // If previously alerted, send recovery notification
    if (lastAlertStatus && lastAlertStatus !== 'healthy') {
      logger.log('System recovered to healthy status');
      // Could send recovery notification here
    }
    lastAlertStatus = health.status;
    return;
  }

  // Check cooldown to prevent alert spam
  const now = new Date();
  if (
    lastAlertStatus === health.status &&
    lastAlertTime &&
    now.getTime() - lastAlertTime.getTime() < ALERT_COOLDOWN_MS
  ) {
    logger.log(
      `Skipping duplicate alert (cooldown: ${Math.round((ALERT_COOLDOWN_MS - (now.getTime() - lastAlertTime.getTime())) / 1000)}s remaining)`,
    );
    return;
  }

  logger.log(`Sending external alerts for ${health.status} status...`);

  const alertPromises: Promise<boolean>[] = [];

  // Send Slack alert
  if (ALERT_CONFIG.slackWebhookUrl) {
    alertPromises.push(sendSlackAlert(health));
  }

  // Send email alert
  if (ALERT_CONFIG.emailEnabled) {
    alertPromises.push(sendEmailAlert(health));
  }

  if (alertPromises.length === 0) {
    logger.warn(
      'No external alerting configured. Set SLACK_WEBHOOK_URL or SMTP_* environment variables.',
    );
  } else {
    const results = await Promise.allSettled(alertPromises);
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value === true,
    ).length;
    logger.log(`External alerts sent: ${successCount}/${alertPromises.length} successful`);
  }

  // Update last alert tracking
  lastAlertStatus = health.status;
  lastAlertTime = now;
}

async function bootstrap() {
  logger.log('Starting Health Monitor Worker...');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Get services
  const connection = app.get(Connection);
  const commissionQueue = app.get<Queue>('BullQueue_commission-calculations');

  // Create Redis client for health checks
  const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  });

  // Health check interval (every 30 seconds)
  const CHECK_INTERVAL = 30000;

  // Alert thresholds
  const THRESHOLDS = {
    queueWaitingWarning: 500,
    queueWaitingCritical: 1000,
    queueFailedWarning: 50,
    queueFailedCritical: 100,
    dbConnectionsWarning: 50,
    dbConnectionsCritical: 80,
  };

  /**
   * Check queue health
   */
  async function checkQueueHealth(queue: Queue): Promise<QueueHealth> {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    return {
      name: queue.name,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  /**
   * Check database health
   */
  async function checkDatabaseHealth() {
    try {
      const isConnected = connection.isConnected;

      // Get active connections count
      const result = await connection.query(
        'SELECT count(*) as count FROM pg_stat_activity WHERE state = $1',
        ['active'],
      );

      const activeConnections = parseInt(result[0]?.count || '0');

      return {
        connected: isConnected,
        activeConnections,
      };
    } catch (error) {
      logger.error(`Database health check failed: ${error.message}`);
      return {
        connected: false,
        activeConnections: 0,
      };
    }
  }

  /**
   * Check Redis health
   */
  async function checkRedisHealth() {
    try {
      const info = await redisClient.info('memory');
      const usedMemoryLine = info.split('\n').find((line) => line.startsWith('used_memory_human:'));
      const usedMemory = usedMemoryLine ? usedMemoryLine.split(':')[1].trim() : 'unknown';

      return {
        connected: true,
        usedMemory,
      };
    } catch (error) {
      logger.error(`Redis health check failed: ${error.message}`);
      return {
        connected: false,
        usedMemory: 'unknown',
      };
    }
  }

  /**
   * Determine overall system status
   */
  function determineSystemStatus(health: SystemHealth): SystemHealth['status'] {
    // Critical: Database or Redis down
    if (!health.database.connected || !health.redis.connected) {
      return 'unhealthy';
    }

    // Critical: Any queue has too many waiting or failed jobs
    const criticalQueue = health.queues.some(
      (q) =>
        q.waiting > THRESHOLDS.queueWaitingCritical || q.failed > THRESHOLDS.queueFailedCritical,
    );
    if (criticalQueue) {
      return 'unhealthy';
    }

    // Warning: High database connections or queue backlog
    const degraded =
      health.database.activeConnections > THRESHOLDS.dbConnectionsWarning ||
      health.queues.some(
        (q) =>
          q.waiting > THRESHOLDS.queueWaitingWarning || q.failed > THRESHOLDS.queueFailedWarning,
      );

    if (degraded) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Log health alerts
   */
  function logHealthAlerts(health: SystemHealth) {
    // Database alerts
    if (!health.database.connected) {
      logger.error('❌ CRITICAL: Database is disconnected!');
    } else if (health.database.activeConnections > THRESHOLDS.dbConnectionsCritical) {
      logger.error(
        `❌ CRITICAL: Database has ${health.database.activeConnections} active connections (threshold: ${THRESHOLDS.dbConnectionsCritical})`,
      );
    } else if (health.database.activeConnections > THRESHOLDS.dbConnectionsWarning) {
      logger.warn(
        `⚠️ WARNING: Database has ${health.database.activeConnections} active connections (threshold: ${THRESHOLDS.dbConnectionsWarning})`,
      );
    }

    // Redis alerts
    if (!health.redis.connected) {
      logger.error('❌ CRITICAL: Redis is disconnected!');
    }

    // Queue alerts
    health.queues.forEach((queue) => {
      if (queue.paused) {
        logger.warn(`⚠️ WARNING: Queue "${queue.name}" is paused`);
      }

      if (queue.waiting > THRESHOLDS.queueWaitingCritical) {
        logger.error(
          `❌ CRITICAL: Queue "${queue.name}" has ${queue.waiting} waiting jobs (threshold: ${THRESHOLDS.queueWaitingCritical})`,
        );
      } else if (queue.waiting > THRESHOLDS.queueWaitingWarning) {
        logger.warn(
          `⚠️ WARNING: Queue "${queue.name}" has ${queue.waiting} waiting jobs (threshold: ${THRESHOLDS.queueWaitingWarning})`,
        );
      }

      if (queue.failed > THRESHOLDS.queueFailedCritical) {
        logger.error(
          `❌ CRITICAL: Queue "${queue.name}" has ${queue.failed} failed jobs (threshold: ${THRESHOLDS.queueFailedCritical})`,
        );
      } else if (queue.failed > THRESHOLDS.queueFailedWarning) {
        logger.warn(
          `⚠️ WARNING: Queue "${queue.name}" has ${queue.failed} failed jobs (threshold: ${THRESHOLDS.queueFailedWarning})`,
        );
      }
    });
  }

  /**
   * Run periodic health check
   */
  async function runHealthCheck() {
    try {
      logger.log('Running health check...');

      const [queueHealth, databaseHealth, redisHealth] = await Promise.all([
        checkQueueHealth(commissionQueue),
        checkDatabaseHealth(),
        checkRedisHealth(),
      ]);

      const systemHealth: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [queueHealth],
        database: databaseHealth,
        redis: redisHealth,
        status: 'healthy',
      };

      // Determine overall status
      systemHealth.status = determineSystemStatus(systemHealth);

      // Log health status
      if (systemHealth.status === 'healthy') {
        logger.log('✅ System health: HEALTHY');
      } else if (systemHealth.status === 'degraded') {
        logger.warn('⚠️ System health: DEGRADED');
      } else {
        logger.error('❌ System health: UNHEALTHY');
      }

      // Log detailed metrics
      logger.log(
        `Queue: ${queueHealth.name} - Waiting: ${queueHealth.waiting}, Active: ${queueHealth.active}, Failed: ${queueHealth.failed}`,
      );
      logger.log(
        `Database: Connected: ${databaseHealth.connected}, Active Connections: ${databaseHealth.activeConnections}`,
      );
      logger.log(
        `Redis: Connected: ${redisHealth.connected}, Used Memory: ${redisHealth.usedMemory}`,
      );

      // Log alerts if any
      logHealthAlerts(systemHealth);

      // Send external alerts (Slack, email) if system is degraded or unhealthy
      await sendExternalAlerts(systemHealth);
    } catch (error) {
      logger.error(`Health check failed: ${error.message}`, error.stack);
    }
  }

  // Initial health check
  await runHealthCheck();

  // Schedule periodic health checks
  const healthCheckInterval = setInterval(() => void runHealthCheck(), CHECK_INTERVAL);

  logger.log(`Health Monitor Worker started. Checking every ${CHECK_INTERVAL / 1000} seconds`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.log(`${signal} received. Shutting down Health Monitor Worker...`);

    clearInterval(healthCheckInterval);
    await redisClient.quit();
    await app.close();

    logger.log('Health Monitor Worker stopped');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error('Failed to start Health Monitor Worker:', error);
  process.exit(1);
});
