import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AnalyticsSnapshot, SnapshotType } from '../entities/analytics-snapshot.entity';
import { AnalyticsQueryDto, MetricType, GroupByType } from '../dto/analytics-query.dto';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, format, subDays } from 'date-fns';

export interface AnalyticsResult {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
  summary: Record<string, number>;
}

@Injectable()
export class AnalyticsCalculationService {
  private readonly logger = new Logger(AnalyticsCalculationService.name);

  constructor(
    @InjectRepository(AnalyticsSnapshot)
    private snapshotRepository: Repository<AnalyticsSnapshot>,
  ) {}

  async calculateMetrics(query: AnalyticsQueryDto): Promise<AnalyticsResult> {
    const startDate = query.start_date ? new Date(query.start_date) : subDays(new Date(), 7);
    const endDate = query.end_date ? new Date(query.end_date) : new Date();

    const snapshots = await this.getSnapshots(startDate, endDate, query);

    return this.aggregateData(snapshots, query);
  }

  private async getSnapshots(
    startDate: Date,
    endDate: Date,
    query: AnalyticsQueryDto,
  ): Promise<AnalyticsSnapshot[]> {
    const queryBuilder = this.snapshotRepository
      .createQueryBuilder('snapshot')
      .where('snapshot.snapshot_date BETWEEN :startDate AND :endDate', {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });

    if (query.machine_ids && query.machine_ids.length > 0) {
      queryBuilder.andWhere('snapshot.machine_id IN (:...machineIds)', {
        machineIds: query.machine_ids,
      });
    }

    if (query.location_ids && query.location_ids.length > 0) {
      queryBuilder.andWhere('snapshot.location_id IN (:...locationIds)', {
        locationIds: query.location_ids,
      });
    }

    if (query.product_ids && query.product_ids.length > 0) {
      queryBuilder.andWhere('snapshot.product_id IN (:...productIds)', {
        productIds: query.product_ids,
      });
    }

    queryBuilder.orderBy('snapshot.snapshot_date', 'ASC');

    return queryBuilder.getMany();
  }

  private aggregateData(snapshots: AnalyticsSnapshot[], query: AnalyticsQueryDto): AnalyticsResult {
    const grouped = this.groupSnapshots(snapshots, query.group_by || GroupByType.DAY);
    const metrics = query.metrics || [MetricType.REVENUE, MetricType.TRANSACTIONS];

    const labels = Object.keys(grouped);
    const datasets = metrics.map((metric) => this.createDataset(metric, grouped));

    const summary = this.calculateSummary(snapshots, metrics);

    return { labels, datasets, summary };
  }

