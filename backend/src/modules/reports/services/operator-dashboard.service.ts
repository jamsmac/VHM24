import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In, LessThanOrEqual } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from '@modules/tasks/entities/task.entity';
import { OperatorRating } from '@modules/operator-ratings/entities/operator-rating.entity';
import { Machine } from '@modules/machines/entities/machine.entity';
import { Incident } from '@modules/incidents/entities/incident.entity';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';

export interface OperatorDashboard {
  operator: {
    operator_id: string;
    operator_name: string;
    role: string;
  };
  period: {
    current_date: Date;
  };
  my_tasks: {
    total_pending: number;
    total_in_progress: number;
    completed_today: number;
    completed_this_week: number;
    completed_this_month: number;
    overdue: number;
    upcoming_tasks: Array<{
      task_id: string;
      task_type: string;
      machine_number: string;
      machine_name: string;
      location_name: string;
      location_address: string;
      priority: string;
      due_date: Date;
      status: string;
      estimated_duration_minutes: number;
    }>;
    in_progress_tasks: Array<{
      task_id: string;
      task_type: string;
      machine_number: string;
      machine_name: string;
      location_name: string;
      started_at: Date;
      estimated_duration_minutes: number;
    }>;
  };
  my_performance: {
    current_rating: number | null;
    rating_grade: string | null;
    rank: number | null;
    tasks_completed_this_month: number;
    completion_rate_percent: number;
    avg_completion_time_hours: number;
    punctuality_rate_percent: number;
    photo_compliance_rate_percent: number;
    improvement_suggestions: string[];
  };
  my_machines: {
    total_assigned: number;
    machines_list: Array<{
      machine_id: string;
      machine_number: string;
      machine_name: string;
      location_name: string;
      status: string;
      last_service_date: Date | null;
      next_collection_due: Date | null;
      next_refill_due: Date | null;
    }>;
  };
  my_schedule: {
    today_route: Array<{
      task_id: string;
      task_type: string;
      machine_number: string;
      location_name: string;
      location_address: string;
      scheduled_time: Date | null;
      priority: string;
      status: string;
    }>;
    estimated_total_duration_minutes: number;
    estimated_completion_time: Date | null;
  };
  alerts: {
    overdue_tasks: number;
    high_priority_tasks: number;
    machines_needing_attention: number;
    rating_below_threshold: boolean;
  };
  recent_activity: {
    completed_tasks: Array<{
      task_id: string;
      task_type: string;
      machine_number: string;
      completed_at: Date;
      duration_minutes: number;
    }>;
    reported_incidents: Array<{
      incident_id: string;
      machine_number: string;
      incident_type: string;
      reported_at: Date;
      status: string;
    }>;
  };
  generated_at: Date;
}

