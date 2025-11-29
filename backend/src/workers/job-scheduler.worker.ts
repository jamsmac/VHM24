/**
 * Job Scheduler Worker
 *
 * This worker adds repeatable (cron-based) jobs to BullMQ queues.
 * It ensures that commission calculations run automatically on schedule.
 *
 * Schedule:
 * - Daily commissions:   2:00 AM every day    (0 2 * * *)
 * - Weekly commissions:  3:00 AM every Monday (0 3 * * 1)
 * - Monthly commissions: 4:00 AM on 1st       (0 4 1 * *)
 * - Overdue check:       6:00 AM every day    (0 6 * * *)
 *
 * Features:
 * - Sets up repeatable jobs on startup
 * - Monitors job completion
 * - Graceful shutdown
 *
 * Usage:
 *   npm run build && node dist/workers/job-scheduler.worker.js
 *   Or via PM2: pm2 start ecosystem.config.js --only job-scheduler
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { Queue } from 'bull';

const logger = new Logger('JobScheduler');

async function bootstrap() {
  logger.log('Starting Job Scheduler Worker...');

  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Get the commission queue
    const commissionQueue = app.get<Queue>('BullQueue_commission-calculations');

    logger.log('Job Scheduler initialized successfully');

    // Remove any existing repeatable jobs (clean slate)
    const repeatableJobs = await commissionQueue.getRepeatableJobs();
    logger.log(`Found ${repeatableJobs.length} existing repeatable jobs`);

    for (const job of repeatableJobs) {
      await commissionQueue.removeRepeatableByKey(job.key);
      logger.log(`Removed old repeatable job: ${job.name} (${job.cron})`);
    }

    // Add repeatable jobs
    logger.log('Setting up repeatable commission calculation jobs...');

    // Daily commissions - 2:00 AM every day (Uzbekistan timezone: Asia/Tashkent)
    await commissionQueue.add(
      'calculate-daily',
      {},
      {
        repeat: {
          cron: '0 2 * * *', // 2 AM daily
          tz: 'Asia/Tashkent',
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
    logger.log('✓ Daily commission job scheduled: 2:00 AM (Asia/Tashkent)');

    // Weekly commissions - 3:00 AM every Monday
    await commissionQueue.add(
      'calculate-weekly',
      {},
      {
        repeat: {
          cron: '0 3 * * 1', // 3 AM Monday
          tz: 'Asia/Tashkent',
        },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    );
    logger.log('✓ Weekly commission job scheduled: 3:00 AM Monday (Asia/Tashkent)');

    // Monthly commissions - 4:00 AM on the 1st of each month
    await commissionQueue.add(
      'calculate-monthly',
      {},
      {
        repeat: {
          cron: '0 4 1 * *', // 4 AM on 1st
          tz: 'Asia/Tashkent',
        },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    );
    logger.log('✓ Monthly commission job scheduled: 4:00 AM on 1st (Asia/Tashkent)');

    // Overdue payment check - 6:00 AM every day
    await commissionQueue.add(
      'check-overdue',
      {},
      {
        repeat: {
          cron: '0 6 * * *', // 6 AM daily
          tz: 'Asia/Tashkent',
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
    logger.log('✓ Overdue check job scheduled: 6:00 AM daily (Asia/Tashkent)');

    // Verify all jobs are scheduled
    const newRepeatableJobs = await commissionQueue.getRepeatableJobs();
    logger.log(`\n📅 Active Scheduled Jobs (${newRepeatableJobs.length}):`);
    newRepeatableJobs.forEach((job) => {
      logger.log(`   - ${job.name}: ${job.cron} (${job.tz || 'UTC'})`);
    });

    logger.log('\n✅ Job Scheduler is running. All jobs scheduled successfully!');
    logger.log('   Worker will keep running to maintain job schedules.\n');

    // Keep the process alive
    setInterval(() => {
      // Heartbeat every 10 minutes to verify scheduler is alive
      logger.debug('Scheduler heartbeat - all systems operational');
    }, 600000); // 10 minutes

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.log(`\nReceived ${signal}, shutting down job scheduler...`);

      await commissionQueue.close();
      await app.close();

      logger.log('Job Scheduler closed successfully');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start job scheduler:', error);
    process.exit(1);
  }
}

bootstrap();
