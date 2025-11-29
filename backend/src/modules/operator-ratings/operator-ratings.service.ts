import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { OperatorRating } from './entities/operator-rating.entity';
import { Task } from '@modules/tasks/entities/task.entity';
import { File } from '@modules/files/entities/file.entity';
// import { TaskChecklistItem } from '@modules/tasks/entities/task-checklist-item.entity'; // Entity doesn't exist - checklist stored as JSONB in Task
import { TaskComment } from '@modules/tasks/entities/task-comment.entity';
import { Complaint } from '@modules/complaints/entities/complaint.entity';
import { User } from '@modules/users/entities/user.entity';
import { startOfDay, endOfDay, differenceInHours } from 'date-fns';

interface OperatorMetrics {
  timeliness: {
    total_tasks: number;
    tasks_on_time: number;
    tasks_late: number;
    avg_completion_time_hours: number;
    score: number;
  };
  photo_quality: {
    tasks_with_photos_before: number;
    tasks_with_photos_after: number;
    total_photos_uploaded: number;
    photo_compliance_rate: number;
    score: number;
  };
  data_accuracy: {
    collections_with_variance: number;
    avg_collection_variance_percent: number;
    inventory_discrepancies: number;
    score: number;
  };
  customer_feedback: {
    complaints_received: number;
    avg_customer_rating: number | null;
    positive_feedback_count: number;
    score: number;
  };
  discipline: {
    checklist_items_completed: number;
    checklist_items_total: number;
    checklist_completion_rate: number;
    comments_sent: number;
    score: number;
  };
}

@Injectable()
export class OperatorRatingsService {
  private readonly logger = new Logger(OperatorRatingsService.name);

  // Weights for each metric (must sum to 100)
  private readonly WEIGHTS = {
    TIMELINESS: 30,
    PHOTO_QUALITY: 25,
    DATA_ACCURACY: 20,
    CUSTOMER_FEEDBACK: 15,
    DISCIPLINE: 10,
  };

