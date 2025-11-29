import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { Task } from '@modules/tasks/entities/task.entity';
import { OperatorRating } from '@modules/operator-ratings/entities/operator-rating.entity';

export interface OperatorPerformanceReport {
  operator: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    phone: string;
  };
  period: {
    start_date: Date;
    end_date: Date;
  };
  rating: {
    overall_score: number;
    rating_grade: string;
    rank: number;
    timeliness_score: number;
    photo_quality_score: number;
    data_accuracy_score: number;
    customer_feedback_score: number;
    discipline_score: number;
  } | null;
  tasks: {
    total: number;
    completed: number;
    pending: number;
    in_progress: number;
    cancelled: number;
    completion_rate: number;
    by_type: Array<{
      type: string;
      count: number;
      completed: number;
      percentage: number;
    }>;
  };
  efficiency: {
    avg_completion_time_hours: number;
    tasks_on_time: number;
    tasks_late: number;
    punctuality_rate: number;
    productivity_score: number; // Tasks per day
  };
  generated_at: Date;
}

export interface AllOperatorsReport {
  period: {
    start_date: Date;
    end_date: Date;
  };
  summary: {
    total_operators: number;
    avg_overall_score: number;
    avg_tasks_per_operator: number;
    avg_completion_rate: number;
  };
  operators: Array<{
    operator_name: string;
    overall_score: number;
    rating_grade: string;
    rank: number;
    tasks_completed: number;
    completion_rate: number;
    punctuality_rate: number;
  }>;
  top_performers: Array<{
    operator_name: string;
    overall_score: number;
    tasks_completed: number;
  }>;
  low_performers: Array<{
    operator_name: string;
    overall_score: number;
    tasks_completed: number;
  }>;
  generated_at: Date;
}

