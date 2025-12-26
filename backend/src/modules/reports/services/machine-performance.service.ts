import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '@modules/transactions/entities/transaction.entity';
import { Task } from '@modules/tasks/entities/task.entity';
import { Incident } from '@modules/incidents/entities/incident.entity';
import { Machine } from '@modules/machines/entities/machine.entity';

/**
 * Note: Financial operations (expenses tracking) are not yet implemented.
 * Expense-related metrics return 0 until financial-operations module is built.
 */

export interface MachinePerformanceReport {
  machine: {
    id: string;
    machine_number: string;
    name: string;
    location_name: string;
    location_address: string;
    status: string;
    installed_at: Date;
  };
  period: {
    start_date: Date;
    end_date: Date;
  };
  sales: {
    total_revenue: number;
    total_transactions: number;
    average_transaction: number;
    payment_breakdown: Array<{
      payment_method: string;
      amount: number;
      transaction_count: number;
      percentage: number;
    }>;
    top_products: Array<{
      product_name: string;
      quantity_sold: number;
      revenue: number;
    }>;
  };
  tasks: {
    total: number;
    refills: number;
    collections: number;
    maintenance: number;
    repairs: number;
    completion_rate: number;
    average_completion_time_hours: number;
  };
  incidents: {
    total: number;
    by_type: Array<{
      type: string;
      count: number;
    }>;
    resolved: number;
    average_resolution_time_hours: number;
  };
  expenses: {
    total: number;
    by_category: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };
  profitability: {
    revenue: number;
    expenses: number;
    net_profit: number;
    profit_margin: number;
    roi: number; // Return on investment
  };
  uptime: {
    total_days: number;
    active_days: number;
    offline_days: number;
    uptime_percentage: number;
  };
  generated_at: Date;
}