  constructor(
    @InjectRepository(OperatorRating)
    private readonly ratingRepository: Repository<OperatorRating>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    // @InjectRepository(TaskChecklistItem) // Entity doesn't exist - checklist stored as JSONB in Task
    // private readonly checklistRepository: Repository<TaskChecklistItem>,
    @InjectRepository(TaskComment)
    private readonly commentRepository: Repository<TaskComment>,
    @InjectRepository(Complaint)
    private readonly complaintRepository: Repository<Complaint>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Calculate ratings for all operators for a given period
   */
  async calculateRatingsForPeriod(periodStart: Date, periodEnd: Date): Promise<OperatorRating[]> {
    this.logger.log(
      `Calculating operator ratings for period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
    );

    // Get all operators (users with role 'operator' or 'collector')
    const operators = await this.userRepository
      .createQueryBuilder('u')
      .where("u.role IN ('operator', 'collector')")
      .andWhere('u.deleted_at IS NULL')
      .getMany();

    this.logger.log(`Found ${operators.length} operators`);

    const ratings: OperatorRating[] = [];

    for (const operator of operators) {
      const rating = await this.calculateOperatorRating(operator.id, periodStart, periodEnd);
      ratings.push(rating);
    }

    // Calculate ranks
    const rankedRatings = this.calculateRanks(ratings);

    // Save all ratings
    await this.ratingRepository.save(rankedRatings);

    this.logger.log(`Saved ${rankedRatings.length} operator ratings`);

    return rankedRatings;
  }

  /**
   * Calculate rating for a specific operator
   */
  async calculateOperatorRating(
    operatorId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<OperatorRating> {
    const metrics = await this.collectMetrics(operatorId, periodStart, periodEnd);

    // Calculate overall score
    const overallScore =
      (metrics.timeliness.score * this.WEIGHTS.TIMELINESS +
        metrics.photo_quality.score * this.WEIGHTS.PHOTO_QUALITY +
        metrics.data_accuracy.score * this.WEIGHTS.DATA_ACCURACY +
        metrics.customer_feedback.score * this.WEIGHTS.CUSTOMER_FEEDBACK +
        metrics.discipline.score * this.WEIGHTS.DISCIPLINE) /
      100;

    const grade = this.calculateGrade(overallScore);

    const rating = this.ratingRepository.create({
      operator_id: operatorId,
      period_start: periodStart,
      period_end: periodEnd,

      // Timeliness
      total_tasks: metrics.timeliness.total_tasks,
      tasks_on_time: metrics.timeliness.tasks_on_time,
      tasks_late: metrics.timeliness.tasks_late,
      avg_completion_time_hours: metrics.timeliness.avg_completion_time_hours,
      timeliness_score: metrics.timeliness.score,

      // Photo quality
      tasks_with_photos_before: metrics.photo_quality.tasks_with_photos_before,
      tasks_with_photos_after: metrics.photo_quality.tasks_with_photos_after,
      total_photos_uploaded: metrics.photo_quality.total_photos_uploaded,
      photo_compliance_rate: metrics.photo_quality.photo_compliance_rate,
      photo_quality_score: metrics.photo_quality.score,

      // Data accuracy
      collections_with_variance: metrics.data_accuracy.collections_with_variance,
      avg_collection_variance_percent: metrics.data_accuracy.avg_collection_variance_percent,
      inventory_discrepancies: metrics.data_accuracy.inventory_discrepancies,
      data_accuracy_score: metrics.data_accuracy.score,

      // Customer feedback
      complaints_received: metrics.customer_feedback.complaints_received,
      avg_customer_rating: metrics.customer_feedback.avg_customer_rating ?? null,
      positive_feedback_count: metrics.customer_feedback.positive_feedback_count,
      customer_feedback_score: metrics.customer_feedback.score,

      // Discipline
      checklist_items_completed: metrics.discipline.checklist_items_completed,
      checklist_items_total: metrics.discipline.checklist_items_total,
      checklist_completion_rate: metrics.discipline.checklist_completion_rate,
      comments_sent: metrics.discipline.comments_sent,
      discipline_score: metrics.discipline.score,

      // Overall
      overall_score: overallScore,
      rating_grade: grade,
    });

    return rating;
  }

  /**
   * Collect all metrics for an operator
   */
  private async collectMetrics(
    operatorId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<OperatorMetrics> {
    const [timeliness, photoQuality, dataAccuracy, customerFeedback, discipline] =
      await Promise.all([
        this.calculateTimelinessMetrics(operatorId, periodStart, periodEnd),
        this.calculatePhotoQualityMetrics(operatorId, periodStart, periodEnd),
        this.calculateDataAccuracyMetrics(operatorId, periodStart, periodEnd),
        this.calculateCustomerFeedbackMetrics(operatorId, periodStart, periodEnd),
        this.calculateDisciplineMetrics(operatorId, periodStart, periodEnd),
      ]);

    return {
      timeliness,
      photo_quality: photoQuality,
      data_accuracy: dataAccuracy,
      customer_feedback: customerFeedback,
      discipline,
    };
  }

  /**
   * Calculate timeliness metrics (30% weight)
   */
  private async calculateTimelinessMetrics(
    operatorId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<OperatorMetrics['timeliness']> {
    const tasks = await this.taskRepository
      .createQueryBuilder('t')
      .where('t.assigned_to = :operatorId', { operatorId })
      .andWhere('t.created_at BETWEEN :periodStart AND :periodEnd', {
        periodStart,
        periodEnd,
      })
      .andWhere("t.status = 'completed'")
      .getMany();

    const totalTasks = tasks.length;

    if (totalTasks === 0) {
      return {
        total_tasks: 0,
        tasks_on_time: 0,
        tasks_late: 0,
        avg_completion_time_hours: 0,
        score: 0,
      };
    }

    let tasksOnTime = 0;
    let tasksLate = 0;
    let totalCompletionTime = 0;

    for (const task of tasks) {
      if (task.completed_at && task.due_date) {
        if (task.completed_at <= task.due_date) {
          tasksOnTime++;
        } else {
          tasksLate++;
        }
      }

      if (task.completed_at && task.created_at) {
        totalCompletionTime += differenceInHours(task.completed_at, task.created_at);
      }
    }

    const avgCompletionTime = totalCompletionTime / totalTasks;
    const onTimeRate = (tasksOnTime / totalTasks) * 100;

    // Score: 70% based on on-time rate, 30% based on speed (inverse of avg time)
    // Assume 24 hours is standard, faster is better
    const speedScore = Math.max(0, 100 - (avgCompletionTime / 24) * 100);
    const score = onTimeRate * 0.7 + speedScore * 0.3;

    return {
      total_tasks: totalTasks,
      tasks_on_time: tasksOnTime,
      tasks_late: tasksLate,
      avg_completion_time_hours: avgCompletionTime,
      score: Math.min(100, Math.max(0, score)),
    };
  }

  /**
   * Calculate photo quality metrics (25% weight)
   */
  private async calculatePhotoQualityMetrics(
    operatorId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<OperatorMetrics['photo_quality']> {
    const tasks = await this.taskRepository
      .createQueryBuilder('t')
      .where('t.assigned_to = :operatorId', { operatorId })
      .andWhere('t.created_at BETWEEN :periodStart AND :periodEnd', {
        periodStart,
        periodEnd,
      })
      .andWhere("t.status = 'completed'")
      .getMany();

    const totalTasks = tasks.length;

    if (totalTasks === 0) {
      return {
        tasks_with_photos_before: 0,
        tasks_with_photos_after: 0,
        total_photos_uploaded: 0,
        photo_compliance_rate: 0,
        score: 0,
      };
    }

    let tasksWithPhotosBefore = 0;
    let tasksWithPhotosAfter = 0;
    let totalPhotos = 0;

    for (const task of tasks) {
      const photosBefore = await this.fileRepository.count({
        where: {
          entity_type: 'task',
          entity_id: task.id,
          category_code: 'task_photo_before',
        },
      });

      const photosAfter = await this.fileRepository.count({
        where: {
          entity_type: 'task',
          entity_id: task.id,
          category_code: 'task_photo_after',
        },
      });

      if (photosBefore > 0) tasksWithPhotosBefore++;
      if (photosAfter > 0) tasksWithPhotosAfter++;

      totalPhotos += photosBefore + photosAfter;
    }

    const complianceRate =
      ((tasksWithPhotosBefore + tasksWithPhotosAfter) / (totalTasks * 2)) * 100;

    // Score: 100% based on compliance rate
    const score = complianceRate;

    return {
      tasks_with_photos_before: tasksWithPhotosBefore,
      tasks_with_photos_after: tasksWithPhotosAfter,
      total_photos_uploaded: totalPhotos,
      photo_compliance_rate: complianceRate,
      score: Math.min(100, Math.max(0, score)),
    };
  }

  /**
   * Calculate data accuracy metrics (20% weight)
   */
  private async calculateDataAccuracyMetrics(
    operatorId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<OperatorMetrics['data_accuracy']> {
    // Get collection tasks with variance
    const collectionTasks = await this.taskRepository
      .createQueryBuilder('t')
      .where('t.assigned_to = :operatorId', { operatorId })
      .andWhere('t.created_at BETWEEN :periodStart AND :periodEnd', {
        periodStart,
        periodEnd,
      })
      .andWhere("t.type = 'collection'")
      .andWhere("t.status = 'completed'")
      .andWhere('t.expected_amount IS NOT NULL')
      .getMany();

    let collectionsWithVariance = 0;
    let totalVariancePercent = 0;

    for (const task of collectionTasks) {
      if (task.expected_cash_amount && task.actual_cash_amount) {
        const variance = Math.abs(task.actual_cash_amount - task.expected_cash_amount);
        const variancePercent = (variance / task.expected_cash_amount) * 100;

        if (variancePercent > 5) {
          // More than 5% variance
          collectionsWithVariance++;
          totalVariancePercent += variancePercent;
        }
      }
    }

    const avgVariancePercent =
      collectionsWithVariance > 0 ? totalVariancePercent / collectionsWithVariance : 0;

    // For MVP, we don't have inventory discrepancies tracked separately
    const inventoryDiscrepancies = 0;

    // Score: Lower variance is better
    // Perfect score (100) if avg variance < 2%, 0 if > 20%
    let score = 100;
    if (avgVariancePercent > 0) {
      score = Math.max(0, 100 - (avgVariancePercent / 20) * 100);
    }

    return {
      collections_with_variance: collectionsWithVariance,
      avg_collection_variance_percent: avgVariancePercent,
      inventory_discrepancies: inventoryDiscrepancies,
      score: Math.min(100, Math.max(0, score)),
    };
  }

  /**
   * Calculate customer feedback metrics (15% weight)
   */
  private async calculateCustomerFeedbackMetrics(
    operatorId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<OperatorMetrics['customer_feedback']> {
    // Get tasks assigned to this operator
    const operatorTasks = await this.taskRepository
      .createQueryBuilder('t')
      .select('t.machine_id')
      .where('t.assigned_to = :operatorId', { operatorId })
      .andWhere('t.created_at BETWEEN :periodStart AND :periodEnd', {
        periodStart,
        periodEnd,
      })
      .getMany();

    const machineIds = [...new Set(operatorTasks.map((t) => t.machine_id))];

    if (machineIds.length === 0) {
      return {
        complaints_received: 0,
        avg_customer_rating: null,
        positive_feedback_count: 0,
        score: 100, // Default score if no complaints
      };
    }

    // Get complaints for machines this operator serviced
    const complaints = await this.complaintRepository
      .createQueryBuilder('c')
      .where('c.machine_id IN (:...machineIds)', { machineIds })
      .andWhere('c.created_at BETWEEN :periodStart AND :periodEnd', {
        periodStart,
        periodEnd,
      })
      .getMany();

    const complaintsReceived = complaints.length;

    // Calculate average rating if available
    const ratingsRaw = await this.complaintRepository
      .createQueryBuilder('c')
      .select('AVG(c.customer_rating)', 'avg_rating')
      .addSelect('COUNT(c.id)', 'count')
      .where('c.machine_id IN (:...machineIds)', { machineIds })
      .andWhere('c.created_at BETWEEN :periodStart AND :periodEnd', {
        periodStart,
        periodEnd,
      })
      .andWhere('c.customer_rating IS NOT NULL')
      .getRawOne();

    const avgRating = ratingsRaw?.count > 0 ? parseFloat(ratingsRaw.avg_rating) : null;

    // Count positive feedback (rating >= 4)
    const positiveFeedback = await this.complaintRepository
      .createQueryBuilder('c')
      .where('c.machine_id IN (:...machineIds)', { machineIds })
      .andWhere('c.created_at BETWEEN :periodStart AND :periodEnd', {
        periodStart,
        periodEnd,
      })
      .andWhere('c.customer_rating >= 4')
      .getCount();

    // Score: Fewer complaints = better, higher avg rating = better
    // Base score 100, -10 for each complaint, +20 per star in avg rating
    let score = 100;
    score -= complaintsReceived * 10;
    if (avgRating) {
      score += (avgRating - 3) * 20; // Centered at 3 stars
    }

    return {
      complaints_received: complaintsReceived,
      avg_customer_rating: avgRating,
      positive_feedback_count: positiveFeedback,
      score: Math.min(100, Math.max(0, score)),
    };
  }

  /**
   * Calculate discipline metrics (10% weight)
   */
  private async calculateDisciplineMetrics(
    operatorId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<OperatorMetrics['discipline']> {
    // Get tasks
    const tasks = await this.taskRepository
      .createQueryBuilder('t')
      .where('t.assigned_to = :operatorId', { operatorId })
      .andWhere('t.created_at BETWEEN :periodStart AND :periodEnd', {
        periodStart,
        periodEnd,
      })
      .andWhere("t.status = 'completed'")
      .getMany();

    const taskIds = tasks.map((t) => t.id);

    if (taskIds.length === 0) {
      return {
        checklist_items_completed: 0,
        checklist_items_total: 0,
        checklist_completion_rate: 0,
        comments_sent: 0,
        score: 0,
      };
    }

    // Get checklist items from JSONB column in Task
    const tasksWithChecklists = await this.taskRepository.find({
      where: { id: In(taskIds) },
      select: ['id', 'checklist'],
    });

    let checklistTotal = 0;
    let checklistCompleted = 0;

    tasksWithChecklists.forEach((task) => {
      if (task.checklist && Array.isArray(task.checklist)) {
        task.checklist.forEach((item) => {
          checklistTotal++;
          if (item.completed) {
            checklistCompleted++;
          }
        });
      }
    });

    const checklistCompletionRate =
      checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;

    // Get comments sent
    const commentsSent = await this.commentRepository
      .createQueryBuilder('c')
      .where('c.task_id IN (:...taskIds)', { taskIds })
      .andWhere('c.user_id = :operatorId', { operatorId })
      .getCount();

    // Score: 80% checklist completion rate, 20% communication (comments)
    const checklistScore = checklistCompletionRate;
    const communicationScore = Math.min(100, commentsSent * 10); // 1 comment = 10 points
    const score = checklistScore * 0.8 + communicationScore * 0.2;

    return {
      checklist_items_completed: checklistCompleted,
      checklist_items_total: checklistTotal,
      checklist_completion_rate: checklistCompletionRate,
      comments_sent: commentsSent,
      score: Math.min(100, Math.max(0, score)),
    };
  }

  /**
   * Calculate grade based on overall score
   */
  private calculateGrade(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'average';
    if (score >= 40) return 'poor';
    return 'very_poor';
  }

  /**
   * Calculate ranks for all operators
   */
  private calculateRanks(ratings: OperatorRating[]): OperatorRating[] {
    // Sort by overall score descending
    const sorted = [...ratings].sort((a, b) => b.overall_score - a.overall_score);

    // Assign ranks
    sorted.forEach((rating, index) => {
      rating.rank = index + 1;
    });

    return sorted;
  }

  /**
   * Get rating for specific operator in a period
   */
  async getOperatorRating(
    operatorId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<OperatorRating | null> {
    return await this.ratingRepository.findOne({
      where: {
        operator_id: operatorId,
        period_start: periodStart,
        period_end: periodEnd,
      },
      relations: ['operator'],
    });
  }

  /**
   * Get all ratings for a period
   */
  async getAllRatings(periodStart: Date, periodEnd: Date): Promise<OperatorRating[]> {
    return await this.ratingRepository.find({
      where: {
        period_start: periodStart,
        period_end: periodEnd,
      },
      relations: ['operator'],
      order: {
        rank: 'ASC',
      },
    });
  }

  /**
   * Get operator's rating history
   */
  async getOperatorHistory(operatorId: string): Promise<OperatorRating[]> {
    return await this.ratingRepository.find({
      where: {
        operator_id: operatorId,
      },
      order: {
        period_start: 'DESC',
      },
    });
  }
}
