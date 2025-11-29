import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Machine, MachineStatus } from '../../machines/entities/machine.entity';
import { Transaction, TransactionType } from '../../transactions/entities/transaction.entity';
import { Task, TaskStatus } from '../../tasks/entities/task.entity';
import { Incident } from '../../incidents/entities/incident.entity';

export interface NetworkSummaryReport {
  period: {
    start_date: Date;
    end_date: Date;
  };
  machines: {
    total: number;
    active: number;
    offline: number;
    disabled: number;
    low_stock: number;
  };
  financial: {
    total_revenue: number;
    total_sales_count: number;
    total_expenses: number;
    total_collections: number;
    net_profit: number;
    average_revenue_per_machine: number;
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
    in_progress: number;
    overdue: number;
    completion_rate: number;
  };
  incidents: {
    total: number;
    open: number;
    resolved: number;
    average_resolution_time_hours: number;
  };
  top_machines: Array<{
    machine_number: string;
    location_name: string;
    total_revenue: number;
    sales_count: number;
  }>;
  generated_at: Date;
}

@Injectable()
export class NetworkSummaryService {
  private readonly logger = new Logger(NetworkSummaryService.name);

  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
  ) {}

  async generateReport(startDate: Date, endDate: Date): Promise<NetworkSummaryReport> {
    this.logger.log(
      'Generating network summary report for period: ' +
        startDate.toISOString() +
        ' to ' +
        endDate.toISOString(),
    );

    const [machineStats, financialStats, taskStats, incidentStats, topMachines] = await Promise.all(
      [
        this.getMachineStatistics(),
        this.getFinancialStatistics(startDate, endDate),
        this.getTaskStatistics(startDate, endDate),
        this.getIncidentStatistics(startDate, endDate),
        this.getTopMachines(startDate, endDate, 5),
      ],
    );

    return {
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      machines: machineStats,
      financial: financialStats,
      tasks: taskStats,
      incidents: incidentStats,
      top_machines: topMachines,
      generated_at: new Date(),
    };
  }

  private async getMachineStatistics() {
    const machines = await this.machineRepository.find();

    return {
      total: machines.length,
      active: machines.filter((m) => m.status === 'active').length,
      offline: machines.filter((m) => m.status === 'offline').length,
      disabled: machines.filter((m) => m.status === 'disabled').length,
      low_stock: machines.filter((m) => m.status === 'low_stock').length,
    };
  }

  private async getFinancialStatistics(startDate: Date, endDate: Date) {
    const transactions = await this.transactionRepository.find({
      where: {
        transaction_date: Between(startDate, endDate),
      },
    });

    const sales = transactions.filter((t) => t.transaction_type === TransactionType.SALE);
    const expenses = transactions.filter((t) => t.transaction_type === TransactionType.EXPENSE);
    const collections = transactions.filter(
      (t) => t.transaction_type === TransactionType.COLLECTION,
    );

    const totalRevenue = sales.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalCollections = collections.reduce((sum, t) => sum + Number(t.amount), 0);

    const machineCount = await this.machineRepository.count({
      where: { status: MachineStatus.ACTIVE },
    });

    return {
      total_revenue: totalRevenue,
      total_sales_count: sales.length,
      total_expenses: totalExpenses,
      total_collections: totalCollections,
      net_profit: totalRevenue - totalExpenses,
      average_revenue_per_machine: machineCount > 0 ? totalRevenue / machineCount : 0,
    };
  }

  private async getTaskStatistics(startDate: Date, endDate: Date) {
    const tasks = await this.taskRepository.find({
      where: {
        created_at: Between(startDate, endDate),
      },
    });

    const completed = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
    const pending = tasks.filter((t) => t.status === TaskStatus.PENDING).length;
    const inProgress = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
    const overdue = tasks.filter(
      (t) => t.due_date && t.due_date < new Date() && t.status !== TaskStatus.COMPLETED,
    ).length;

    return {
      total: tasks.length,
      completed,
      pending,
      in_progress: inProgress,
      overdue,
      completion_rate: tasks.length > 0 ? (completed / tasks.length) * 100 : 0,
    };
  }

  private async getIncidentStatistics(startDate: Date, endDate: Date) {
    const incidents = await this.incidentRepository.find({
      where: {
        created_at: Between(startDate, endDate),
      },
    });

    const resolved = incidents.filter((i) => i.status === 'resolved');
    const open = incidents.filter((i) => i.status === 'open' || i.status === 'in_progress');

    // Calculate average resolution time
    const resolvedWithTimes = resolved.filter((i) => i.resolved_at);
    let avgResolutionTime = 0;
    if (resolvedWithTimes.length > 0) {
      const totalTime = resolvedWithTimes.reduce((sum, i) => {
        const created = new Date(i.created_at).getTime();
        const resolved = new Date(i.resolved_at!).getTime();
        return sum + (resolved - created);
      }, 0);
      avgResolutionTime = totalTime / resolvedWithTimes.length / (1000 * 60 * 60); // Convert to hours
    }

    return {
      total: incidents.length,
      open: open.length,
      resolved: resolved.length,
      average_resolution_time_hours: avgResolutionTime,
    };
  }

  private async getTopMachines(startDate: Date, endDate: Date, limit: number) {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('machine.machine_number', 'machine_number')
      .addSelect('location.name', 'location_name')
      .addSelect('SUM(transaction.amount)', 'total_revenue')
      .addSelect('COUNT(transaction.id)', 'sales_count')
      .leftJoin('transaction.machine', 'machine')
      .leftJoin('machine.location', 'location')
      .where('transaction.transaction_type = :type', { type: TransactionType.SALE })
      .andWhere('transaction.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('machine.machine_number')
      .addGroupBy('location.name')
      .orderBy('total_revenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((r) => ({
      machine_number: r.machine_number || 'N/A',
      location_name: r.location_name || 'N/A',
      total_revenue: Number(r.total_revenue) || 0,
      sales_count: parseInt(r.sales_count) || 0,
    }));
  }
}
