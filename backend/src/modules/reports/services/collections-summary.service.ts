import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from '@modules/tasks/entities/task.entity';
import { Transaction } from '@modules/transactions/entities/transaction.entity';

export interface CollectionsSummaryReport {
  period: {
    start_date: Date;
    end_date: Date;
  };
  summary: {
    total_collections: number;
    total_collected_amount: number;
    expected_amount: number; // From sales
    variance: number;
    variance_percentage: number;
    average_collection_amount: number;
  };
  by_machine: Array<{
    machine_number: string;
    machine_name: string;
    location_name: string;
    collections_count: number;
    collected_amount: number;
    expected_amount: number;
    variance: number;
    variance_percentage: number;
  }>;
  by_collector: Array<{
    collector_name: string;
    collections_count: number;
    total_amount: number;
    average_amount: number;
  }>;
  discrepancies: Array<{
    machine_number: string;
    collection_date: Date;
    collected_amount: number;
    expected_amount: number;
    variance: number;
    variance_percentage: number;
    status: string;
  }>;
  daily_trend: Array<{
    date: string;
    collections_count: number;
    total_amount: number;
  }>;
  generated_at: Date;
}

@Injectable()
export class CollectionsSummaryService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  /**
   * Generate collections summary report
   */
  async generateReport(startDate: Date, endDate: Date): Promise<CollectionsSummaryReport> {
    const [summary, byMachine, byCollector, discrepancies, dailyTrend] = await Promise.all([
      this.getSummary(startDate, endDate),
      this.getByMachine(startDate, endDate),
      this.getByCollector(startDate, endDate),
      this.getDiscrepancies(startDate, endDate),
      this.getDailyTrend(startDate, endDate),
    ]);

    return {
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      summary,
      by_machine: byMachine,
      by_collector: byCollector,
      discrepancies,
      daily_trend: dailyTrend,
      generated_at: new Date(),
    };
  }

  /**
   * Get overall collections summary
   */
  private async getSummary(
    startDate: Date,
    endDate: Date,
  ): Promise<CollectionsSummaryReport['summary']> {
    // Get collection tasks
    const collectionsRaw = await this.taskRepository
      .createQueryBuilder('t')
      .select('COUNT(t.id)', 'total_collections')
      .addSelect('SUM(t.actual_amount)', 'total_collected')
      .where('t.type = :type', { type: 'collection' })
      .andWhere('t.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere('t.completed_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const totalCollections = parseInt(collectionsRaw?.total_collections || '0');
    const totalCollectedAmount = parseFloat(collectionsRaw?.total_collected || '0');

    // Get expected amount from sales
    const expectedRaw = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'expected_amount')
      .where('t.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere("t.payment_method = 'cash'") // Only cash needs collection
      .getRawOne();

    const expectedAmount = parseFloat(expectedRaw?.expected_amount || '0');

    const variance = totalCollectedAmount - expectedAmount;
    const variancePercentage = expectedAmount > 0 ? (variance / expectedAmount) * 100 : 0;
    const averageCollectionAmount =
      totalCollections > 0 ? totalCollectedAmount / totalCollections : 0;

    return {
      total_collections: totalCollections,
      total_collected_amount: totalCollectedAmount,
      expected_amount: expectedAmount,
      variance,
      variance_percentage: variancePercentage,
      average_collection_amount: averageCollectionAmount,
    };
  }

  /**
   * Get collections by machine
   */
  private async getByMachine(
    startDate: Date,
    endDate: Date,
  ): Promise<CollectionsSummaryReport['by_machine']> {
    // Get collections by machine
    const collectionsRaw = await this.taskRepository
      .createQueryBuilder('t')
      .leftJoin('machines', 'm', 't.machine_id = m.id')
      .leftJoin('locations', 'l', 'm.location_id = l.id')
      .select('m.machine_number', 'machine_number')
      .addSelect('m.name', 'machine_name')
      .addSelect('l.name', 'location_name')
      .addSelect('COUNT(t.id)', 'collections_count')
      .addSelect('SUM(t.actual_amount)', 'collected_amount')
      .where('t.type = :type', { type: 'collection' })
      .andWhere('t.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere('t.completed_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('m.machine_number')
      .addGroupBy('m.name')
      .addGroupBy('l.name')
      .addGroupBy('t.machine_id')
      .orderBy('SUM(t.actual_amount)', 'DESC')
      .getRawMany();

    // Enrich with expected amounts
    const byMachine = await Promise.all(
      collectionsRaw.map(async (item) => {
        // Get machine ID to fetch expected sales
        const machine = await this.taskRepository
          .createQueryBuilder('t')
          .leftJoin('machines', 'm', 't.machine_id = m.id')
          .select('m.id', 'machine_id')
          .where('m.machine_number = :machineNumber', {
            machineNumber: item.machine_number,
          })
          .limit(1)
          .getRawOne();

        const expectedRaw = await this.transactionRepository
          .createQueryBuilder('t')
          .select('SUM(t.amount)', 'expected_amount')
          .where('t.machine_id = :machineId', {
            machineId: machine?.machine_id,
          })
          .andWhere('t.transaction_date BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
          })
          .andWhere("t.payment_method = 'cash'")
          .getRawOne();

        const collectedAmount = parseFloat(item.collected_amount);
        const expectedAmount = parseFloat(expectedRaw?.expected_amount || '0');
        const variance = collectedAmount - expectedAmount;
        const variancePercentage = expectedAmount > 0 ? (variance / expectedAmount) * 100 : 0;

        return {
          machine_number: item.machine_number || 'Unknown',
          machine_name: item.machine_name || 'Unknown',
          location_name: item.location_name || 'Unknown',
          collections_count: parseInt(item.collections_count),
          collected_amount: collectedAmount,
          expected_amount: expectedAmount,
          variance,
          variance_percentage: variancePercentage,
        };
      }),
    );

    return byMachine;
  }

  /**
   * Get collections by collector
   */
  private async getByCollector(
    startDate: Date,
    endDate: Date,
  ): Promise<CollectionsSummaryReport['by_collector']> {
    const collectorsRaw = await this.taskRepository
      .createQueryBuilder('t')
      .leftJoin('users', 'u', 't.assigned_to = u.id')
      .select('u.full_name', 'collector_name')
      .addSelect('COUNT(t.id)', 'collections_count')
      .addSelect('SUM(t.actual_amount)', 'total_amount')
      .where('t.type = :type', { type: 'collection' })
      .andWhere('t.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere('t.completed_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('u.full_name')
      .orderBy('SUM(t.actual_amount)', 'DESC')
      .getRawMany();

    return collectorsRaw.map((item) => {
      const totalAmount = parseFloat(item.total_amount);
      const collectionsCount = parseInt(item.collections_count);

      return {
        collector_name: item.collector_name || 'Unknown',
        collections_count: collectionsCount,
        total_amount: totalAmount,
        average_amount: collectionsCount > 0 ? totalAmount / collectionsCount : 0,
      };
    });
  }

  /**
   * Get significant discrepancies
   */
  private async getDiscrepancies(
    startDate: Date,
    endDate: Date,
  ): Promise<CollectionsSummaryReport['discrepancies']> {
    // Get all collection tasks with significant variance (>10%)
    const collectionsRaw = await this.taskRepository
      .createQueryBuilder('t')
      .leftJoin('machines', 'm', 't.machine_id = m.id')
      .select('t.id', 'task_id')
      .addSelect('m.machine_number', 'machine_number')
      .addSelect('t.completed_at', 'collection_date')
      .addSelect('t.actual_amount', 'collected_amount')
      .addSelect('t.expected_amount', 'expected_amount')
      .addSelect('t.status', 'status')
      .where('t.type = :type', { type: 'collection' })
      .andWhere('t.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere('t.completed_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('t.expected_amount IS NOT NULL')
      .getRawMany();

    const discrepancies = collectionsRaw
      .map((item) => {
        const collectedAmount = parseFloat(item.collected_amount || '0');
        const expectedAmount = parseFloat(item.expected_amount || '0');
        const variance = collectedAmount - expectedAmount;
        const variancePercentage =
          expectedAmount > 0 ? Math.abs(variance / expectedAmount) * 100 : 0;

        return {
          machine_number: item.machine_number || 'Unknown',
          collection_date: item.collection_date,
          collected_amount: collectedAmount,
          expected_amount: expectedAmount,
          variance,
          variance_percentage: variancePercentage,
          status: item.status,
        };
      })
      .filter((item) => item.variance_percentage > 10) // Only significant discrepancies
      .sort((a, b) => b.variance_percentage - a.variance_percentage);

    return discrepancies;
  }

  /**
   * Get daily collections trend
   */
  private async getDailyTrend(
    startDate: Date,
    endDate: Date,
  ): Promise<CollectionsSummaryReport['daily_trend']> {
    const trendRaw = await this.taskRepository
      .createQueryBuilder('t')
      .select('DATE(t.completed_at)', 'date')
      .addSelect('COUNT(t.id)', 'collections_count')
      .addSelect('SUM(t.actual_amount)', 'total_amount')
      .where('t.type = :type', { type: 'collection' })
      .andWhere('t.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere('t.completed_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(t.completed_at)')
      .orderBy('DATE(t.completed_at)', 'ASC')
      .getRawMany();

    return trendRaw.map((item) => ({
      date: item.date,
      collections_count: parseInt(item.collections_count),
      total_amount: parseFloat(item.total_amount),
    }));
  }
}
