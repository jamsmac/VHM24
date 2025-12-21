# Operator Ratings Module

## Overview

The Operator Ratings module provides comprehensive performance tracking for field operators in VendHub Manager. It calculates ratings based on timeliness, photo quality, data accuracy, customer feedback, and discipline.

## Key Features

- Multi-dimensional performance scoring
- Weighted rating calculation
- Period-based rating snapshots
- Ranking among operators
- Performance trend analysis
- Notification system for ratings

## Entity

### OperatorRating

**File**: `backend/src/modules/operator-ratings/entities/operator-rating.entity.ts`

```typescript
@Entity('operator_ratings')
@Index(['operator_id', 'period_start', 'period_end'])
@Index(['period_start', 'period_end'])
export class OperatorRating extends BaseEntity {
  operator_id: string;             // Operator (User) reference

  // Rating period
  period_start: Date;
  period_end: Date;

  // Timeliness metrics (30% weight)
  total_tasks: number;
  tasks_on_time: number;
  tasks_late: number;
  avg_completion_time_hours: number;
  timeliness_score: number;        // 0-100

  // Photo quality metrics (25% weight)
  tasks_with_photos_before: number;
  tasks_with_photos_after: number;
  total_photos_uploaded: number;
  photo_compliance_rate: number;   // Percentage
  photo_quality_score: number;     // 0-100

  // Data accuracy metrics (20% weight)
  collections_with_variance: number;
  avg_collection_variance_percent: number;
  inventory_discrepancies: number;
  data_accuracy_score: number;     // 0-100

  // Customer feedback metrics (15% weight)
  complaints_received: number;
  avg_customer_rating: number;     // 1-5 stars
  positive_feedback_count: number;
  customer_feedback_score: number; // 0-100

  // Discipline metrics (10% weight)
  checklist_items_completed: number;
  checklist_items_total: number;
  checklist_completion_rate: number;
  comments_sent: number;
  discipline_score: number;        // 0-100

  // Overall rating
  overall_score: number;           // Weighted average: 0-100
  rating_grade: string;            // 'excellent', 'good', 'average', 'poor'
  rank: number;                    // Rank among all operators

  notes: Record<string, any>;
  notification_sent_at: Date;
}
```

## Rating Categories

### Weight Distribution

| Category | Weight | Description |
|----------|--------|-------------|
| Timeliness | 30% | Task completion on time |
| Photo Quality | 25% | Photo compliance and quality |
| Data Accuracy | 20% | Collection and inventory accuracy |
| Customer Feedback | 15% | Customer ratings and complaints |
| Discipline | 10% | Checklist completion, communication |

### Rating Grades

| Grade | Score Range | Description |
|-------|-------------|-------------|
| Excellent | 90-100 | Outstanding performance |
| Good | 75-89 | Above average |
| Average | 50-74 | Meets expectations |
| Poor | 0-49 | Needs improvement |
| Unrated | - | No data available |

## Score Calculation

### Overall Score Formula

```typescript
const overallScore =
  (timeliness_score * 0.30) +
  (photo_quality_score * 0.25) +
  (data_accuracy_score * 0.20) +
  (customer_feedback_score * 0.15) +
  (discipline_score * 0.10);
```

### Timeliness Score

```typescript
function calculateTimelinessScore(operator: OperatorMetrics): number {
  if (operator.total_tasks === 0) return 100;

  const onTimeRate = operator.tasks_on_time / operator.total_tasks;
  const avgTimeBonus = Math.max(0, 1 - (operator.avg_completion_time_hours / 8));

  return Math.min(100, (onTimeRate * 80) + (avgTimeBonus * 20));
}
```

### Photo Quality Score

```typescript
function calculatePhotoScore(operator: OperatorMetrics): number {
  if (operator.total_tasks === 0) return 100;

  // Photos before required for refill/collection tasks
  const beforeCompliance = operator.tasks_with_photos_before / operator.total_tasks;
  // Photos after required for all completed tasks
  const afterCompliance = operator.tasks_with_photos_after / operator.total_tasks;

  // Average compliance
  const complianceRate = (beforeCompliance + afterCompliance) / 2;

  // Bonus for extra photos (documentation thoroughness)
  const avgPhotosPerTask = operator.total_photos_uploaded / operator.total_tasks;
  const photoBonus = Math.min(10, avgPhotosPerTask * 2);

  return Math.min(100, (complianceRate * 90) + photoBonus);
}
```

