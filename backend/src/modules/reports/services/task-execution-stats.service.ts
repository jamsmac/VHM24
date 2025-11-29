import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '@modules/tasks/entities/task.entity';

export interface TaskExecutionStatsReport {
  period: {
    start_date: Date;
    end_date: Date;
  };
  overall: {
    total_tasks: number;
    completed: number;
    pending: number;
    in_progress: number;
    cancelled: number;
    overdue: number;
    completion_rate: number;
    avg_completion_time_hours: number;
  };
  by_type: Array<{
    type: string;
    total: number;
    completed: number;
    pending: number;
    in_progress: number;
    cancelled: number;
    completion_rate: number;
    avg_completion_time_hours: number;
  }>;
  by_status: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  by_priority: Array<{
    priority: string;
    count: number;
    completed: number;
    avg_completion_time_hours: number;
  }>;
  timeline: Array<{
    date: string;
    created: number;
    completed: number;
    cancelled: number;
  }>;
  generated_at: Date;
}

@Injectable()
export class TaskExecutionStatsService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  /**
   * Generate task execution statistics report
   */
  async generateReport(startDate: Date, endDate: Date): Promise<TaskExecutionStatsReport> {
    const [overall, byType, byStatus, byPriority, timeline] = await Promise.all([
      this.getOverallStats(startDate, endDate),
      this.getStatsByType(startDate, endDate),
      this.getStatsByStatus(startDate, endDate),
      this.getStatsByPriority(startDate, endDate),
      this.getTimeline(startDate, endDate),
    ]);

    return {
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      overall,
      by_type: byType,
      by_status: byStatus,
      by_priority: byPriority,
      timeline,
      generated_at: new Date(),
    };
  }

  /**
   * Get overall task statistics
   */
  private async getOverallStats(
    startDate: Date,
    endDate: Date,
  ): Promise<TaskExecutionStatsReport['overall']> {
    const statsRaw = await this.taskRepository
      .createQueryBuilder('t')
      .select('COUNT(t.id)', 'total')
      .addSelect("SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END)", 'completed')
      .addSelect("SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END)", 'pending')
      .addSelect("SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END)", 'in_progress')
      .addSelect("SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END)", 'cancelled')
      .addSelect(
        "SUM(CASE WHEN t.deadline < NOW() AND t.status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END)",
        'overdue',
      )
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600)',
        'avg_completion_hours',
      )
      .where('t.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const total = parseInt(statsRaw?.total || '0');
    const completed = parseInt(statsRaw?.completed || '0');

    return {
      total_tasks: total,
      completed,
      pending: parseInt(statsRaw?.pending || '0'),
      in_progress: parseInt(statsRaw?.in_progress || '0'),
      cancelled: parseInt(statsRaw?.cancelled || '0'),
      overdue: parseInt(statsRaw?.overdue || '0'),
      completion_rate: total > 0 ? (completed / total) * 100 : 0,
      avg_completion_time_hours: parseFloat(statsRaw?.avg_completion_hours || '0'),
    };
  }

  /**
   * Get statistics by task type
   */
  private async getStatsByType(
    startDate: Date,
    endDate: Date,
  ): Promise<TaskExecutionStatsReport['by_type']> {
    const byTypeRaw = await this.taskRepository
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('COUNT(t.id)', 'total')
      .addSelect("SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END)", 'completed')
      .addSelect("SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END)", 'pending')
      .addSelect("SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END)", 'in_progress')
      .addSelect("SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END)", 'cancelled')
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600)',
        'avg_completion_hours',
      )
      .where('t.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('t.type')
      .getRawMany();

    return byTypeRaw.map((item) => {
      const total = parseInt(item.total);
      const completed = parseInt(item.completed);

      return {
        type: item.type,
        total,
        completed,
        pending: parseInt(item.pending),
        in_progress: parseInt(item.in_progress),
        cancelled: parseInt(item.cancelled),
        completion_rate: total > 0 ? (completed / total) * 100 : 0,
        avg_completion_time_hours: parseFloat(item.avg_completion_hours || '0'),
      };
    });
  }

  /**
   * Get statistics by status
   */
  private async getStatsByStatus(
    startDate: Date,
    endDate: Date,
  ): Promise<TaskExecutionStatsReport['by_status']> {
    const byStatusRaw = await this.taskRepository
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(t.id)', 'count')
      .where('t.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('t.status')
      .getRawMany();

    const total = byStatusRaw.reduce((sum, item) => sum + parseInt(item.count), 0);

    return byStatusRaw.map((item) => {
      const count = parseInt(item.count);
      return {
        status: item.status,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      };
    });
  }

  /**
   * Get statistics by priority
   */
  private async getStatsByPriority(
    startDate: Date,
    endDate: Date,
  ): Promise<TaskExecutionStatsReport['by_priority']> {
    const byPriorityRaw = await this.taskRepository
      .createQueryBuilder('t')
      .select('t.priority', 'priority')
      .addSelect('COUNT(t.id)', 'count')
      .addSelect("SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END)", 'completed')
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600)',
        'avg_completion_hours',
      )
      .where('t.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('t.priority')
      .getRawMany();

    return byPriorityRaw.map((item) => ({
      priority: item.priority || 'normal',
      count: parseInt(item.count),
      completed: parseInt(item.completed),
      avg_completion_time_hours: parseFloat(item.avg_completion_hours || '0'),
    }));
  }

  /**
   * Get daily timeline of task creation and completion
   */
  private async getTimeline(
    startDate: Date,
    endDate: Date,
  ): Promise<TaskExecutionStatsReport['timeline']> {
    // Tasks created per day
    const createdRaw = await this.taskRepository
      .createQueryBuilder('t')
      .select('DATE(t.created_at)', 'date')
      .addSelect('COUNT(t.id)', 'count')
      .where('t.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(t.created_at)')
      .orderBy('DATE(t.created_at)', 'ASC')
      .getRawMany();

    // Tasks completed per day
    const completedRaw = await this.taskRepository
      .createQueryBuilder('t')
      .select('DATE(t.completed_at)', 'date')
      .addSelect('COUNT(t.id)', 'count')
      .where('t.completed_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere("t.status = 'completed'")
      .groupBy('DATE(t.completed_at)')
      .orderBy('DATE(t.completed_at)', 'ASC')
      .getRawMany();

    // Tasks cancelled per day
    const cancelledRaw = await this.taskRepository
      .createQueryBuilder('t')
      .select('DATE(t.updated_at)', 'date')
      .addSelect('COUNT(t.id)', 'count')
      .where('t.updated_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere("t.status = 'cancelled'")
      .groupBy('DATE(t.updated_at)')
      .orderBy('DATE(t.updated_at)', 'ASC')
      .getRawMany();

    // Merge all timelines
    const dateMap = new Map<string, any>();

    createdRaw.forEach((item) => {
      dateMap.set(item.date, {
        date: item.date,
        created: parseInt(item.count),
        completed: 0,
        cancelled: 0,
      });
    });

    completedRaw.forEach((item) => {
      const existing = dateMap.get(item.date) || {
        date: item.date,
        created: 0,
        completed: 0,
        cancelled: 0,
      };
      existing.completed = parseInt(item.count);
      dateMap.set(item.date, existing);
    });

    cancelledRaw.forEach((item) => {
      const existing = dateMap.get(item.date) || {
        date: item.date,
        created: 0,
        completed: 0,
        cancelled: 0,
      };
      existing.cancelled = parseInt(item.count);
      dateMap.set(item.date, existing);
    });

    return Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }
}
