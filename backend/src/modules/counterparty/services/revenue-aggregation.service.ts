import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from '@/modules/transactions/entities/transaction.entity';

/**
 * Revenue Aggregation Result
 */
export interface RevenueAggregation {
  total_revenue: number; // Total revenue in UZS
  transaction_count: number; // Number of transactions
  average_transaction: number; // Average transaction amount
  period_start: Date;
  period_end: Date;
  breakdown?: {
    by_date?: { date: string; revenue: number }[];
    by_machine?: { machine_id: string; machine_number: string; revenue: number }[];
  };
}

/**
 * Revenue Aggregation Service
 *
 * Efficiently aggregates transaction revenue for commission calculations.
 * Uses PostgreSQL aggregate functions for performance.
 */
@Injectable()
export class RevenueAggregationService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  /**
   * Get revenue for a specific contract over a period
   *
   * Aggregates all sales transactions linked to the contract within the date range.
   */
  async getRevenueForContract(
    contractId: string,
    periodStart: Date,
    periodEnd: Date,
    includeBreakdown = false,
  ): Promise<RevenueAggregation> {
    // Main aggregation query
    const result = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total_revenue')
      .addSelect('COUNT(t.id)', 'transaction_count')
      .addSelect('AVG(t.amount)', 'average_transaction')
      .where('t.contract_id = :contractId', { contractId })
      .andWhere('t.transaction_type = :type', { type: TransactionType.SALE })
      .andWhere('t.sale_date >= :periodStart', { periodStart })
      .andWhere('t.sale_date < :periodEnd', { periodEnd })
      .getRawOne();

    const aggregation: RevenueAggregation = {
      total_revenue: parseFloat(result.total_revenue || '0'),
      transaction_count: parseInt(result.transaction_count || '0', 10),
      average_transaction: parseFloat(result.average_transaction || '0'),
      period_start: periodStart,
      period_end: periodEnd,
    };

    // Optional detailed breakdown
    if (includeBreakdown) {
      aggregation.breakdown = {};

      // By date
      const byDate = await this.transactionRepository
        .createQueryBuilder('t')
        .select('DATE(t.sale_date)', 'date')
        .addSelect('SUM(t.amount)', 'revenue')
        .where('t.contract_id = :contractId', { contractId })
        .andWhere('t.transaction_type = :type', { type: TransactionType.SALE })
        .andWhere('t.sale_date >= :periodStart', { periodStart })
        .andWhere('t.sale_date < :periodEnd', { periodEnd })
        .groupBy('DATE(t.sale_date)')
        .orderBy('DATE(t.sale_date)', 'ASC')
        .getRawMany();

      aggregation.breakdown.by_date = byDate.map((row) => ({
        date: row.date,
        revenue: parseFloat(row.revenue),
      }));

      // By machine
      const byMachine = await this.transactionRepository
        .createQueryBuilder('t')
        .select('t.machine_id', 'machine_id')
        .addSelect('m.machine_number', 'machine_number')
        .addSelect('SUM(t.amount)', 'revenue')
        .leftJoin('t.machine', 'm')
        .where('t.contract_id = :contractId', { contractId })
        .andWhere('t.transaction_type = :type', { type: TransactionType.SALE })
        .andWhere('t.sale_date >= :periodStart', { periodStart })
        .andWhere('t.sale_date < :periodEnd', { periodEnd })
        .andWhere('t.machine_id IS NOT NULL')
        .groupBy('t.machine_id, m.machine_number')
        .orderBy('SUM(t.amount)', 'DESC')
        .getRawMany();

      aggregation.breakdown.by_machine = byMachine.map((row) => ({
        machine_id: row.machine_id,
        machine_number: row.machine_number,
        revenue: parseFloat(row.revenue),
      }));
    }

    return aggregation;
  }

  /**
   * Get revenue for a specific machine over a period
   *
   * Useful for machine-specific commission calculations.
   */
  async getRevenueForMachine(
    machineId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<RevenueAggregation> {
    const result = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total_revenue')
      .addSelect('COUNT(t.id)', 'transaction_count')
      .addSelect('AVG(t.amount)', 'average_transaction')
      .where('t.machine_id = :machineId', { machineId })
      .andWhere('t.transaction_type = :type', { type: TransactionType.SALE })
      .andWhere('t.sale_date >= :periodStart', { periodStart })
      .andWhere('t.sale_date < :periodEnd', { periodEnd })
      .getRawOne();

    return {
      total_revenue: parseFloat(result.total_revenue || '0'),
      transaction_count: parseInt(result.transaction_count || '0', 10),
      average_transaction: parseFloat(result.average_transaction || '0'),
      period_start: periodStart,
      period_end: periodEnd,
    };
  }

  /**
   * Get revenue for a specific location over a period
   *
   * Aggregates revenue from all machines at the location.
   */
  async getRevenueForLocation(
    locationId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<RevenueAggregation> {
    const result = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total_revenue')
      .addSelect('COUNT(t.id)', 'transaction_count')
      .addSelect('AVG(t.amount)', 'average_transaction')
      .innerJoin('t.machine', 'm')
      .where('m.location_id = :locationId', { locationId })
      .andWhere('t.transaction_type = :type', { type: TransactionType.SALE })
      .andWhere('t.sale_date >= :periodStart', { periodStart })
      .andWhere('t.sale_date < :periodEnd', { periodEnd })
      .getRawOne();

    return {
      total_revenue: parseFloat(result.total_revenue || '0'),
      transaction_count: parseInt(result.transaction_count || '0', 10),
      average_transaction: parseFloat(result.average_transaction || '0'),
      period_start: periodStart,
      period_end: periodEnd,
    };
  }

  /**
   * Get revenue for multiple contracts
   *
   * Useful for batch commission calculations.
   * Returns a map of contract_id -> RevenueAggregation.
   */
  async getRevenueForContracts(
    contractIds: string[],
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Map<string, RevenueAggregation>> {
    if (contractIds.length === 0) {
      return new Map();
    }

    const results = await this.transactionRepository
      .createQueryBuilder('t')
      .select('t.contract_id', 'contract_id')
      .addSelect('SUM(t.amount)', 'total_revenue')
      .addSelect('COUNT(t.id)', 'transaction_count')
      .addSelect('AVG(t.amount)', 'average_transaction')
      .where('t.contract_id IN (:...contractIds)', { contractIds })
      .andWhere('t.transaction_type = :type', { type: TransactionType.SALE })
      .andWhere('t.sale_date >= :periodStart', { periodStart })
      .andWhere('t.sale_date < :periodEnd', { periodEnd })
      .groupBy('t.contract_id')
      .getRawMany();

    const map = new Map<string, RevenueAggregation>();

    results.forEach((row) => {
      map.set(row.contract_id, {
        total_revenue: parseFloat(row.total_revenue || '0'),
        transaction_count: parseInt(row.transaction_count || '0', 10),
        average_transaction: parseFloat(row.average_transaction || '0'),
        period_start: periodStart,
        period_end: periodEnd,
      });
    });

    // Add zero revenue for contracts with no transactions
    contractIds.forEach((contractId) => {
      if (!map.has(contractId)) {
        map.set(contractId, {
          total_revenue: 0,
          transaction_count: 0,
          average_transaction: 0,
          period_start: periodStart,
          period_end: periodEnd,
        });
      }
    });

    return map;
  }

  /**
   * Get total revenue across all contracts for a period
   *
   * Useful for dashboard statistics.
   */
  async getTotalRevenue(periodStart: Date, periodEnd: Date): Promise<RevenueAggregation> {
    const result = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total_revenue')
      .addSelect('COUNT(t.id)', 'transaction_count')
      .addSelect('AVG(t.amount)', 'average_transaction')
      .where('t.transaction_type = :type', { type: TransactionType.SALE })
      .andWhere('t.sale_date >= :periodStart', { periodStart })
      .andWhere('t.sale_date < :periodEnd', { periodEnd })
      .getRawOne();

    return {
      total_revenue: parseFloat(result.total_revenue || '0'),
      transaction_count: parseInt(result.transaction_count || '0', 10),
      average_transaction: parseFloat(result.average_transaction || '0'),
      period_start: periodStart,
      period_end: periodEnd,
    };
  }
}