@Injectable()
export class OperatorDashboardService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(OperatorRating)
    private readonly operatorRatingRepository: Repository<OperatorRating>,
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
  ) {}

  /**
   * Generate comprehensive operator dashboard
   */
  async generateDashboard(
    operatorId: string,
    operatorName: string,
    operatorRole: string,
  ): Promise<OperatorDashboard> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    const [myTasks, myPerformance, myMachines, mySchedule, alerts, recentActivity] =
      await Promise.all([
        this.getMyTasks(operatorId, todayStart, weekStart, monthStart),
        this.getMyPerformance(operatorId, monthStart, now),
        this.getMyMachines(operatorId),
        this.getMySchedule(operatorId, todayStart),
        this.getAlerts(operatorId, monthStart),
        this.getRecentActivity(operatorId, weekStart),
      ]);

    return {
      operator: {
        operator_id: operatorId,
        operator_name: operatorName,
        role: operatorRole,
      },
      period: {
        current_date: now,
      },
      my_tasks: myTasks,
      my_performance: myPerformance,
      my_machines: myMachines,
      my_schedule: mySchedule,
      alerts,
      recent_activity: recentActivity,
      generated_at: now,
    };
  }

  /**
   * Get operator's tasks overview
   */
  private async getMyTasks(
    operatorId: string,
    todayStart: Date,
    weekStart: Date,
    monthStart: Date,
  ): Promise<OperatorDashboard['my_tasks']> {
    const now = new Date();

    const [
      pending,
      inProgress,
      completedToday,
      completedThisWeek,
      completedThisMonth,
      allPendingTasks,
      inProgressTasks,
    ] = await Promise.all([
      this.taskRepository.count({
        where: {
          assigned_to_user_id: operatorId,
          status: TaskStatus.PENDING,
        },
      }),
      this.taskRepository.count({
        where: {
          assigned_to_user_id: operatorId,
          status: TaskStatus.IN_PROGRESS,
        },
      }),
      this.taskRepository.count({
        where: {
          assigned_to_user_id: operatorId,
          status: TaskStatus.COMPLETED,
          completed_at: MoreThanOrEqual(todayStart),
        },
      }),
      this.taskRepository.count({
        where: {
          assigned_to_user_id: operatorId,
          status: TaskStatus.COMPLETED,
          completed_at: MoreThanOrEqual(weekStart),
        },
      }),
      this.taskRepository.count({
        where: {
          assigned_to_user_id: operatorId,
          status: TaskStatus.COMPLETED,
          completed_at: MoreThanOrEqual(monthStart),
        },
      }),
      this.taskRepository.find({
        where: {
          assigned_to_user_id: operatorId,
          status: TaskStatus.PENDING,
        },
        relations: ['machine', 'machine.location'],
        order: { due_date: 'ASC', priority: 'DESC' },
      }),
      this.taskRepository.find({
        where: {
          assigned_to_user_id: operatorId,
          status: TaskStatus.IN_PROGRESS,
        },
        relations: ['machine', 'machine.location'],
      }),
    ]);

    const overdue = allPendingTasks.filter((t) => t.due_date && new Date(t.due_date) < now).length;

    const upcomingTasks = allPendingTasks.slice(0, 10).map((t) => ({
      task_id: t.id,
      task_type: t.type_code as string,
      machine_number: t.machine?.machine_number || 'Unknown',
      machine_name: t.machine?.name || 'Unknown',
      location_name: t.machine?.location?.name || 'Unknown',
      location_address: t.machine?.location?.address || '',
      priority: t.priority as string,
      due_date: t.due_date || new Date(),
      status: t.status as string,
      estimated_duration_minutes: 60, // Default estimate as field doesn't exist in entity
    }));

    const inProgressTasksList = inProgressTasks.map((t) => ({
      task_id: t.id,
      task_type: t.type_code as string,
      machine_number: t.machine?.machine_number || 'Unknown',
      machine_name: t.machine?.name || 'Unknown',
      location_name: t.machine?.location?.name || 'Unknown',
      started_at: t.started_at || t.created_at,
      estimated_duration_minutes: 60, // Default estimate as field doesn't exist in entity
    }));

    return {
      total_pending: pending,
      total_in_progress: inProgress,
      completed_today: completedToday,
      completed_this_week: completedThisWeek,
      completed_this_month: completedThisMonth,
      overdue,
      upcoming_tasks: upcomingTasks,
      in_progress_tasks: inProgressTasksList,
    };
  }

  /**
   * Get operator's performance metrics
   */
  private async getMyPerformance(
    operatorId: string,
    monthStart: Date,
    _monthEnd: Date,
  ): Promise<OperatorDashboard['my_performance']> {
    const latestRating = await this.operatorRatingRepository.findOne({
      where: { operator_id: operatorId },
      order: { period_end: 'DESC' },
    });

    const tasksThisMonth = await this.taskRepository.count({
      where: {
        assigned_to_user_id: operatorId,
        status: TaskStatus.COMPLETED,
        completed_at: MoreThanOrEqual(monthStart),
      },
    });

    const allTasksThisMonth = await this.taskRepository.count({
      where: {
        assigned_to_user_id: operatorId,
        created_at: MoreThanOrEqual(monthStart),
      },
    });

    const completionRate = allTasksThisMonth > 0 ? (tasksThisMonth / allTasksThisMonth) * 100 : 0;

    // Generate improvement suggestions based on ratings
    const improvementSuggestions: string[] = [];
    if (latestRating) {
      if (latestRating.timeliness_score < 70) {
        improvementSuggestions.push('Улучшите пунктуальность выполнения задач');
      }
      if (latestRating.photo_quality_score < 70) {
        improvementSuggestions.push('Не забывайте делать фото до и после выполнения задач');
      }
      if (latestRating.data_accuracy_score < 70) {
        improvementSuggestions.push('Будьте внимательнее при подсчете инкассации');
      }
      if (latestRating.discipline_score < 70) {
        improvementSuggestions.push('Заполняйте чек-листы полностью');
      }
    }

    if (improvementSuggestions.length === 0) {
      improvementSuggestions.push('Отличная работа! Продолжайте в том же духе!');
    }

    return {
      current_rating: latestRating ? Number(latestRating.overall_score) : null,
      rating_grade: latestRating ? latestRating.rating_grade : null,
      rank: latestRating ? latestRating.rank : null,
      tasks_completed_this_month: tasksThisMonth,
      completion_rate_percent: completionRate,
      avg_completion_time_hours: latestRating
        ? Number(latestRating.avg_completion_time_hours || 0)
        : 0,
      punctuality_rate_percent: latestRating
        ? (Number(latestRating.tasks_on_time || 0) / Number(latestRating.total_tasks || 1)) * 100
        : 0,
      photo_compliance_rate_percent: latestRating
        ? Number(latestRating.photo_compliance_rate || 0)
        : 0,
      improvement_suggestions: improvementSuggestions,
    };
  }

  /**
   * Get operator's assigned machines
   */
  private async getMyMachines(operatorId: string): Promise<OperatorDashboard['my_machines']> {
    // Get machines that have tasks assigned to this operator
    const tasksWithMachines = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.machine', 'machine')
      .leftJoinAndSelect('machine.location', 'location')
      .where('task.assigned_to_user_id = :operatorId', { operatorId })
      .select('DISTINCT machine.id')
      .addSelect('machine.machine_number')
      .addSelect('machine.name')
      .addSelect('machine.status')
      .addSelect('location.name')
      .getRawMany();

    const machineIds = tasksWithMachines.map((t) => t.machine_id).filter(Boolean);

    if (machineIds.length === 0) {
      return {
        total_assigned: 0,
        machines_list: [],
      };
    }

    const machines = await this.machineRepository.find({
      where: { id: In(machineIds) },
      relations: ['location'],
    });

    const machinesList = await Promise.all(
      machines.map(async (machine) => {
        const [lastService, nextCollection, nextRefill] = await Promise.all([
          this.getLastServiceDate(machine.id),
          this.getNextDueDate(machine.id, operatorId, 'collection'),
          this.getNextDueDate(machine.id, operatorId, 'refill'),
        ]);

        return {
          machine_id: machine.id,
          machine_number: machine.machine_number,
          machine_name: machine.name,
          location_name: machine.location?.name || 'Unknown',
          status: machine.status,
          last_service_date: lastService,
          next_collection_due: nextCollection,
          next_refill_due: nextRefill,
        };
      }),
    );

    return {
      total_assigned: machines.length,
      machines_list: machinesList,
    };
  }

  private async getLastServiceDate(machineId: string): Promise<Date | null> {
    const lastTask = await this.taskRepository.findOne({
      where: {
        machine_id: machineId,
        status: TaskStatus.COMPLETED,
      },
      order: { completed_at: 'DESC' },
    });

    return lastTask?.completed_at || null;
  }

  private async getNextDueDate(
    machineId: string,
    operatorId: string,
    taskType: string,
  ): Promise<Date | null> {
    const nextTask = await this.taskRepository.findOne({
      where: {
        machine_id: machineId,
        assigned_to_user_id: operatorId,
        type_code: taskType as any,
        status: TaskStatus.PENDING,
      },
      order: { due_date: 'ASC' },
    });

    return nextTask?.due_date || null;
  }

  /**
   * Get operator's schedule for today
   */
  private async getMySchedule(
    operatorId: string,
    todayStart: Date,
  ): Promise<OperatorDashboard['my_schedule']> {
    const todayTasks = await this.taskRepository.find({
      where: {
        assigned_to_user_id: operatorId,
        status: In([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
        due_date: LessThanOrEqual(new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)),
      },
      relations: ['machine', 'machine.location'],
      order: { priority: 'DESC', due_date: 'ASC' },
    });

    const todayRoute = todayTasks.map((t) => ({
      task_id: t.id,
      task_type: t.type_code as string,
      machine_number: t.machine?.machine_number || 'Unknown',
      location_name: t.machine?.location?.name || 'Unknown',
      location_address: t.machine?.location?.address || '',
      scheduled_time: t.scheduled_date || null,
      priority: t.priority as string,
      status: t.status as string,
    }));

    const estimatedTotalDuration = todayTasks.reduce(
      (sum, _t) => sum + 60, // Default estimate as field doesn't exist in entity
      0,
    );

    const now = new Date();
    const estimatedCompletionTime = new Date(now.getTime() + estimatedTotalDuration * 60 * 1000);

    return {
      today_route: todayRoute,
      estimated_total_duration_minutes: estimatedTotalDuration,
      estimated_completion_time: todayRoute.length > 0 ? estimatedCompletionTime : null,
    };
  }

  /**
   * Get operator's alerts
   */
  private async getAlerts(
    operatorId: string,
    _monthStart: Date,
  ): Promise<OperatorDashboard['alerts']> {
    const now = new Date();

    const [pendingTasks, rating] = await Promise.all([
      this.taskRepository.find({
        where: {
          assigned_to_user_id: operatorId,
          status: TaskStatus.PENDING,
        },
        relations: ['machine'],
      }),
      this.operatorRatingRepository.findOne({
        where: { operator_id: operatorId },
        order: { period_end: 'DESC' },
      }),
    ]);

    const overdueTasks = pendingTasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now,
    ).length;

    const highPriorityTasks = pendingTasks.filter(
      (t) => t.priority === TaskPriority.HIGH || t.priority === TaskPriority.URGENT,
    ).length;

    const machinesNeedingAttention = new Set(
      pendingTasks
        .filter((t) => t.machine?.status && t.machine.status !== 'active')
        .map((t) => t.machine_id),
    ).size;

    const ratingBelowThreshold = rating ? Number(rating.overall_score) < 60 : false;

    return {
      overdue_tasks: overdueTasks,
      high_priority_tasks: highPriorityTasks,
      machines_needing_attention: machinesNeedingAttention,
      rating_below_threshold: ratingBelowThreshold,
    };
  }

  /**
   * Get operator's recent activity
   */
  private async getRecentActivity(
    operatorId: string,
    weekStart: Date,
  ): Promise<OperatorDashboard['recent_activity']> {
    const [completedTasks, reportedIncidents] = await Promise.all([
      this.taskRepository.find({
        where: {
          assigned_to_user_id: operatorId,
          status: TaskStatus.COMPLETED,
          completed_at: MoreThanOrEqual(weekStart),
        },
        relations: ['machine'],
        order: { completed_at: 'DESC' },
        take: 10,
      }),
      this.incidentRepository.find({
        where: {
          reported_by_user_id: operatorId,
          reported_at: MoreThanOrEqual(weekStart),
        },
        relations: ['machine'],
        order: { reported_at: 'DESC' },
        take: 10,
      }),
    ]);

    const completed = completedTasks.map((t) => {
      const durationMinutes =
        t.started_at && t.completed_at
          ? (new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / (1000 * 60)
          : 0;

      return {
        task_id: t.id,
        task_type: t.type_code as string,
        machine_number: t.machine?.machine_number || 'Unknown',
        completed_at: t.completed_at!,
        duration_minutes: durationMinutes,
      };
    });

    const incidents = reportedIncidents.map((i) => ({
      incident_id: i.id,
      machine_number: i.machine?.machine_number || 'Unknown',
      incident_type: i.incident_type,
      reported_at: new Date(i.reported_at),
      status: i.status,
    }));

    return {
      completed_tasks: completed,
      reported_incidents: incidents,
    };
  }
}