### Data Accuracy Score

```typescript
function calculateDataAccuracyScore(operator: OperatorMetrics): number {
  let score = 100;

  // Deduct for collection variances
  if (operator.avg_collection_variance_percent > 5) {
    score -= (operator.avg_collection_variance_percent - 5) * 2;
  }

  // Deduct for inventory discrepancies
  score -= operator.inventory_discrepancies * 5;

  return Math.max(0, score);
}
```

### Customer Feedback Score

```typescript
function calculateFeedbackScore(operator: OperatorMetrics): number {
  let score = 80;  // Base score if no feedback

  // Boost from positive ratings
  if (operator.avg_customer_rating) {
    score = (operator.avg_customer_rating / 5) * 100;
  }

  // Penalty for complaints
  score -= operator.complaints_received * 10;

  // Bonus for positive feedback
  score += operator.positive_feedback_count * 2;

  return Math.max(0, Math.min(100, score));
}
```

### Discipline Score

```typescript
function calculateDisciplineScore(operator: OperatorMetrics): number {
  let score = 100;

  // Checklist completion
  if (operator.checklist_items_total > 0) {
    const checklistRate = operator.checklist_items_completed / operator.checklist_items_total;
    score = checklistRate * 80;
  }

  // Communication bonus
  const communicationBonus = Math.min(20, operator.comments_sent * 2);
  score += communicationBonus;

  return Math.min(100, score);
}
```

## API Endpoints

```
GET    /api/operator-ratings              List all ratings
GET    /api/operator-ratings/:id          Get rating by ID
GET    /api/operator-ratings/operator/:id Get operator's ratings
GET    /api/operator-ratings/leaderboard  Get top operators
POST   /api/operator-ratings/calculate    Calculate ratings for period
```

### Query Filters

```
GET /api/operator-ratings?period_start=2025-01-01&period_end=2025-01-31&min_score=50
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `operator_id` | uuid | Filter by operator |
| `period_start` | date | Period start date |
| `period_end` | date | Period end date |
| `min_score` | number | Minimum overall score |
| `grade` | string | Filter by grade |

## DTOs

### RatingFiltersDto

```typescript
class RatingFiltersDto {
  @IsOptional()
  @IsUUID()
  operator_id?: string;

  @IsOptional()
  @IsDate()
  period_start?: Date;

  @IsOptional()
  @IsDate()
  period_end?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  min_score?: number;

