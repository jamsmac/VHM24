import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { CommissionSchedulerService } from '../services/commission-scheduler.service';

/**
 * Commission Calculation Background Processor
 *
 * Handles scheduled commission calculations via BullMQ.
 * Jobs are triggered by cron schedules defined in the module configuration.
 *
 * Job Types:
 * - calculate-daily: Runs daily at 2 AM for daily contracts
 * - calculate-weekly: Runs Monday at 3 AM for weekly contracts
 * - calculate-monthly: Runs 1st of month at 4 AM for monthly/quarterly contracts
 * - check-overdue: Runs daily at 6 AM to mark overdue payments
 */
@Processor('commission-calculations')
export class CommissionCalculationProcessor {
  private readonly logger = new Logger(CommissionCalculationProcessor.name);

  constructor(private readonly schedulerService: CommissionSchedulerService) {}

  /**
   * Process daily commission calculations
   *
   * Triggered by cron: 0 2 * * * (2 AM every day)
   * Calculates commissions for all contracts with commission_fixed_period = 'daily'
   */
  @Process('calculate-daily')
  async handleDailyCalculation(job: Job): Promise<{ processed: number }> {
    this.logger.log(`[Job ${job.id}] Starting daily commission calculation...`);

    try {
      const processed = await this.schedulerService.calculateDailyCommissions();

      this.logger.log(
        `[Job ${job.id}] Daily commission calculation completed. Processed: ${processed} contracts`,
      );

      return { processed };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Daily commission calculation failed: ${error.message}`,
        error.stack,
      );
      throw error; // BullMQ will handle retry
    }
  }

  /**
   * Process weekly commission calculations
   *
   * Triggered by cron: 0 3 * * 1 (3 AM every Monday)
   * Calculates commissions for all contracts with commission_fixed_period = 'weekly'
   */
  @Process('calculate-weekly')
  async handleWeeklyCalculation(job: Job): Promise<{ processed: number }> {
    this.logger.log(`[Job ${job.id}] Starting weekly commission calculation...`);

    try {
      const processed = await this.schedulerService.calculateWeeklyCommissions();

      this.logger.log(
        `[Job ${job.id}] Weekly commission calculation completed. Processed: ${processed} contracts`,
      );

      return { processed };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Weekly commission calculation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process monthly commission calculations
   *
   * Triggered by cron: 0 4 1 * * (4 AM on the 1st of every month)
   * Calculates commissions for all contracts with commission_fixed_period = 'monthly' or 'quarterly'
   */
  @Process('calculate-monthly')
  async handleMonthlyCalculation(job: Job): Promise<{ processed: number }> {
    this.logger.log(`[Job ${job.id}] Starting monthly commission calculation...`);

    try {
      const processed = await this.schedulerService.calculateMonthlyCommissions();

      this.logger.log(
        `[Job ${job.id}] Monthly commission calculation completed. Processed: ${processed} contracts`,
      );

      return { processed };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Monthly commission calculation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Check and update overdue commission payments
   *
   * Triggered by cron: 0 6 * * * (6 AM every day)
   * Updates payment_status from 'pending' to 'overdue' for payments past their due date
   */
  @Process('check-overdue')
  async handleOverdueCheck(job: Job): Promise<{ updated: number }> {
    this.logger.log(`[Job ${job.id}] Starting overdue payment check...`);

    try {
      const updated = await this.schedulerService.checkAndUpdateOverduePayments();

      if (updated > 0) {
        this.logger.warn(
          `[Job ${job.id}] Overdue payment check completed. Marked ${updated} payments as OVERDUE`,
        );
      } else {
        this.logger.log(
          `[Job ${job.id}] Overdue payment check completed. No overdue payments found`,
        );
      }

      return { updated };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Overdue payment check failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Manual trigger for commission calculation
   *
   * Can be triggered via API endpoint for specific periods or contracts.
   * No cron schedule - only manual execution.
   */
  @Process('calculate-manual')
  async handleManualCalculation(
    job: Job<{
      period?: 'daily' | 'weekly' | 'monthly' | 'all';
      contractId?: string;
      periodStart?: string;
      periodEnd?: string;
    }>,
  ): Promise<{ processed: number }> {
    this.logger.log(
      `[Job ${job.id}] Starting manual commission calculation... Period: ${job.data.period || 'custom'}`,
    );

    try {
      let processed = 0;

      if (job.data.contractId && job.data.periodStart && job.data.periodEnd) {
        // Calculate for specific contract and period
        await this.schedulerService.calculateForContract(
          job.data.contractId,
          new Date(job.data.periodStart),
          new Date(job.data.periodEnd),
        );
        processed = 1;
      } else if (job.data.period) {
        // Calculate for all contracts of a specific period type
        switch (job.data.period) {
          case 'daily':
            processed = await this.schedulerService.calculateDailyCommissions();
            break;
          case 'weekly':
            processed = await this.schedulerService.calculateWeeklyCommissions();
            break;
          case 'monthly':
            processed = await this.schedulerService.calculateMonthlyCommissions();
            break;
          case 'all': {
            const daily = await this.schedulerService.calculateDailyCommissions();
            const weekly = await this.schedulerService.calculateWeeklyCommissions();
            const monthly = await this.schedulerService.calculateMonthlyCommissions();
            processed = daily + weekly + monthly;
            break;
          }
        }
      } else {
        throw new Error('Invalid manual calculation parameters');
      }

      this.logger.log(
        `[Job ${job.id}] Manual commission calculation completed. Processed: ${processed}`,
      );

      return { processed };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Manual commission calculation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Job completion handler
   *
   * Logs successful job completion
   */
  async onCompleted(job: Job, result: unknown) {
    this.logger.debug(`Job ${job.id} (${job.name}) completed with result:`, result);
  }

  /**
   * Job failure handler
   *
   * Logs failed jobs for monitoring
   */
  async onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} (${job.name}) failed:`, err.message);
  }
}
