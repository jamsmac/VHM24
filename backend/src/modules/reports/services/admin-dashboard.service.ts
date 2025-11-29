import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThan } from 'typeorm';
import { Machine, MachineStatus } from '@modules/machines/entities/machine.entity';
import { Transaction } from '@modules/transactions/entities/transaction.entity';
import { Task, TaskStatus } from '@modules/tasks/entities/task.entity';
import { Incident, IncidentStatus } from '@modules/incidents/entities/incident.entity';
import { Complaint, ComplaintStatus } from '@modules/complaints/entities/complaint.entity';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { Location } from '@modules/locations/entities/location.entity';
import { MachineInventory } from '@modules/inventory/entities/machine-inventory.entity';
import { OperatorRating } from '@modules/operator-ratings/entities/operator-rating.entity';
import { startOfDay, startOfWeek, startOfMonth, subDays, subMonths } from 'date-fns';

export interface AdminDashboard {
  period: {
    current_date: Date;
    period_start: Date;
    period_end: Date;
  };
  network_overview: {
    total_machines: number;
    active_machines: number;
    offline_machines: number;
    machines_with_issues: number;
    total_locations: number;
    total_operators: number;
  };
  financial_summary: {
    today_revenue: number;
    week_revenue: number;
    month_revenue: number;
    yesterday_revenue: number;
    revenue_change_percent: number; // vs yesterday
    total_transactions_today: number;
  };
  revenue_trends: {
    daily: Array<{ date: string; revenue: number; transactions: number }>;
    weekly: Array<{ week_start: string; revenue: number }>;
    monthly: Array<{ month: string; revenue: number }>;
  };
  top_performers: {
    machines: Array<{
      machine_id: string;
      machine_number: string;
      machine_name: string;
      location_name: string;
      revenue: number;
      transactions: number;
    }>;
    locations: Array<{
      location_id: string;
      location_name: string;
      machines_count: number;
      revenue: number;
      transactions: number;
    }>;
    operators: Array<{
      operator_id: string;
      operator_name: string;
      tasks_completed: number;
      overall_rating: number;
      rating_grade: string;
    }>;
  };
  critical_alerts: {
    open_incidents: number;
    critical_incidents: number;
    unresolved_complaints: number;
    low_stock_machines: number;
    offline_machines: number;
    overdue_tasks: number;
  };
  tasks_overview: {
    total_pending: number;
    total_in_progress: number;
    total_completed_today: number;
    total_overdue: number;
    by_type: Array<{
      type: string;
      pending: number;
      in_progress: number;
      completed_today: number;
    }>;
  };
  incidents_summary: {
    open: number;
    in_progress: number;
    resolved_today: number;
    avg_resolution_time_hours: number;
  };
  complaints_summary: {
    new: number;
    in_review: number;
    resolved_today: number;
    nps_score: number;
  };
  inventory_alerts: {
    total_low_stock: number;
    total_out_of_stock: number;
    expiring_soon: number; // next 7 days
  };
  generated_at: Date;
}

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
    @InjectRepository(Complaint)
    private readonly complaintRepository: Repository<Complaint>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(MachineInventory)
    private readonly machineInventoryRepository: Repository<MachineInventory>,
    @InjectRepository(OperatorRating)
    private readonly operatorRatingRepository: Repository<OperatorRating>,
  ) {}

  /**
   * Generate comprehensive admin dashboard
   */
  async generateDashboard(): Promise<AdminDashboard> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const monthStart = startOfMonth(now);
    const yesterday = subDays(todayStart, 1);

    const [
      networkOverview,
      financialSummary,
      revenueTrends,
      topPerformers,
      criticalAlerts,
      tasksOverview,
      incidentsSummary,
      complaintsSummary,
      inventoryAlerts,
    ] = await Promise.all([
      this.getNetworkOverview(),
      this.getFinancialSummary(todayStart, yesterday),
      this.getRevenueTrends(now),
      this.getTopPerformers(monthStart, now),
      this.getCriticalAlerts(todayStart),
      this.getTasksOverview(todayStart),
      this.getIncidentsSummary(todayStart),
      this.getComplaintsSummary(todayStart),
      this.getInventoryAlerts(),
    ]);

    return {
      period: {
        current_date: now,
        period_start: monthStart,
        period_end: now,
      },
      network_overview: networkOverview,
      financial_summary: financialSummary,
      revenue_trends: revenueTrends,
      top_performers: topPerformers,
      critical_alerts: criticalAlerts,
      tasks_overview: tasksOverview,
      incidents_summary: incidentsSummary,
      complaints_summary: complaintsSummary,
      inventory_alerts: inventoryAlerts,
      generated_at: now,
    };
  }

  /**
   * Get network overview statistics
   */
  private async getNetworkOverview(): Promise<AdminDashboard['network_overview']> {
    const [machines, locations, operators] = await Promise.all([
      this.machineRepository.find(),
      this.locationRepository.count(),
      this.userRepository.count({ where: { role: UserRole.OPERATOR } }),
    ]);

    const activeMachines = machines.filter((m) => m.status === 'active').length;
    const offlineMachines = machines.filter(
      (m) => m.status === 'offline' || m.status === 'disabled',
    ).length;
    const machinesWithIssues = machines.filter(
      (m) => m.status === 'error' || m.status === 'maintenance',
    ).length;

    return {
      total_machines: machines.length,
      active_machines: activeMachines,
      offline_machines: offlineMachines,
      machines_with_issues: machinesWithIssues,
      total_locations: locations,
      total_operators: operators,
    };
  }

  /**
   * Get financial summary
   */
  private async getFinancialSummary(
    todayStart: Date,
    yesterday: Date,
  ): Promise<AdminDashboard['financial_summary']> {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const yesterdayEnd = todayStart;

    const [todayData, yesterdayData, weekData, monthData] = await Promise.all([
      this.getRevenueData(todayStart, now),
      this.getRevenueData(yesterday, yesterdayEnd),
      this.getRevenueData(weekStart, now),
      this.getRevenueData(monthStart, now),
    ]);

    const revenueChangePercent =
      yesterdayData.revenue > 0
        ? ((todayData.revenue - yesterdayData.revenue) / yesterdayData.revenue) * 100
        : 0;

    return {
      today_revenue: todayData.revenue,
      week_revenue: weekData.revenue,
      month_revenue: monthData.revenue,
      yesterday_revenue: yesterdayData.revenue,
      revenue_change_percent: revenueChangePercent,
      total_transactions_today: todayData.count,
    };
  }

  /**
   * Helper to get revenue data for a period
   */
  private async getRevenueData(
    startDate: Date,
    endDate: Date,
  ): Promise<{ revenue: number; count: number }> {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'revenue')
      .addSelect('COUNT(*)', 'count')
      .where('transaction.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return {
      revenue: Number(result?.revenue || 0),
      count: Number(result?.count || 0),
    };
  }

  /**
   * Get revenue trends (daily, weekly, monthly)
   */
  private async getRevenueTrends(now: Date): Promise<AdminDashboard['revenue_trends']> {
    const thirtyDaysAgo = subDays(now, 30);
    const twelveWeeksAgo = subDays(now, 84);
    const twelveMonthsAgo = subMonths(now, 12);

    const [daily, weekly, monthly] = await Promise.all([
      this.getDailyRevenueTrend(thirtyDaysAgo, now),
      this.getWeeklyRevenueTrend(twelveWeeksAgo, now),
      this.getMonthlyRevenueTrend(twelveMonthsAgo, now),
    ]);

    return { daily, weekly, monthly };
  }

  private async getDailyRevenueTrend(
    startDate: Date,
    endDate: Date,
  ): Promise<AdminDashboard['revenue_trends']['daily']> {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('DATE(transaction.transaction_date)', 'date')
      .addSelect('SUM(transaction.amount)', 'revenue')
      .addSelect('COUNT(*)', 'transactions')
      .where('transaction.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(transaction.transaction_date)')
      .orderBy('DATE(transaction.transaction_date)', 'ASC')
      .getRawMany();

    return result.map((r) => ({
      date: r.date,
      revenue: Number(r.revenue || 0),
      transactions: Number(r.transactions || 0),
    }));
  }

  private async getWeeklyRevenueTrend(
    startDate: Date,
    endDate: Date,
  ): Promise<AdminDashboard['revenue_trends']['weekly']> {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select(`DATE_TRUNC('week', transaction.transaction_date)`, 'week_start')
      .addSelect('SUM(transaction.amount)', 'revenue')
      .where('transaction.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy(`DATE_TRUNC('week', transaction.transaction_date)`)
      .orderBy(`DATE_TRUNC('week', transaction.transaction_date)`, 'ASC')
      .getRawMany();

    return result.map((r) => ({
      week_start: r.week_start,
      revenue: Number(r.revenue || 0),
    }));
  }

  private async getMonthlyRevenueTrend(
    startDate: Date,
    endDate: Date,
  ): Promise<AdminDashboard['revenue_trends']['monthly']> {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select(`TO_CHAR(transaction.transaction_date, 'YYYY-MM')`, 'month')
      .addSelect('SUM(transaction.amount)', 'revenue')
      .where('transaction.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy(`TO_CHAR(transaction.transaction_date, 'YYYY-MM')`)
      .orderBy(`TO_CHAR(transaction.transaction_date, 'YYYY-MM')`, 'ASC')
      .getRawMany();

    return result.map((r) => ({
      month: r.month,
      revenue: Number(r.revenue || 0),
    }));
  }

  /**
   * Get top performers (machines, locations, operators)
   */
  private async getTopPerformers(
    startDate: Date,
    endDate: Date,
  ): Promise<AdminDashboard['top_performers']> {
    const [machines, locations, operators] = await Promise.all([
      this.getTopMachines(startDate, endDate),
      this.getTopLocations(startDate, endDate),
      this.getTopOperators(startDate, endDate),
    ]);

    return { machines, locations, operators };
  }

  private async getTopMachines(
    startDate: Date,
    endDate: Date,
  ): Promise<AdminDashboard['top_performers']['machines']> {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.machine', 'machine')
      .leftJoin('machine.location', 'location')
      .select('transaction.machine_id', 'machine_id')
      .addSelect('machine.machine_number', 'machine_number')
      .addSelect('machine.name', 'machine_name')
      .addSelect('location.name', 'location_name')
      .addSelect('SUM(transaction.amount)', 'revenue')
      .addSelect('COUNT(*)', 'transactions')
      .where('transaction.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('transaction.machine_id')
      .addGroupBy('machine.machine_number')
      .addGroupBy('machine.name')
      .addGroupBy('location.name')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map((r) => ({
      machine_id: r.machine_id,
      machine_number: r.machine_number || 'Unknown',
      machine_name: r.machine_name || 'Unknown',
      location_name: r.location_name || 'Unknown',
      revenue: Number(r.revenue || 0),
      transactions: Number(r.transactions || 0),
    }));
  }

  private async getTopLocations(
    startDate: Date,
    endDate: Date,
  ): Promise<AdminDashboard['top_performers']['locations']> {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.machine', 'machine')
      .leftJoin('machine.location', 'location')
      .select('location.id', 'location_id')
      .addSelect('location.name', 'location_name')
      .addSelect('COUNT(DISTINCT machine.id)', 'machines_count')
      .addSelect('SUM(transaction.amount)', 'revenue')
      .addSelect('COUNT(*)', 'transactions')
      .where('transaction.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('location.id IS NOT NULL')
      .groupBy('location.id')
      .addGroupBy('location.name')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map((r) => ({
      location_id: r.location_id,
      location_name: r.location_name || 'Unknown',
      machines_count: Number(r.machines_count || 0),
      revenue: Number(r.revenue || 0),
      transactions: Number(r.transactions || 0),
    }));
  }

  private async getTopOperators(
    startDate: Date,
    endDate: Date,
  ): Promise<AdminDashboard['top_performers']['operators']> {
    const result = await this.operatorRatingRepository
      .createQueryBuilder('rating')
      .leftJoin('rating.operator', 'operator')
      .select('rating.operator_id', 'operator_id')
      .addSelect('operator.full_name', 'operator_name')
      .addSelect('SUM(rating.total_tasks)', 'tasks_completed')
      .addSelect('AVG(rating.overall_score)', 'overall_rating')
      .addSelect(
        `
        CASE
          WHEN AVG(rating.overall_score) >= 90 THEN 'Отлично'
          WHEN AVG(rating.overall_score) >= 75 THEN 'Хорошо'
          WHEN AVG(rating.overall_score) >= 60 THEN 'Удовлетворительно'
          WHEN AVG(rating.overall_score) >= 40 THEN 'Плохо'
          ELSE 'Очень плохо'
        END
      `,
        'rating_grade',
      )
      .where('rating.period_start >= :startDate', { startDate })
      .andWhere('rating.period_end <= :endDate', { endDate })
      .groupBy('rating.operator_id')
      .addGroupBy('operator.full_name')
      .orderBy('overall_rating', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map((r) => ({
      operator_id: r.operator_id,
      operator_name: r.operator_name || 'Unknown',
      tasks_completed: Number(r.tasks_completed || 0),
      overall_rating: Number(r.overall_rating || 0),
      rating_grade: r.rating_grade,
    }));
  }

  /**
   * Get critical alerts
   */
  private async getCriticalAlerts(todayStart: Date): Promise<AdminDashboard['critical_alerts']> {
    const [incidents, complaints, lowStockMachines, tasks] = await Promise.all([
      this.incidentRepository.find({
        where: [{ status: IncidentStatus.OPEN }, { status: IncidentStatus.IN_PROGRESS }],
      }),
      this.complaintRepository.count({
        where: [{ status: ComplaintStatus.NEW }, { status: ComplaintStatus.IN_REVIEW }],
      }),
      this.machineInventoryRepository
        .createQueryBuilder('mi')
        .where('mi.quantity <= mi.low_stock_threshold')
        .select('DISTINCT mi.machine_id')
        .getRawMany(),
      this.taskRepository.find({
        where: { status: TaskStatus.PENDING },
      }),
    ]);

    const criticalIncidents = incidents.filter((i) => i.priority === 'critical').length;
    const offlineMachines = await this.machineRepository.count({
      where: [{ status: MachineStatus.OFFLINE }, { status: MachineStatus.DISABLED }],
    });

    const now = new Date();
    const overdueTasks = tasks.filter((t) => t.due_date && new Date(t.due_date) < now).length;

    return {
      open_incidents: incidents.length,
      critical_incidents: criticalIncidents,
      unresolved_complaints: complaints,
      low_stock_machines: lowStockMachines.length,
      offline_machines: offlineMachines,
      overdue_tasks: overdueTasks,
    };
  }

  /**
   * Get tasks overview
   */
  private async getTasksOverview(todayStart: Date): Promise<AdminDashboard['tasks_overview']> {
    const [pending, inProgress, completedToday, allTasks] = await Promise.all([
      this.taskRepository.count({ where: { status: TaskStatus.PENDING } }),
      this.taskRepository.count({ where: { status: TaskStatus.IN_PROGRESS } }),
      this.taskRepository.count({
        where: {
          status: TaskStatus.COMPLETED,
          completed_at: MoreThanOrEqual(todayStart) as any,
        },
      }),
      this.taskRepository.find(),
    ]);

    const now = new Date();
    const overdue = allTasks.filter(
      (t) => t.status === TaskStatus.PENDING && t.due_date && new Date(t.due_date) < now,
    ).length;

    // Group by type
    const tasksByType = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.type', 'type')
      .addSelect('COUNT(*) FILTER (WHERE task.status = :pending)', 'pending')
      .addSelect('COUNT(*) FILTER (WHERE task.status = :inProgress)', 'in_progress')
      .addSelect(
        `COUNT(*) FILTER (WHERE task.status = :completed AND task.completed_at >= :todayStart)`,
        'completed_today',
      )
      .setParameter('pending', TaskStatus.PENDING)
      .setParameter('inProgress', TaskStatus.IN_PROGRESS)
      .setParameter('completed', TaskStatus.COMPLETED)
      .setParameter('todayStart', todayStart)
      .groupBy('task.type')
      .getRawMany();

    return {
      total_pending: pending,
      total_in_progress: inProgress,
      total_completed_today: completedToday,
      total_overdue: overdue,
      by_type: tasksByType.map((t) => ({
        type: t.type,
        pending: Number(t.pending || 0),
        in_progress: Number(t.in_progress || 0),
        completed_today: Number(t.completed_today || 0),
      })),
    };
  }

  /**
   * Get incidents summary
   */
  private async getIncidentsSummary(
    todayStart: Date,
  ): Promise<AdminDashboard['incidents_summary']> {
    const [open, inProgress, resolvedToday, avgResolution] = await Promise.all([
      this.incidentRepository.count({ where: { status: IncidentStatus.OPEN } }),
      this.incidentRepository.count({ where: { status: IncidentStatus.IN_PROGRESS } }),
      this.incidentRepository.count({
        where: {
          status: IncidentStatus.RESOLVED,
          resolved_at: MoreThanOrEqual(todayStart) as any,
        },
      }),
      this.getAvgIncidentResolutionTime(),
    ]);

    return {
      open,
      in_progress: inProgress,
      resolved_today: resolvedToday,
      avg_resolution_time_hours: avgResolution,
    };
  }

  private async getAvgIncidentResolutionTime(): Promise<number> {
    const result = await this.incidentRepository
      .createQueryBuilder('incident')
      .select(
        `AVG(EXTRACT(EPOCH FROM (incident.resolved_at - incident.reported_at)) / 3600)`,
        'avg_hours',
      )
      .where('incident.resolved_at IS NOT NULL')
      .getRawOne();

    return Number(result?.avg_hours || 0);
  }

  /**
   * Get complaints summary
   */
  private async getComplaintsSummary(
    todayStart: Date,
  ): Promise<AdminDashboard['complaints_summary']> {
    const [newComplaints, inReview, resolvedToday, npsScore] = await Promise.all([
      this.complaintRepository.count({ where: { status: ComplaintStatus.NEW } }),
      this.complaintRepository.count({ where: { status: ComplaintStatus.IN_REVIEW } }),
      this.complaintRepository.count({
        where: {
          status: ComplaintStatus.RESOLVED,
          resolved_at: MoreThanOrEqual(todayStart) as any,
        },
      }),
      this.calculateRecentNPS(),
    ]);

    return {
      new: newComplaints,
      in_review: inReview,
      resolved_today: resolvedToday,
      nps_score: npsScore,
    };
  }

  private async calculateRecentNPS(): Promise<number> {
    const thirtyDaysAgo = subDays(new Date(), 30);

    const complaints = await this.complaintRepository.find({
      where: {
        submitted_at: MoreThanOrEqual(thirtyDaysAgo) as any,
      },
    });

    const withRating = complaints.filter(
      (c) => c.rating !== null && c.rating >= 1 && c.rating <= 5,
    );

    if (withRating.length === 0) return 0;

    const promoters = withRating.filter((c) => c.rating === 5).length;
    const detractors = withRating.filter((c) => c.rating! >= 1 && c.rating! <= 3).length;

    const promotersPercent = (promoters / withRating.length) * 100;
    const detractorsPercent = (detractors / withRating.length) * 100;

    return promotersPercent - detractorsPercent;
  }

  /**
   * Get inventory alerts
   */
  private async getInventoryAlerts(): Promise<AdminDashboard['inventory_alerts']> {
    const [lowStock, outOfStock, expiringSoon] = await Promise.all([
      this.machineInventoryRepository
        .createQueryBuilder('mi')
        .where('mi.current_quantity > 0')
        .andWhere('mi.current_quantity <= mi.min_stock_level')
        .getCount(),
      this.machineInventoryRepository
        .createQueryBuilder('mi')
        .where('mi.current_quantity = 0')
        .getCount(),
      // Expiring soon would need warehouse inventory with expiry dates
      Promise.resolve(0), // Placeholder
    ]);

    return {
      total_low_stock: lowStock,
      total_out_of_stock: outOfStock,
      expiring_soon: expiringSoon,
    };
  }
}