  @IsOptional()
  @IsString()
  grade?: string;
}
```

## Service Methods

### OperatorRatingsService

| Method | Description |
|--------|-------------|
| `calculateRating()` | Calculate rating for single operator |
| `calculateAllRatings()` | Calculate ratings for all operators |
| `findByOperator()` | Get operator's rating history |
| `getLeaderboard()` | Get ranked list of operators |
| `getRatingTrend()` | Get operator's score trend over time |
| `notifyOperator()` | Send rating notification |

## Rating Calculation Process

### Monthly Calculation

```typescript
@Cron('0 6 1 * *')  // 1st of every month at 6 AM
async calculateMonthlyRatings(): Promise<void> {
  const lastMonth = this.getLastMonthRange();
  const operators = await this.userService.getOperators();

  for (const operator of operators) {
    // Gather metrics
    const taskMetrics = await this.taskService.getMetricsForPeriod(
      operator.id,
      lastMonth.start,
      lastMonth.end
    );

    const feedbackMetrics = await this.complaintService.getMetricsForPeriod(
      operator.id,
      lastMonth.start,
      lastMonth.end
    );

    // Calculate scores
    const rating = this.calculateRating(operator.id, taskMetrics, feedbackMetrics);

    // Save rating
    await this.ratingRepository.save(rating);

    // Send notification
    await this.notifyOperator(operator.id, rating);
  }

  // Calculate ranks
  await this.calculateRanks(lastMonth.start, lastMonth.end);
}
```

### Real-Time Updates

```typescript
async updateRatingOnTaskComplete(taskId: string): Promise<void> {
  const task = await this.taskService.findOne(taskId);
  const currentPeriod = this.getCurrentMonthRange();

  let rating = await this.ratingRepository.findOne({
    where: {
      operator_id: task.assigned_to_id,
      period_start: currentPeriod.start,
      period_end: currentPeriod.end,
    }
  });

  if (!rating) {
    rating = this.createNewRating(task.assigned_to_id, currentPeriod);
  }

  // Update metrics
  rating.total_tasks++;

  if (task.completed_at <= task.due_date) {
    rating.tasks_on_time++;
  } else {
    rating.tasks_late++;
  }

  // Recalculate scores
  rating.timeliness_score = this.calculateTimelinessScore(rating);
  rating.overall_score = this.calculateOverallScore(rating);
  rating.rating_grade = this.determineGrade(rating.overall_score);

  await this.ratingRepository.save(rating);
}
```

## Leaderboard

### Top Operators Query

```typescript
async getLeaderboard(period: DateRange, limit: number = 10): Promise<OperatorRating[]> {
  return this.ratingRepository.find({
    where: {
      period_start: period.start,
      period_end: period.end,
    },
    order: { overall_score: 'DESC' },
    take: limit,
    relations: ['operator'],
  });
}
```

### Leaderboard Response

```typescript
interface LeaderboardEntry {
  rank: number;
  operator: {
    id: string;
    name: string;
    avatar_url: string;
  };
  overall_score: number;
  rating_grade: string;
  tasks_completed: number;
  trend: 'up' | 'down' | 'stable';  // vs last period
}
```

## Performance Trends

### Get Trend Data

```typescript
async getRatingTrend(
  operatorId: string,
  months: number = 6
): Promise<TrendData[]> {
  const ratings = await this.ratingRepository
    .createQueryBuilder('r')
    .where('r.operator_id = :operatorId', { operatorId })
    .orderBy('r.period_start', 'DESC')
    .take(months)
    .getMany();

  return ratings.map(r => ({
    period: `${r.period_start.toISOString().slice(0, 7)}`,
    overall_score: r.overall_score,
    timeliness_score: r.timeliness_score,
    photo_quality_score: r.photo_quality_score,
    data_accuracy_score: r.data_accuracy_score,
    customer_feedback_score: r.customer_feedback_score,
    discipline_score: r.discipline_score,
  }));
}
```

## Notifications

### Rating Notification

```typescript
async notifyOperator(operatorId: string, rating: OperatorRating): Promise<void> {
  const notification = {
    userId: operatorId,
    title: 'Ваш рейтинг за месяц',
    body: `Ваш рейтинг: ${rating.overall_score.toFixed(1)} (${rating.rating_grade})`,
    data: {
      type: 'rating',
      ratingId: rating.id,
    },
  };

  await this.notificationService.send(notification);

  rating.notification_sent_at = new Date();
  await this.ratingRepository.save(rating);
}
```

## Integration with Other Modules

### Tasks

- Task completion data for timeliness
- Photo compliance from task photos

### Complaints

- Customer complaints and ratings

### Inventory

- Collection variance data
- Inventory discrepancy tracking

### HR

- Links to employee records
- Performance review input

## Best Practices

1. **Fair Comparison**: Compare operators with similar task volumes
2. **Rolling Periods**: Use monthly periods for trend analysis
3. **Weight Adjustment**: Adjust weights based on business priorities
4. **Outlier Handling**: Don't penalize for exceptional circumstances
5. **Feedback Loop**: Use ratings for training and improvement

## Related Modules

- [Tasks](../tasks/README.md) - Task performance data
- [Complaints](../complaints/README.md) - Customer feedback
- [Inventory](../inventory/README.md) - Data accuracy
- [HR](../hr/README.md) - Employee management
- [Notifications](../notifications/README.md) - Rating notifications
