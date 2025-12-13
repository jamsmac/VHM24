import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  addDays,
} from 'date-fns';
import { Contract, ContractStatus } from '../entities/contract.entity';
import { CommissionCalculation, PaymentStatus } from '../entities/commission-calculation.entity';
import { CommissionService } from './commission.service';
import { RevenueAggregationService } from './revenue-aggregation.service';

/**
 * Commission Scheduler Service
 *
 * Manages automatic commission calculation on schedules (daily/weekly/monthly).
 * Creates CommissionCalculation records and manages payment due dates.
 */
@Injectable()
export class CommissionSchedulerService {
  private readonly logger = new Logger(CommissionSchedulerService.name);

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(CommissionCalculation)
    private readonly calculationRepository: Repository<CommissionCalculation>,
    private readonly commissionService: CommissionService,
    private readonly revenueService: RevenueAggregationService,
  ) {}

  /**
   * Calculate daily commissions
   *
   * Runs for contracts with commission_fixed_period = 'daily'.
   * Calculates for the previous day.
   */
  async calculateDailyCommissions(): Promise<number> {
    this.logger.log('Starting daily commission calculation...');

    const yesterday = subDays(new Date(), 1);
    const periodStart = startOfDay(yesterday);
    const periodEnd = endOfDay(yesterday);

    const contracts = await this.contractRepository.find({
      where: {
        status: ContractStatus.ACTIVE,
        commission_fixed_period: 'daily',
      },
    });

    this.logger.log(`Found ${contracts.length} daily contracts`);

    let calculatedCount = 0;

    for (const contract of contracts) {
      try {
        await this.calculateForContract(contract.id, periodStart, periodEnd);
        calculatedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to calculate commission for contract ${contract.contract_number}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Daily commission calculation completed. Processed: ${calculatedCount}/${contracts.length}`,
    );
    return calculatedCount;
  }

  /**
   * Calculate weekly commissions
   *
   * Runs for contracts with commission_fixed_period = 'weekly'.
   * Calculates for the previous week (Monday-Sunday).
   */
  async calculateWeeklyCommissions(): Promise<number> {
    this.logger.log('Starting weekly commission calculation...');

    const lastWeek = subWeeks(new Date(), 1);
    const periodStart = startOfWeek(lastWeek, { weekStartsOn: 1 }); // Monday
    const periodEnd = endOfWeek(lastWeek, { weekStartsOn: 1 }); // Sunday

    const contracts = await this.contractRepository.find({
      where: {
        status: ContractStatus.ACTIVE,
        commission_fixed_period: 'weekly',
      },
    });

    this.logger.log(`Found ${contracts.length} weekly contracts`);

    let calculatedCount = 0;

    for (const contract of contracts) {
      try {
        await this.calculateForContract(contract.id, periodStart, periodEnd);
        calculatedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to calculate commission for contract ${contract.contract_number}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Weekly commission calculation completed. Processed: ${calculatedCount}/${contracts.length}`,
    );
    return calculatedCount;
  }

  /**
   * Calculate monthly commissions
   *
   * Runs for contracts with commission_fixed_period = 'monthly' or no specific period.
   * Calculates for the previous month.
   */
  async calculateMonthlyCommissions(): Promise<number> {
    this.logger.log('Starting monthly commission calculation...');

    const lastMonth = subMonths(new Date(), 1);
    const periodStart = startOfMonth(lastMonth);
    const periodEnd = endOfMonth(lastMonth);

    const contracts = await this.contractRepository.find({
      where: [
        {
          status: ContractStatus.ACTIVE,
          commission_fixed_period: 'monthly',
        },
        {
          status: ContractStatus.ACTIVE,
          commission_fixed_period: 'quarterly', // Also process quarterly for monthly data
        },
      ],
    });

    this.logger.log(`Found ${contracts.length} monthly/quarterly contracts`);

    let calculatedCount = 0;

    for (const contract of contracts) {
      try {
        await this.calculateForContract(contract.id, periodStart, periodEnd);
        calculatedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to calculate commission for contract ${contract.contract_number}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Monthly commission calculation completed. Processed: ${calculatedCount}/${contracts.length}`,
    );
    return calculatedCount;
  }

  /**
   * Calculate commission for a specific contract and period
   *
   * This is the core method that:
   * 1. Checks if calculation already exists
   * 2. Aggregates revenue from transactions
   * 3. Calculates commission using CommissionService
   * 4. Saves CommissionCalculation record
   * 5. Sets payment due date
   */
  async calculateForContract(
    contractId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<CommissionCalculation> {
    // Check if calculation already exists for this period
    const existing = await this.calculationRepository.findOne({
      where: {
        contract_id: contractId,
        period_start: periodStart,
        period_end: periodEnd,
      },
    });

    if (existing) {
      this.logger.log(
        `Commission calculation already exists for contract ${contractId} period ${periodStart.toISOString()} - ${periodEnd.toISOString()}`,
      );
      return existing;
    }

    // Load contract
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error(`Contract not found: ${contractId}`);
    }

    // Aggregate revenue for the period
    const revenue = await this.revenueService.getRevenueForContract(
      contractId,
      periodStart,
      periodEnd,
    );

    // Calculate commission
    const calculation = await this.commissionService.calculateCommission(
      contract,
      revenue.total_revenue,
      periodStart,
      periodEnd,
      revenue.transaction_count,
    );

    // Calculate payment due date (period_end + payment_term_days)
    const paymentDueDate = addDays(periodEnd, contract.payment_term_days);

    // Save calculation
    const commissionCalculation = this.calculationRepository.create({
      contract_id: contractId,
      period_start: periodStart,
      period_end: periodEnd,
      total_revenue: calculation.total_revenue,
      transaction_count: calculation.transaction_count,
      commission_amount: calculation.commission_amount,
      commission_type: calculation.commission_type,
      calculation_details: calculation.calculation_details,
      payment_status: PaymentStatus.PENDING,
      payment_due_date: paymentDueDate,
      notes: `Автоматически рассчитано ${new Date().toISOString()}`,
    });

    const saved = await this.calculationRepository.save(commissionCalculation);

    this.logger.log(
      `Commission calculated for contract ${contract.contract_number}: ` +
        `${revenue.total_revenue.toLocaleString('ru-RU')} UZS revenue → ` +
        `${calculation.commission_amount.toLocaleString('ru-RU')} UZS commission`,
    );

    return saved;
  }

  /**
   * Check and update overdue commission payments
   *
   * Updates payment_status from 'pending' to 'overdue' for payments past their due date.
   * Returns the number of records updated.
   */
  async checkAndUpdateOverduePayments(): Promise<number> {
    this.logger.log('Checking for overdue commission payments...');

    const today = new Date();

    const result = await this.calculationRepository
      .createQueryBuilder()
      .update(CommissionCalculation)
      .set({
        payment_status: PaymentStatus.OVERDUE,
        updated_at: today,
      })
      .where('payment_status = :status', { status: PaymentStatus.PENDING })
      .andWhere('payment_due_date < :today', { today })
      .execute();

    const updatedCount = result.affected || 0;

    if (updatedCount > 0) {
      this.logger.warn(`Marked ${updatedCount} commission payments as OVERDUE`);
    } else {
      this.logger.log('No overdue payments found');
    }

    return updatedCount;
  }

  /**
   * Get pending commission calculations
   *
   * Returns all calculations with payment_status = 'pending' or 'overdue'.
   */
  async getPendingPayments(): Promise<CommissionCalculation[]> {
    return this.calculationRepository.find({
      where: {
        payment_status: In(['pending', 'overdue']),
      },
      relations: ['contract', 'contract.counterparty'],
      order: {
        payment_due_date: 'ASC',
      },
    });
  }

  /**
   * Get overdue commission calculations
   */
  async getOverduePayments(): Promise<CommissionCalculation[]> {
    return this.calculationRepository.find({
      where: {
        payment_status: PaymentStatus.OVERDUE,
      },
      relations: ['contract', 'contract.counterparty'],
      order: {
        payment_due_date: 'ASC',
      },
    });
  }

  /**
   * Mark a commission calculation as paid
   *
   * Updates payment_status, payment_date, and optionally payment_transaction_id.
   */
  async markAsPaid(
    calculationId: string,
    paymentTransactionId: string | null = null,
    paymentDate: Date = new Date(),
  ): Promise<CommissionCalculation> {
    const calculation = await this.calculationRepository.findOne({
      where: { id: calculationId },
    });

    if (!calculation) {
      throw new Error(`Commission calculation not found: ${calculationId}`);
    }

    calculation.payment_status = PaymentStatus.PAID;
    calculation.payment_date = paymentDate;
    calculation.payment_transaction_id = paymentTransactionId;

    const updated = await this.calculationRepository.save(calculation);

    this.logger.log(
      `Commission calculation ${calculationId} marked as PAID (amount: ${calculation.commission_amount.toLocaleString('ru-RU')} UZS)`,
    );

    return updated;
  }
}
