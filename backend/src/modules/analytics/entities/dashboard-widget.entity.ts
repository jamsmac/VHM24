import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum WidgetType {
  SALES_CHART = 'sales_chart',
  REVENUE_CHART = 'revenue_chart',
  TOP_MACHINES = 'top_machines',
  TOP_PRODUCTS = 'top_products',
  MACHINE_STATUS = 'machine_status',
  STOCK_LEVELS = 'stock_levels',
  TASKS_SUMMARY = 'tasks_summary',
  INCIDENTS_MAP = 'incidents_map',
  KPI_METRIC = 'kpi_metric',
  CUSTOM_CHART = 'custom_chart',
}

export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  AREA = 'area',
  DONUT = 'donut',
  HEATMAP = 'heatmap',
  SCATTER = 'scatter',
}

export enum TimeRange {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_YEAR = 'this_year',
  CUSTOM = 'custom',
}

@Entity('dashboard_widgets')
export class DashboardWidget extends BaseEntity {
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'enum', enum: WidgetType })
  widget_type: WidgetType;

  @Column({ type: 'enum', enum: ChartType, nullable: true })
  chart_type: ChartType | null;

  @Column({ type: 'enum', enum: TimeRange, default: TimeRange.LAST_7_DAYS })
  time_range: TimeRange;

  @Column({ type: 'integer' })
  position: number;

  @Column({ type: 'integer', default: 6 })
  width: number; // Grid width (1-12)

  @Column({ type: 'integer', default: 4 })
  height: number; // Grid height

  @Column({ type: 'jsonb', default: {} })
  config: {
    filters?: Record<string, any>;
    metrics?: string[];
    groupBy?: string;
    sortBy?: string;
    limit?: number;
    colors?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
    customQuery?: string;
  };

  @Column({ type: 'boolean', default: true })
  is_visible: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
