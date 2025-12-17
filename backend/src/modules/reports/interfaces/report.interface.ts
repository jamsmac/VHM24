/**
 * Report Builder Interfaces
 *
 * Core interfaces for report generation and templating
 */

export enum ReportType {
  DASHBOARD = 'dashboard',
  MACHINE_PERFORMANCE = 'machine_performance',
  SALES = 'sales',
  INVENTORY = 'inventory',
  FINANCIAL = 'financial',
  TAX = 'tax',
  OPERATOR_PERFORMANCE = 'operator_performance',
  MAINTENANCE = 'maintenance',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  JSON = 'json',
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  HTML = 'html',
}

export interface ReportParams {
  type: ReportType;
  format?: ReportFormat;
  period: DateRange;
  filters?: ReportFilters;
  groupBy?: string[];
  sortBy?: string;
  locale?: string;
  timezone?: string;
  includeCharts?: boolean;
  includeRawData?: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ReportFilters {
  machines?: string[];
  operators?: string[];
  products?: string[];
  locations?: string[];
  status?: string[];
  [key: string]: string[] | string | number | boolean | Date | undefined;
}

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  subtitle?: string;
  period: DateRange;
  generatedAt: Date;
  generationTimeMs: number;
  data: ReportData;
  metrics: ReportMetrics;
  charts?: ChartData[];
  summary: ReportSummary;
  metadata: ReportMetadata;
}

export interface ReportData {
  rows: Record<string, unknown>[];
  columns: ColumnDefinition[];
  totals?: Record<string, number | string>;
  groupedData?: GroupedData[];
}

export interface ColumnDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  format?: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  groupable?: boolean;
}

export interface GroupedData {
  group: string;
  value: string | number | boolean | null;
  count: number;
  data: Record<string, unknown>[];
  subtotals?: Record<string, number | string>;
}

export interface ReportMetrics {
  [key: string]: MetricValue;
}

export interface MetricValue {
  label: string;
  value: number | string;
  change?: number;
  changePercent?: number;
  trend?: 'up' | 'down' | 'stable';
  format?: 'number' | 'currency' | 'percent';
  unit?: string;
}

export interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter';
  title: string;
  data: Record<string, unknown> | unknown[];
  options?: Record<string, unknown>;
}

export interface ReportSummary {
  totalRows: number;
  totalPages?: number;
  highlights: string[];
  insights?: string[];
  recommendations?: string[];
}

export interface ReportMetadata {
  version: string;
  dataSource: string[];
  filters: ReportFilters;
  generatedBy?: string;
  cacheKey?: string;
  expiresAt?: Date;
  tags?: string[];
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description?: string;
  queries: QueryTemplate[];
  processors: ProcessorTemplate[];
  metrics: MetricTemplate[];
  charts: ChartTemplate[];
  layout?: LayoutTemplate;
  styles?: StyleTemplate;
}

export interface QueryTemplate {
  id: string;
  name: string;
  entity: string;
  select?: string[];
  joins?: JoinTemplate[];
  where?: Record<string, unknown>;
  groupBy?: string[];
  orderBy?: string;
  limit?: number;
}

export interface JoinTemplate {
  entity: string;
  alias?: string;
  condition: string;
  type?: 'inner' | 'left' | 'right';
}

export interface ProcessorTemplate {
  id: string;
  type: 'aggregate' | 'transform' | 'filter' | 'calculate';
  field?: string;
  operation?: string;
  params?: Record<string, unknown>;
}

export interface MetricTemplate {
  id: string;
  label: string;
  query?: string;
  calculation?: string;
  format?: string;
  compareWith?: 'previous_period' | 'previous_year' | 'target';
}

export interface ChartTemplate {
  id: string;
  type: string;
  title: string;
  dataSource: string;
  xAxis?: string;
  yAxis?: string;
  series?: string[];
  options?: Record<string, unknown>;
}

export interface LayoutTemplate {
  sections: LayoutSection[];
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface LayoutSection {
  type: 'header' | 'metrics' | 'chart' | 'table' | 'summary' | 'footer';
  position?: number;
  width?: number;
  height?: number;
  content?: Record<string, unknown>;
}

export interface StyleTemplate {
  colors?: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
  };
  fonts?: {
    heading: string;
    body: string;
    mono: string;
  };
  sizes?: {
    small: number;
    normal: number;
    large: number;
  };
}
