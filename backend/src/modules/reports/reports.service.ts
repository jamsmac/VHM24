import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Task, TaskStatus } from '../tasks/entities/task.entity';
import { Incident, IncidentStatus, IncidentPriority } from '../incidents/entities/incident.entity';
import { Complaint, ComplaintStatus } from '../complaints/entities/complaint.entity';
import { Machine, MachineStatus } from '../machines/entities/machine.entity';
import { UserRole } from '../users/entities/user.entity';
import { ReportFiltersDto } from './dto/report-filters.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
    @InjectRepository(Complaint)
    private readonly complaintRepository: Repository<Complaint>,
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
  ) {}

  /**
   * Сводный дашборд
   * PERFORMANCE: All queries run in parallel using Promise.all()
   */
  async getDashboard(filters: ReportFiltersDto) {
    const { dateFrom, dateTo } = this.getDateRange(filters);
    const now = new Date();

    // Run all independent queries in parallel for better performance
    const [
      revenue,
      expenses,
      collections,
      tasksTotal,
      tasksCompleted,
      tasksOverdue,
      incidentsOpen,
      incidentsCritical,
      complaintsNew,
      machinesActive,
      machinesTotal,
    ] = await Promise.all([
      // Financial metrics
      this.transactionRepository
        .createQueryBuilder('t')
        .select('SUM(t.amount)', 'total')
        .where('t.transaction_type = :type', { type: 'sale' })
        .andWhere('t.transaction_date BETWEEN :from AND :to', {
          from: dateFrom,
          to: dateTo,
        })
        .getRawOne(),

      this.transactionRepository
        .createQueryBuilder('t')
        .select('SUM(t.amount)', 'total')
        .where('t.transaction_type = :type', { type: 'expense' })
        .andWhere('t.transaction_date BETWEEN :from AND :to', {
          from: dateFrom,
          to: dateTo,
        })
        .getRawOne(),

      this.transactionRepository
        .createQueryBuilder('t')
        .select('SUM(t.amount)', 'total')
        .where('t.transaction_type = :type', { type: 'collection' })
        .andWhere('t.transaction_date BETWEEN :from AND :to', {
          from: dateFrom,
          to: dateTo,
        })
        .getRawOne(),

      // Tasks
      this.taskRepository.count(),
      this.taskRepository.count({
        where: { status: TaskStatus.COMPLETED },
      }),
      this.taskRepository
        .createQueryBuilder('task')
        .where('task.due_date < :now', { now })
        .andWhere('task.status NOT IN (:...statuses)', {
          statuses: ['completed', 'cancelled'],
        })
        .getCount(),

      // Incidents
      this.incidentRepository.count({
        where: { status: IncidentStatus.OPEN },
      }),
      this.incidentRepository.count({
        where: { priority: IncidentPriority.CRITICAL, status: IncidentStatus.OPEN },
      }),

      // Complaints
      this.complaintRepository.count({
        where: { status: ComplaintStatus.NEW },
      }),

      // Machines
      this.machineRepository.count({
        where: { status: MachineStatus.ACTIVE },
      }),
      this.machineRepository.count(),
    ]);

    return {
      period: { from: dateFrom, to: dateTo },
      financial: {
        revenue: parseFloat(revenue?.total) || 0,
        expenses: parseFloat(expenses?.total) || 0,
        collections: parseFloat(collections?.total) || 0,
        net_profit: (parseFloat(revenue?.total) || 0) - (parseFloat(expenses?.total) || 0),
      },
      tasks: {
        total: tasksTotal,
        completed: tasksCompleted,
        overdue: tasksOverdue,
        completion_rate:
          tasksTotal > 0 ? parseFloat(((tasksCompleted / tasksTotal) * 100).toFixed(1)) : 0,
      },
      incidents: {
        open: incidentsOpen,
        critical: incidentsCritical,
      },
      complaints: {
        new: complaintsNew,
      },
      machines: {
        active: machinesActive,
        total: machinesTotal,
      },
    };
  }

  /**
   * Отчет по аппарату
   */
  async getMachineReport(machineId: string, filters: ReportFiltersDto) {
    const { dateFrom, dateTo } = this.getDateRange(filters);

    const machine = await this.machineRepository.findOne({
      where: { id: machineId },
      relations: ['location'],
    });

    if (!machine) {
      throw new NotFoundException('Machine not found');
    }

    // Продажи
    const sales = await this.transactionRepository
      .createQueryBuilder('t')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.machine_id = :machineId', { machineId })
      .andWhere('t.transaction_type = :type', { type: 'sale' })
      .andWhere('t.transaction_date BETWEEN :from AND :to', {
        from: dateFrom,
        to: dateTo,
      })
      .getRawOne();

    // Инкассации
    const collections = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.machine_id = :machineId', { machineId })
      .andWhere('t.transaction_type = :type', { type: 'collection' })
      .andWhere('t.transaction_date BETWEEN :from AND :to', {
        from: dateFrom,
        to: dateTo,
      })
      .getRawOne();

    // Задачи
    const tasks = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.type_code', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('task.machine_id = :machineId', { machineId })
      .groupBy('task.type_code')
      .getRawMany();

    // Инциденты
    const incidents = await this.incidentRepository.count({
      where: { machine_id: machineId },
    });

    // Жалобы
    const complaints = await this.complaintRepository.count({
      where: { machine_id: machineId },
    });

    return {
      machine: {
        id: machine.id,
        machine_number: machine.machine_number,
        name: machine.name,
        status: machine.status,
        location: machine.location ? { name: machine.location.name } : undefined,
      },
      period: { from: dateFrom, to: dateTo },
      sales: {
        count: parseInt(sales?.count) || 0,
        total: parseFloat(sales?.total) || 0,
      },
      collections: {
        total: parseFloat(collections?.total) || 0,
      },
      tasks: tasks.map((t) => ({
        type: t.type,
        count: parseInt(t.count),
      })),
      incidents,
      complaints,
    };
  }

  /**
   * Отчет по пользователю (оператору)
   */
  async getUserReport(userId: string, filters: ReportFiltersDto) {
    const { dateFrom, dateTo } = this.getDateRange(filters);

    // Задачи
    const tasksCompleted = await this.taskRepository.count({
      where: {
        assigned_to_user_id: userId,
        status: TaskStatus.COMPLETED,
      },
    });

    const tasksOverdue = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.assigned_to_user_id = :userId', { userId })
      .andWhere('task.due_date < :now', { now: new Date() })
      .andWhere('task.status NOT IN (:...statuses)', {
        statuses: ['completed', 'cancelled'],
      })
      .getCount();

    // Инкассации
    const collections = await this.transactionRepository
      .createQueryBuilder('t')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.user_id = :userId', { userId })
      .andWhere('t.transaction_type = :type', { type: 'collection' })
      .andWhere('t.transaction_date BETWEEN :from AND :to', {
        from: dateFrom,
        to: dateTo,
      })
      .getRawOne();

    return {
      period: { from: dateFrom, to: dateTo },
      tasks: {
        completed: tasksCompleted,
        overdue: tasksOverdue,
      },
      collections: {
        count: parseInt(collections?.count) || 0,
        total: parseFloat(collections?.total) || 0,
      },
    };
  }

  /**
   * Вспомогательная функция для определения диапазона дат
   */
  private getDateRange(filters: ReportFiltersDto): {
    dateFrom: Date;
    dateTo: Date;
  } {
    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date;

    // Use start_date and end_date from filters, or default to today
    if (filters.start_date) {
      dateFrom = new Date(filters.start_date);
      dateFrom.setHours(0, 0, 0, 0);
    } else {
      dateFrom = new Date(now);
      dateFrom.setHours(0, 0, 0, 0);
    }

    if (filters.end_date) {
      dateTo = new Date(filters.end_date);
      dateTo.setHours(23, 59, 59, 999);
    } else {
      dateTo = new Date(now);
      dateTo.setHours(23, 59, 59, 999);
    }

    return { dateFrom, dateTo };
  }
}
