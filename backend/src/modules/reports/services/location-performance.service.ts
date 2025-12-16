import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '@modules/locations/entities/location.entity';
import { Machine } from '@modules/machines/entities/machine.entity';
import { Transaction } from '@modules/transactions/entities/transaction.entity';
// TODO: Import FinancialOperation when financial-operations module is implemented
// import { FinancialOperation } from '@modules/financial-operations/entities/financial-operation.entity';

export interface LocationPerformanceReport {
  location: {
    id: string;
    name: string;
    address: string;
    type: string;
    owner_name: string;
  };
  period: {
    start_date: Date;
    end_date: Date;
  };
  machines: {
    total: number;
    active: number;
    offline: number;
    performance: Array<{
      machine_number: string;
      machine_name: string;
      revenue: number;
      transactions: number;
      status: string;
    }>;
  };
  financial: {
    total_revenue: number;
    total_expenses: number;
    owner_commission: number;
    net_profit: number;
    profit_margin: number;
    average_revenue_per_machine: number;
  };
  top_performers: Array<{
    machine_number: string;
    revenue: number;
    contribution_percentage: number;
  }>;
  generated_at: Date;
}

@Injectable()
export class LocationPerformanceService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    // TODO: Re-enable when financial-operations module is implemented
    // @InjectRepository(FinancialOperation)
    // private readonly financialOperationRepository: Repository<FinancialOperation>,
  ) {}

  /**
   * Generate performance report for a specific location
   */
  async generateReport(
    locationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LocationPerformanceReport> {
    const location = await this.locationRepository.findOne({
      where: { id: locationId },
      relations: ['owner'],
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    const [machines, financial] = await Promise.all([
      this.getMachinesData(locationId, startDate, endDate),
      this.getFinancialData(locationId, startDate, endDate),
    ]);

    // Get top performers
    const topPerformers = machines.performance
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((machine) => ({
        machine_number: machine.machine_number,
        revenue: machine.revenue,
        contribution_percentage:
          financial.total_revenue > 0 ? (machine.revenue / financial.total_revenue) * 100 : 0,
      }));

    return {
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
        type: location.type_code,
        owner_name: location.counterparty?.name || 'Unknown',
      },
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      machines,
      financial,
      top_performers: topPerformers,
      generated_at: new Date(),
    };
  }

  /**
   * Get machines data for location
   *
   * PERF-2: Optimized to use bulk queries instead of N+1 pattern
   * Previously: 1 query per machine for stats
   * Now: 2 queries total regardless of machine count
   */
  private async getMachinesData(
    locationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LocationPerformanceReport['machines']> {
    // 1. Get all machines for location (single query)
    const machines = await this.machineRepository.find({
      where: { location_id: locationId },
    });

    const total = machines.length;
    const active = machines.filter((m) => m.status === 'active').length;
    const offline = machines.filter(
      (m) => m.status === 'offline' || m.status === 'disabled',
    ).length;

    if (machines.length === 0) {
      return {
        total,
        active,
        offline,
        performance: [],
      };
    }

    const machineIds = machines.map((m) => m.id);

    // 2. Get stats for all machines in a single query
    const statsRaw = await this.transactionRepository
      .createQueryBuilder('t')
      .select('t.machine_id', 'machine_id')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'revenue')
      .addSelect('COUNT(t.id)', 'transactions')
      .where('t.machine_id IN (:...machineIds)', { machineIds })
      .andWhere('t.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('t.machine_id')
      .getRawMany();

    // Create lookup map for O(1) access
    const statsMap = new Map(
      statsRaw.map((s) => [
        s.machine_id,
        {
          revenue: parseFloat(s.revenue || '0'),
          transactions: parseInt(s.transactions || '0'),
        },
      ]),
    );

    // 3. Combine results in memory
    const performance = machines.map((machine) => {
      const stats = statsMap.get(machine.id) || { revenue: 0, transactions: 0 };
      return {
        machine_number: machine.machine_number,
        machine_name: machine.name,
        revenue: stats.revenue,
        transactions: stats.transactions,
        status: machine.status,
      };
    });

    return {
      total,
      active,
      offline,
      performance,
    };
  }

  /**
   * Get financial data for location
   */
  private async getFinancialData(
    locationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LocationPerformanceReport['financial']> {
    // Get all machine IDs for this location
    const machines = await this.machineRepository.find({
      where: { location_id: locationId },
      select: ['id'],
    });

    const machineIds = machines.map((m) => m.id);

    if (machineIds.length === 0) {
      return {
        total_revenue: 0,
        total_expenses: 0,
        owner_commission: 0,
        net_profit: 0,
        profit_margin: 0,
        average_revenue_per_machine: 0,
      };
    }

    // Total revenue
    const revenueRaw = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total_revenue')
      .where('t.machine_id IN (:...machineIds)', { machineIds })
      .andWhere('t.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const totalRevenue = parseFloat(revenueRaw?.total_revenue || '0');

    // TODO: Re-enable when financial-operations module is implemented
    // Total expenses for machines at this location
    // const expensesRaw = await this.financialOperationRepository
    //   .createQueryBuilder('f')
    //   .select('SUM(f.amount)', 'total_expenses')
    //   .where('f.machine_id IN (:...machineIds)', { machineIds })
    //   .andWhere('f.operation_date BETWEEN :startDate AND :endDate', {
    //     startDate,
    //     endDate,
    //   })
    //   .andWhere('f.type = :type', { type: 'expense' })
    //   .getRawOne();

    const totalExpenses = 0; // parseFloat(expensesRaw?.total_expenses || '0');

    // Owner commission (if location-based commission operations exist)
    // const commissionRaw = await this.financialOperationRepository
    //   .createQueryBuilder('f')
    //   .select('SUM(f.amount)', 'owner_commission')
    //   .where('f.location_id = :locationId', { locationId })
    //   .andWhere('f.operation_date BETWEEN :startDate AND :endDate', {
    //     startDate,
    //     endDate,
    //   })
    //   .andWhere('f.category = :category', { category: 'commission' })
    //   .andWhere('f.type = :type', { type: 'expense' })
    //   .getRawOne();

    const ownerCommission = 0; // parseFloat(commissionRaw?.owner_commission || '0');

    // Calculate metrics
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const averageRevenuePerMachine = machines.length > 0 ? totalRevenue / machines.length : 0;

    return {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      owner_commission: ownerCommission,
      net_profit: netProfit,
      profit_margin: profitMargin,
      average_revenue_per_machine: averageRevenuePerMachine,
    };
  }
}