@Injectable()
export class MachinePerformanceService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
  ) {}

  /**
   * Generate performance report for a specific machine
   */
  async generateReport(
    machineId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<MachinePerformanceReport> {
    const machine = await this.machineRepository.findOne({
      where: { id: machineId },
      relations: ['location'],
    });

    if (!machine) {
      throw new Error(`Machine with ID ${machineId} not found`);
    }

    const [sales, tasks, incidents, expenses, uptime] = await Promise.all([
      this.getSalesData(machineId, startDate, endDate),
      this.getTasksData(machineId, startDate, endDate),
      this.getIncidentsData(machineId, startDate, endDate),
      this.getExpensesData(machineId, startDate, endDate),
      this.getUptimeData(machineId, startDate, endDate),
    ]);

    // Calculate profitability
    const profitability = this.calculateProfitability(sales.total_revenue, expenses.total, machine);

    return {
      machine: {
        id: machine.id,
        machine_number: machine.machine_number,
        name: machine.name,
        location_name: machine.location?.name || 'Unknown',
        location_address: machine.location?.address || 'Unknown',
        status: machine.status,
        installed_at: machine.installation_date || new Date(),
      },
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      sales,
      tasks,
      incidents,
      expenses,
      profitability,
      uptime,
      generated_at: new Date(),
    };
  }

  /**
   * Get sales data for machine
   */
  private async getSalesData(
    machineId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<MachinePerformanceReport['sales']> {
    // Total revenue and transactions
    const totalStats = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total_revenue')
      .addSelect('COUNT(t.id)', 'total_transactions')
      .where('t.machine_id = :machineId', { machineId })
      .andWhere('t.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const totalRevenue = parseFloat(totalStats?.total_revenue || '0');
    const totalTransactions = parseInt(totalStats?.total_transactions || '0');
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Payment method breakdown
    const paymentBreakdownRaw = await this.transactionRepository
      .createQueryBuilder('t')
      .select('t.payment_method', 'payment_method')
      .addSelect('SUM(t.amount)', 'amount')
      .addSelect('COUNT(t.id)', 'transaction_count')
      .where('t.machine_id = :machineId', { machineId })
      .andWhere('t.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('t.payment_method')
      .getRawMany();

    const paymentBreakdown = paymentBreakdownRaw.map((item) => ({
      payment_method: item.payment_method,
      amount: parseFloat(item.amount),
      transaction_count: parseInt(item.transaction_count),
      percentage: totalRevenue > 0 ? (parseFloat(item.amount) / totalRevenue) * 100 : 0,
    }));

    // Top products
    const topProductsRaw = await this.transactionRepository
      .createQueryBuilder('t')
      .select('t.product_name', 'product_name')
      .addSelect('SUM(t.quantity)', 'quantity_sold')
      .addSelect('SUM(t.amount)', 'revenue')
      .where('t.machine_id = :machineId', { machineId })
      .andWhere('t.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('t.product_name')
      .orderBy('SUM(t.amount)', 'DESC')
      .limit(10)
      .getRawMany();

    const topProducts = topProductsRaw.map((item) => ({
      product_name: item.product_name,
      quantity_sold: parseInt(item.quantity_sold),
      revenue: parseFloat(item.revenue),
    }));

    return {
      total_revenue: totalRevenue,
      total_transactions: totalTransactions,
      average_transaction: averageTransaction,
      payment_breakdown: paymentBreakdown,
      top_products: topProducts,
    };
  }

  /**
   * Get tasks data for machine
   */
  private async getTasksData(
    machineId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<MachinePerformanceReport['tasks']> {
    const tasksRaw = await this.taskRepository
      .createQueryBuilder('t')
      .select('COUNT(t.id)', 'total')
      .addSelect("SUM(CASE WHEN t.type = 'refill' THEN 1 ELSE 0 END)", 'refills')
      .addSelect("SUM(CASE WHEN t.type = 'collection' THEN 1 ELSE 0 END)", 'collections')
      .addSelect("SUM(CASE WHEN t.type = 'maintenance' THEN 1 ELSE 0 END)", 'maintenance')
      .addSelect("SUM(CASE WHEN t.type = 'repair' THEN 1 ELSE 0 END)", 'repairs')
      .addSelect("SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END)", 'completed')
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600)',
        'avg_completion_hours',
      )
      .where('t.machine_id = :machineId', { machineId })
      .andWhere('t.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const total = parseInt(tasksRaw?.total || '0');
    const completed = parseInt(tasksRaw?.completed || '0');
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      refills: parseInt(tasksRaw?.refills || '0'),
      collections: parseInt(tasksRaw?.collections || '0'),
      maintenance: parseInt(tasksRaw?.maintenance || '0'),
      repairs: parseInt(tasksRaw?.repairs || '0'),
      completion_rate: completionRate,
      average_completion_time_hours: parseFloat(tasksRaw?.avg_completion_hours || '0'),
    };
  }

  /**
   * Get incidents data for machine
   */
  private async getIncidentsData(
    machineId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<MachinePerformanceReport['incidents']> {
    const incidentsRaw = await this.incidentRepository
      .createQueryBuilder('i')
      .select('i.type', 'type')
      .addSelect('COUNT(i.id)', 'count')
      .where('i.machine_id = :machineId', { machineId })
      .andWhere('i.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('i.type')
      .getRawMany();

    const byType = incidentsRaw.map((item) => ({
      type: item.type,
      count: parseInt(item.count),
    }));

    const total = byType.reduce((sum, item) => sum + item.count, 0);

    const resolvedStats = await this.incidentRepository
      .createQueryBuilder('i')
      .select('COUNT(i.id)', 'resolved')
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 3600)',
        'avg_resolution_hours',
      )
      .where('i.machine_id = :machineId', { machineId })
      .andWhere('i.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('i.status = :status', { status: 'resolved' })
      .getRawOne();

    return {
      total,
      by_type: byType,
      resolved: parseInt(resolvedStats?.resolved || '0'),
      average_resolution_time_hours: parseFloat(resolvedStats?.avg_resolution_hours || '0'),
    };
  }

  /**
   * Get expenses data for machine
   *
   * Note: Returns empty data until financial-operations module is implemented.
   * See module header comment for details.
   */
  private async getExpensesData(
    _machineId: string,
    _startDate: Date,
    _endDate: Date,
  ): Promise<MachinePerformanceReport['expenses']> {
    return {
      total: 0,
      by_category: [],
    };
  }

  /**
   * Calculate machine uptime
   */
  private async getUptimeData(
    machineId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<MachinePerformanceReport['uptime']> {
    // For MVP, calculate based on status changes in tasks or incidents
    // In future, this could be tracked more precisely
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Count days with incidents marked as 'machine_offline'
    const offlineDaysRaw = await this.incidentRepository
      .createQueryBuilder('i')
      .select('COUNT(DISTINCT DATE(i.created_at))', 'offline_days')
      .where('i.machine_id = :machineId', { machineId })
      .andWhere('i.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere("i.type IN ('machine_offline', 'error', 'breakdown')")
      .getRawOne();

    const offlineDays = parseInt(offlineDaysRaw?.offline_days || '0');
    const activeDays = totalDays - offlineDays;
    const uptimePercentage = totalDays > 0 ? (activeDays / totalDays) * 100 : 100;

    return {
      total_days: totalDays,
      active_days: activeDays,
      offline_days: offlineDays,
      uptime_percentage: uptimePercentage,
    };
  }

  /**
   * Calculate profitability metrics
   */
  private calculateProfitability(
    revenue: number,
    expenses: number,
    machine: Machine,
  ): MachinePerformanceReport['profitability'] {
    const netProfit = revenue - expenses;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    // Calculate ROI based on machine purchase price
    const purchasePrice = machine.purchase_price || 0;
    const roi = purchasePrice > 0 ? (netProfit / purchasePrice) * 100 : 0;

    return {
      revenue,
      expenses,
      net_profit: netProfit,
      profit_margin: profitMargin,
      roi,
    };
  }
}