  private groupSnapshots(
    snapshots: AnalyticsSnapshot[],
    groupBy: GroupByType,
  ): Record<string, AnalyticsSnapshot[]> {
    const grouped: Record<string, AnalyticsSnapshot[]> = {};

    snapshots.forEach((snapshot) => {
      let key: string;

      switch (groupBy) {
        case GroupByType.HOUR:
          key = format(new Date(snapshot.snapshot_date), 'yyyy-MM-dd HH:00');
          break;
        case GroupByType.WEEK:
          key = format(startOfWeek(new Date(snapshot.snapshot_date)), 'yyyy-MM-dd');
          break;
        case GroupByType.MONTH:
          key = format(new Date(snapshot.snapshot_date), 'yyyy-MM');
          break;
        case GroupByType.MACHINE:
          key = snapshot.machine_id || 'unknown';
          break;
        case GroupByType.LOCATION:
          key = snapshot.location_id || 'unknown';
          break;
        case GroupByType.PRODUCT:
          key = snapshot.product_id || 'unknown';
          break;
        default:
          key = format(new Date(snapshot.snapshot_date), 'yyyy-MM-dd');
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(snapshot);
    });

    return grouped;
  }

  private createDataset(
    metric: MetricType,
    grouped: Record<string, AnalyticsSnapshot[]>,
  ): { label: string; data: number[]; backgroundColor?: string; borderColor?: string } {
    const data = Object.values(grouped).map((snapshots) => {
      return snapshots.reduce((sum, snapshot) => {
        switch (metric) {
          case MetricType.REVENUE:
            return sum + Number(snapshot.total_revenue);
          case MetricType.TRANSACTIONS:
            return sum + snapshot.total_transactions;
          case MetricType.UNITS_SOLD:
            return sum + snapshot.total_units_sold;
          case MetricType.AVERAGE_TRANSACTION:
            return sum + Number(snapshot.average_transaction_value);
          case MetricType.UPTIME:
            return sum + snapshot.uptime_minutes;
          case MetricType.DOWNTIME:
            return sum + snapshot.downtime_minutes;
          case MetricType.AVAILABILITY:
            return sum + Number(snapshot.availability_percentage);
          case MetricType.PROFIT_MARGIN:
            return sum + Number(snapshot.profit_margin);
          default:
            return sum;
        }
      }, 0);
    });

    return {
      label: this.getMetricLabel(metric),
      data,
      backgroundColor: this.getMetricColor(metric, 0.5),
      borderColor: this.getMetricColor(metric, 1),
    };
  }

  private calculateSummary(
    snapshots: AnalyticsSnapshot[],
    metrics: MetricType[],
  ): Record<string, number> {
    const summary: Record<string, number> = {};

    metrics.forEach((metric) => {
      let total = 0;
      const count = snapshots.length;

      snapshots.forEach((snapshot) => {
        switch (metric) {
          case MetricType.REVENUE:
            total += Number(snapshot.total_revenue);
            break;
          case MetricType.TRANSACTIONS:
            total += snapshot.total_transactions;
            break;
          case MetricType.UNITS_SOLD:
            total += snapshot.total_units_sold;
            break;
          case MetricType.AVERAGE_TRANSACTION:
            total += Number(snapshot.average_transaction_value);
            break;
          case MetricType.UPTIME:
            total += snapshot.uptime_minutes;
            break;
          case MetricType.DOWNTIME:
            total += snapshot.downtime_minutes;
            break;
          case MetricType.AVAILABILITY:
            total += Number(snapshot.availability_percentage);
            break;
          case MetricType.PROFIT_MARGIN:
            total += Number(snapshot.profit_margin);
            break;
        }
      });

      summary[metric] = count > 0 ? total / count : 0;
      summary[`total_${metric}`] = total;
    });

    return summary;
  }

  private getMetricLabel(metric: MetricType): string {
    const labels: Record<MetricType, string> = {
      [MetricType.REVENUE]: 'Выручка',
      [MetricType.TRANSACTIONS]: 'Транзакции',
      [MetricType.UNITS_SOLD]: 'Продано единиц',
      [MetricType.AVERAGE_TRANSACTION]: 'Средний чек',
      [MetricType.UPTIME]: 'Время работы (мин)',
      [MetricType.DOWNTIME]: 'Время простоя (мин)',
      [MetricType.AVAILABILITY]: 'Доступность (%)',
      [MetricType.PROFIT_MARGIN]: 'Прибыль (%)',
    };

    return labels[metric];
  }

  private getMetricColor(metric: MetricType, alpha: number): string {
    const colors: Record<MetricType, string> = {
      [MetricType.REVENUE]: `rgba(34, 197, 94, ${alpha})`, // green
      [MetricType.TRANSACTIONS]: `rgba(59, 130, 246, ${alpha})`, // blue
      [MetricType.UNITS_SOLD]: `rgba(168, 85, 247, ${alpha})`, // purple
      [MetricType.AVERAGE_TRANSACTION]: `rgba(249, 115, 22, ${alpha})`, // orange
      [MetricType.UPTIME]: `rgba(16, 185, 129, ${alpha})`, // emerald
      [MetricType.DOWNTIME]: `rgba(239, 68, 68, ${alpha})`, // red
      [MetricType.AVAILABILITY]: `rgba(14, 165, 233, ${alpha})`, // sky
      [MetricType.PROFIT_MARGIN]: `rgba(132, 204, 22, ${alpha})`, // lime
    };

    return colors[metric];
  }

  async getTopMachines(limit: number = 10, days: number = 30): Promise<any[]> {
    const startDate = subDays(new Date(), days);

    const results = await this.snapshotRepository
      .createQueryBuilder('snapshot')
      .select('snapshot.machine_id', 'machine_id')
      .addSelect('SUM(snapshot.total_revenue)', 'total_revenue')
      .addSelect('SUM(snapshot.total_transactions)', 'total_transactions')
      .addSelect('AVG(snapshot.availability_percentage)', 'avg_availability')
      .where('snapshot.snapshot_date >= :startDate', { startDate: format(startDate, 'yyyy-MM-dd') })
      .andWhere('snapshot.machine_id IS NOT NULL')
      .groupBy('snapshot.machine_id')
      .orderBy('total_revenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return results;
  }

  async getTopProducts(limit: number = 10, days: number = 30): Promise<any[]> {
    const startDate = subDays(new Date(), days);

    const results = await this.snapshotRepository
      .createQueryBuilder('snapshot')
      .select('snapshot.product_id', 'product_id')
      .addSelect('SUM(snapshot.total_units_sold)', 'total_units')
      .addSelect('SUM(snapshot.total_revenue)', 'total_revenue')
      .where('snapshot.snapshot_date >= :startDate', { startDate: format(startDate, 'yyyy-MM-dd') })
      .andWhere('snapshot.product_id IS NOT NULL')
      .groupBy('snapshot.product_id')
      .orderBy('total_units', 'DESC')
      .limit(limit)
      .getRawMany();

    return results;
  }

  async getMachineStatusSummary(): Promise<any> {
    // This would typically query the machines table directly
    // For now, return structure
    return {
      online: 0,
      offline: 0,
      maintenance: 0,
      error: 0,
    };
  }
}
