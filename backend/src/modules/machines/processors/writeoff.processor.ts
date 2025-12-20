import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Machine, MachineStatus } from '../entities/machine.entity';
import { TransactionsService } from '../../transactions/transactions.service';
import { TransactionType, ExpenseCategory } from '../../transactions/entities/transaction.entity';
import { WriteoffJobData, WriteoffJobResult } from '../interfaces/writeoff-job.interface';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuditLogService } from '../../audit-logs/audit-log.service';
import { UsersService } from '../../users/users.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../notifications/entities/notification.entity';
import { AuditEventType, AuditSeverity } from '../../audit-logs/entities/audit-log.entity';

/**
 * Background processor for machine writeoff operations
 *
 * Handles heavy calculations and transaction creation in background
 * to prevent request timeout on bulk operations.
 *
 * Features:
 * - Async transaction creation
 * - Progress reporting
 * - Error handling with retry logic
 * - Audit logging
 */
@Processor('machine-writeoff')
@Injectable()
export class WriteoffProcessor {
  private readonly logger = new Logger(WriteoffProcessor.name);

  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    private readonly transactionsService: TransactionsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Process writeoff job
   *
   * Steps:
   * 1. Validate machine exists and can be written off
   * 2. Calculate book value
   * 3. Create writeoff transaction if needed
   * 4. Update machine status
   * 5. Return result for audit
   */
  @Process({
    name: 'process-writeoff',
    concurrency: 3, // Process max 3 writeoffs concurrently to avoid DB overload
  })
  async handleWriteoff(job: Job<WriteoffJobData>): Promise<WriteoffJobResult> {
    const { machineId, writeoffDto, userId, requestId } = job.data;
    const jobId = job.id;

    this.logger.log(
      `Processing writeoff job ${jobId} for machine ${machineId}` +
        (requestId ? ` (request: ${requestId})` : ''),
    );

    try {
      // Update progress: Starting
      await job.progress(10);

      // Step 1: Load machine with all relations
      const machine = await this.machineRepository.findOne({
        where: { id: machineId },
        relations: ['location'],
      });

      if (!machine) {
        throw new Error(`Machine with ID ${machineId} not found`);
      }

      // Step 2: Validate machine can be written off
      await job.progress(20);

      if (machine.is_disposed) {
        throw new Error(
          `Machine ${machine.machine_number} is already disposed on ${machine.disposal_date?.toLocaleDateString('ru-RU')}`,
        );
      }

      if (!machine.purchase_price) {
        throw new Error(
          `Cannot writeoff machine ${machine.machine_number}: missing purchase price information`,
        );
      }

      // Step 3: Calculate financial values
      await job.progress(30);

      const disposalDate = writeoffDto.disposal_date
        ? new Date(writeoffDto.disposal_date)
        : new Date();

      const purchasePrice = Number(machine.purchase_price);
      const accumulatedDepreciation = Number(machine.accumulated_depreciation || 0);
      const bookValue = purchasePrice - accumulatedDepreciation;

      this.logger.log(
        `Calculating writeoff for ${machine.machine_number}: ` +
          `Purchase: ${purchasePrice.toFixed(2)}, ` +
          `Depreciation: ${accumulatedDepreciation.toFixed(2)}, ` +
          `Book value: ${bookValue.toFixed(2)}`,
      );

      // Step 4: Create writeoff transaction if book value > 0
      await job.progress(50);

      let writeoffTransaction = null;
      if (bookValue > 0) {
        this.logger.log(`Creating writeoff transaction for ${bookValue.toFixed(2)} UZS`);

        try {
          writeoffTransaction = await this.transactionsService.create({
            transaction_type: TransactionType.EXPENSE,
            expense_category: ExpenseCategory.WRITEOFF,
            amount: bookValue,
            machine_id: machine.id,
            transaction_date: disposalDate.toISOString(),
            description:
              `Списание оборудования: ${machine.machine_number}\n\n` +
              `Причина: ${writeoffDto.disposal_reason}\n\n` +
              `Финансовая информация:\n` +
              `- Первоначальная стоимость: ${purchasePrice.toFixed(2)} UZS\n` +
              `- Накопленная амортизация: ${accumulatedDepreciation.toFixed(2)} UZS\n` +
              `- Остаточная балансовая стоимость: ${bookValue.toFixed(2)} UZS\n\n` +
              `Дата списания: ${disposalDate.toLocaleDateString('ru-RU')}`,
            metadata: {
              disposal: true,
              machine_number: machine.machine_number,
              purchase_price: purchasePrice,
              accumulated_depreciation: accumulatedDepreciation,
              book_value: bookValue,
              disposal_reason: writeoffDto.disposal_reason,
              job_id: jobId,
              initiated_by: userId,
            },
          });

          this.logger.log(
            `Created writeoff transaction ${writeoffTransaction.id} for ${bookValue.toFixed(2)} UZS`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to create writeoff transaction for machine ${machine.machine_number}`,
            error.stack,
          );
          throw new Error(`Transaction creation failed: ${error.message}`);
        }
      } else {
        this.logger.log(
          `Machine ${machine.machine_number} is fully depreciated, no writeoff transaction needed`,
        );
      }

      // Step 5: Update machine status
      await job.progress(70);

      try {
        machine.is_disposed = true;
        machine.disposal_date = disposalDate;
        machine.disposal_reason = writeoffDto.disposal_reason;
        machine.disposal_transaction_id = writeoffTransaction?.id || null;
        machine.status = MachineStatus.DISABLED;

        // Update metadata
        machine.metadata = {
          ...machine.metadata,
          disposed_at: disposalDate.toISOString(),
          disposal_book_value: bookValue,
          disposal_transaction_id: writeoffTransaction?.id,
          disposal_job_id: jobId,
        };

        await this.machineRepository.save(machine);

        this.logger.log(`Successfully wrote off machine ${machine.machine_number} (${machine.id})`);
      } catch (error) {
        this.logger.error(`Failed to update machine ${machine.machine_number} status`, error.stack);

        // If transaction was created but machine update failed, we need to handle this
        if (writeoffTransaction) {
          this.logger.error(
            `CRITICAL: Transaction ${writeoffTransaction.id} created but machine update failed!`,
          );

          // Mark transaction as requiring manual intervention
          await this.handleTransactionMachineMismatch(
            writeoffTransaction.id,
            machineId,
            machine.machine_number,
            userId || 'system',
            error.message,
          );
        }

        throw new Error(`Machine status update failed: ${error.message}`);
      }

      // Step 6: Complete
      await job.progress(100);

      const result: WriteoffJobResult = {
        success: true,
        machineId: machine.id,
        machineNumber: machine.machine_number,
        transactionId: writeoffTransaction?.id,
        bookValue,
        disposalDate,
        message: `Machine ${machine.machine_number} successfully written off`,
      };

      this.logger.log(`Completed writeoff job ${jobId} for machine ${machine.machine_number}`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to process writeoff job ${jobId}: ${error.message}`, error.stack);

      // Check if this is a retryable error
      if (this.isRetryableError(error)) {
        // Re-throw to trigger retry
        throw error;
      }

      // Non-retryable error, return failure result
      return {
        success: false,
        machineId,
        machineNumber: 'Unknown',
        bookValue: 0,
        disposalDate: new Date(),
        message: `Writeoff failed: ${error.message}`,
      };
    }
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    const retryableErrors = [
      'ECONNREFUSED', // Database connection issues
      'ETIMEDOUT',
      'ENOTFOUND',
      'ER_LOCK_DEADLOCK', // Database deadlock
      'ER_LOCK_WAIT_TIMEOUT', // Database lock timeout
    ];

    const errorMessage = error instanceof Error ? error.message : String(error);
    return retryableErrors.some((retryableError) => errorMessage.includes(retryableError));
  }

  /**
   * Handle job completion
   */
  async onCompleted(job: Job<WriteoffJobData>, result: WriteoffJobResult): Promise<void> {
    this.logger.log(
      `Job ${job.id} completed: Machine ${result.machineNumber} ` +
        `(book value: ${result.bookValue.toFixed(2)} UZS)`,
    );
  }

  /**
   * Handle job failure (after all retries exhausted)
   * Uses Bull's @OnQueueFailed decorator for proper event handling
   */
  @OnQueueFailed()
  async onFailed(job: Job<WriteoffJobData>, error: Error): Promise<void> {
    const { machineId, userId, requestId } = job.data;

    this.logger.error(
      `Job ${job.id} failed permanently after ${job.attemptsMade} attempts: ${error.message}`,
      error.stack,
    );

    // Get machine details for better error reporting
    let machineNumber = 'Unknown';
    try {
      const machine = await this.machineRepository.findOne({ where: { id: machineId } });
      if (machine) {
        machineNumber = machine.machine_number;
      }
    } catch {
      // Ignore lookup errors
    }

    // Send notification to admins about failed writeoff
    await this.sendFailedWriteoffNotification(
      machineId,
      machineNumber,
      error.message,
      job.attemptsMade,
      String(job.id),
    );

    // Create audit log entry for failed writeoff attempt
    await this.logFailedWriteoff(
      machineId,
      machineNumber,
      userId || 'system',
      error.message,
      job.attemptsMade,
      requestId,
    );
  }

  /**
   * Send notification to all admins about a failed writeoff operation
   */
  private async sendFailedWriteoffNotification(
    machineId: string,
    machineNumber: string,
    errorMessage: string,
    attempts: number,
    jobId: string,
  ): Promise<void> {
    try {
      const adminIds = await this.usersService.getAdminUserIds();

      if (adminIds.length === 0) {
        this.logger.warn('No admin users found to notify about failed writeoff');
        return;
      }

      const title = `⚠️ Ошибка списания оборудования`;
      const message =
        `Не удалось списать машину ${machineNumber}\n\n` +
        `🔧 ID машины: ${machineId}\n` +
        `❌ Ошибка: ${errorMessage}\n` +
        `🔄 Попыток: ${attempts}\n` +
        `📋 Job ID: ${jobId}\n\n` +
        `Требуется ручное вмешательство.`;

      // Send to all admins via in-app notification
      await this.notificationsService.createBulk({
        type: NotificationType.SYSTEM_ALERT,
        channel: NotificationChannel.IN_APP,
        recipient_ids: adminIds,
        title,
        message,
        data: {
          machine_id: machineId,
          machine_number: machineNumber,
          error_message: errorMessage,
          job_id: jobId,
          attempts,
          action_type: 'writeoff_failed',
        },
      });

      // Also send via Telegram for urgent notification
      await this.notificationsService.createBulk({
        type: NotificationType.SYSTEM_ALERT,
        channel: NotificationChannel.TELEGRAM,
        recipient_ids: adminIds,
        title,
        message,
        data: {
          machine_id: machineId,
          machine_number: machineNumber,
          error_message: errorMessage,
          job_id: jobId,
        },
      });

      this.logger.log(`Sent failed writeoff notification to ${adminIds.length} admin(s)`);
    } catch (notifyError) {
      this.logger.error(
        `Failed to send writeoff failure notification: ${notifyError.message}`,
        notifyError.stack,
      );
    }
  }

  /**
   * Create audit log entry for failed writeoff attempt
   */
  private async logFailedWriteoff(
    machineId: string,
    machineNumber: string,
    userId: string,
    errorMessage: string,
    attempts: number,
    requestId?: string,
  ): Promise<void> {
    try {
      await this.auditLogService.create({
        event_type: AuditEventType.SUSPICIOUS_ACTIVITY,
        severity: AuditSeverity.ERROR,
        user_id: userId,
        description: `Machine writeoff failed: ${machineNumber} (${machineId})`,
        metadata: {
          machine_id: machineId,
          machine_number: machineNumber,
          error_message: errorMessage,
          attempts,
          request_id: requestId,
          action_type: 'writeoff_failed',
        },
        success: false,
        error_message: errorMessage,
      });

      this.logger.log(`Created audit log for failed writeoff of machine ${machineNumber}`);
    } catch (auditError) {
      this.logger.error(
        `Failed to create audit log for writeoff failure: ${auditError.message}`,
        auditError.stack,
      );
    }
  }

  /**
   * Handle transaction/machine update mismatch
   * This occurs when a writeoff transaction is created but the machine status update fails.
   * Creates critical alerts and marks the transaction for manual review.
   */
  private async handleTransactionMachineMismatch(
    transactionId: string,
    machineId: string,
    machineNumber: string,
    userId: string,
    errorMessage: string,
  ): Promise<void> {
    const title = `🚨 КРИТИЧЕСКАЯ ОШИБКА: Несоответствие транзакции`;
    const message =
      `Транзакция списания создана, но обновление машины не удалось!\n\n` +
      `📋 Транзакция: ${transactionId}\n` +
      `🔧 Машина: ${machineNumber} (${machineId})\n` +
      `❌ Ошибка: ${errorMessage}\n\n` +
      `⚠️ ТРЕБУЕТСЯ НЕМЕДЛЕННОЕ РУЧНОЕ ВМЕШАТЕЛЬСТВО!\n` +
      `Необходимо либо завершить списание машины вручную, ` +
      `либо отменить созданную транзакцию.`;

    try {
      // Get admin IDs for critical notification
      const adminIds = await this.usersService.getAdminUserIds();

      if (adminIds.length > 0) {
        // Send critical notification via all channels
        await Promise.all([
          // In-app notification
          this.notificationsService.createBulk({
            type: NotificationType.SYSTEM_ALERT,
            channel: NotificationChannel.IN_APP,
            recipient_ids: adminIds,
            title,
            message,
            data: {
              transaction_id: transactionId,
              machine_id: machineId,
              machine_number: machineNumber,
              error_message: errorMessage,
              action_type: 'writeoff_mismatch',
              requires_manual_intervention: true,
            },
          }),
          // Telegram notification
          this.notificationsService.createBulk({
            type: NotificationType.SYSTEM_ALERT,
            channel: NotificationChannel.TELEGRAM,
            recipient_ids: adminIds,
            title,
            message,
            data: {
              transaction_id: transactionId,
              machine_id: machineId,
            },
          }),
          // Email notification for documentation
          this.notificationsService.createBulk({
            type: NotificationType.SYSTEM_ALERT,
            channel: NotificationChannel.EMAIL,
            recipient_ids: adminIds,
            title,
            message,
            data: {
              transaction_id: transactionId,
              machine_id: machineId,
              machine_number: machineNumber,
              error_message: errorMessage,
            },
          }),
        ]);
      }

      // Create critical audit log entry
      await this.auditLogService.create({
        event_type: AuditEventType.SUSPICIOUS_ACTIVITY,
        severity: AuditSeverity.CRITICAL,
        user_id: userId,
        description: `CRITICAL: Writeoff transaction/machine mismatch for ${machineNumber}`,
        metadata: {
          transaction_id: transactionId,
          machine_id: machineId,
          machine_number: machineNumber,
          error_message: errorMessage,
          action_type: 'writeoff_mismatch',
          requires_manual_intervention: true,
        },
        success: false,
        error_message: `Transaction created but machine update failed: ${errorMessage}`,
      });

      this.logger.log(
        `Sent mismatch alerts for transaction ${transactionId} / machine ${machineNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle transaction/machine mismatch: ${error.message}`,
        error.stack,
      );
    }
  }
}
