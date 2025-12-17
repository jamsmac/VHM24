import { Process, Processor } from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Machine, MachineStatus } from '../entities/machine.entity';
import { TransactionsService } from '../../transactions/transactions.service';
import { TransactionType, ExpenseCategory } from '../../transactions/entities/transaction.entity';
import { WriteoffJobData, WriteoffJobResult } from '../interfaces/writeoff-job.interface';

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
          // TODO: Implement compensation logic or manual intervention flag
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
   */
  async onFailed(job: Job<WriteoffJobData>, error: Error): Promise<void> {
    this.logger.error(
      `Job ${job.id} failed permanently after ${job.attemptsMade} attempts: ${error.message}`,
      error.stack,
    );

    // TODO: Send notification to admin about failed writeoff
    // TODO: Create audit log entry for failed writeoff attempt
  }
}