@Injectable()
export class OperatorPerformanceReportService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(OperatorRating)
    private readonly ratingRepository: Repository<OperatorRating>,
  ) {}

  /**
   * Generate performance report for a specific operator
   */
  async generateOperatorReport(
    operatorId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<OperatorPerformanceReport> {
    const operator = await this.userRepository.findOne({
      where: { id: operatorId },
    });

    if (!operator) {
      throw new NotFoundException(`Operator with ID ${operatorId} not found`);
    }

    const [rating, tasks, efficiency] = await Promise.all([
      this.getOperatorRating(operatorId, startDate, endDate),
      this.getTasksData(operatorId, startDate, endDate),
      this.getEfficiencyData(operatorId, startDate, endDate),
    ]);

    return {
      operator: {
        id: operator.id,
        full_name: operator.full_name,
        email: operator.email,
        role: operator.role,
        phone: operator.phone || '',
      },
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      rating,
      tasks,
      efficiency,
      generated_at: new Date(),
    };
  }

  /**
   * Generate report for all operators
   */
  async generateAllOperatorsReport(startDate: Date, endDate: Date): Promise<AllOperatorsReport> {
    // Get all operators
    const operators = await this.userRepository
      .createQueryBuilder('u')
      .where("u.role IN ('operator', 'collector')")
      .andWhere('u.deleted_at IS NULL')
      .getMany();

    const operatorReports = await Promise.all(
      operators.map(async (op) => {
        const rating = await this.getOperatorRating(op.id, startDate, endDate);
        const tasks = await this.getTasksData(op.id, startDate, endDate);
        const efficiency = await this.getEfficiencyData(op.id, startDate, endDate);

        return {
          operator_name: op.full_name,
          overall_score: rating?.overall_score || 0,
          rating_grade: rating?.rating_grade || 'unrated',
          rank: rating?.rank || 0,
          tasks_completed: tasks.completed,
          completion_rate: tasks.completion_rate,
          punctuality_rate: efficiency.punctuality_rate,
        };
      }),
    );

    // Sort by overall score
    operatorReports.sort((a, b) => b.overall_score - a.overall_score);

    const summary = {
      total_operators: operators.length,
      avg_overall_score:
        operatorReports.reduce((sum, r) => sum + r.overall_score, 0) / operators.length || 0,
      avg_tasks_per_operator:
        operatorReports.reduce((sum, r) => sum + r.tasks_completed, 0) / operators.length || 0,
      avg_completion_rate:
        operatorReports.reduce((sum, r) => sum + r.completion_rate, 0) / operators.length || 0,
    };

    return {
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      summary,
      operators: operatorReports,
      top_performers: operatorReports.slice(0, 5).map((r) => ({
        operator_name: r.operator_name,
        overall_score: r.overall_score,
        tasks_completed: r.tasks_completed,
      })),
      low_performers: operatorReports.slice(-5).map((r) => ({
        operator_name: r.operator_name,
        overall_score: r.overall_score,
        tasks_completed: r.tasks_completed,
      })),
      generated_at: new Date(),
    };
  }

  /**
   * Get operator rating for period
   */
  private async getOperatorRating(
    operatorId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<OperatorPerformanceReport['rating']> {
    const rating = await this.ratingRepository.findOne({
      where: {
        operator_id: operatorId,
        period_start: startDate,
        period_end: endDate,
      },
    });

    if (!rating) {
      return null;
    }

    return {
      overall_score: rating.overall_score,
      rating_grade: rating.rating_grade,
      rank: rating.rank || 0,
      timeliness_score: rating.timeliness_score,
      photo_quality_score: rating.photo_quality_score,
      data_accuracy_score: rating.data_accuracy_score,
      customer_feedback_score: rating.customer_feedback_score,
      discipline_score: rating.discipline_score,
    };
  }

  /**
   * Get tasks data for operator
   */
  private async getTasksData(
    operatorId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<OperatorPerformanceReport['tasks']> {
    const tasksRaw = await this.taskRepository
      .createQueryBuilder('t')
      .select('COUNT(t.id)', 'total')
      .addSelect("SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END)", 'completed')
      .addSelect("SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END)", 'pending')
      .addSelect("SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END)", 'in_progress')
      .addSelect("SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END)", 'cancelled')
      .where('t.assigned_to = :operatorId', { operatorId })
      .andWhere('t.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const total = parseInt(tasksRaw?.total || '0');
    const completed = parseInt(tasksRaw?.completed || '0');
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // Get tasks by type
    const byTypeRaw = await this.taskRepository
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('COUNT(t.id)', 'count')
      .addSelect("SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END)", 'completed')
      .where('t.assigned_to = :operatorId', { operatorId })
      .andWhere('t.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('t.type')
      .getRawMany();

    const byType = byTypeRaw.map((item) => {
      const count = parseInt(item.count);
      return {
        type: item.type,
        count,
        completed: parseInt(item.completed),
        percentage: total > 0 ? (count / total) * 100 : 0,
      };
    });

    return {
      total,
      completed,
      pending: parseInt(tasksRaw?.pending || '0'),
      in_progress: parseInt(tasksRaw?.in_progress || '0'),
      cancelled: parseInt(tasksRaw?.cancelled || '0'),
      completion_rate: completionRate,
      by_type: byType,
    };
  }

  /**
   * Get efficiency data for operator
   */
  private async getEfficiencyData(
    operatorId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<OperatorPerformanceReport['efficiency']> {
    const tasks = await this.taskRepository
      .createQueryBuilder('t')
      .where('t.assigned_to = :operatorId', { operatorId })
      .andWhere('t.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere("t.status = 'completed'")
      .getMany();

    if (tasks.length === 0) {
      return {
        avg_completion_time_hours: 0,
        tasks_on_time: 0,
        tasks_late: 0,
        punctuality_rate: 0,
        productivity_score: 0,
      };
    }

    let totalCompletionTime = 0;
    let tasksOnTime = 0;
    let tasksLate = 0;

    for (const task of tasks) {
      if (task.completed_at && task.created_at) {
        const completionTime =
          (task.completed_at.getTime() - task.created_at.getTime()) / (1000 * 60 * 60);
        totalCompletionTime += completionTime;
      }

      if (task.completed_at && task.due_date) {
        if (task.completed_at <= task.due_date) {
          tasksOnTime++;
        } else {
          tasksLate++;
        }
      }
    }

    const avgCompletionTime = totalCompletionTime / tasks.length;
    const punctualityRate =
      tasksOnTime + tasksLate > 0 ? (tasksOnTime / (tasksOnTime + tasksLate)) * 100 : 0;

    // Productivity: tasks per day
    const daysDiff = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const productivityScore = tasks.length / daysDiff;

    return {
      avg_completion_time_hours: avgCompletionTime,
      tasks_on_time: tasksOnTime,
      tasks_late: tasksLate,
      punctuality_rate: punctualityRate,
      productivity_score: productivityScore,
    };
  }
}
