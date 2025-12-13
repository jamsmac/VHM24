import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  Report,
  ReportType,
  ReportParams,
  ReportTemplate,
  ReportData,
  ReportMetrics,
  ChartData,
  ReportSummary,
  DateRange,
  ReportFilters,
  ColumnDefinition,
} from '../interfaces/report.interface';
import { MoneyHelper } from '@/common/helpers/money.helper';
import * as moment from 'moment';

/** Sales query result row */
interface SalesRow {
  date: string | Date;
  total_amount: string | number;
  payment_method: string;
  transaction_count: string | number;
}

/** Performance query result row */
interface PerformanceRow {
  date: string | Date;
  sales_count: string | number;
  revenue: string | number;
  avg_sale?: string | number;
}

/** Task statistics query result row */
interface TaskStatRow {
  type: string;
  status: string;
  count: string | number;
  avg_completion_hours?: string | number;
}

/** Incident statistics query result row */
interface IncidentStatRow {
  incident_type: string;
  severity: string;
  count: string | number;
  avg_resolution_hours?: string | number;
}

/** Payment method accumulator */
interface PaymentMethodAccumulator {
  [method: string]: { amount: number; count: number };
}

/** Query definition from template */
interface QueryDefinition {
  id: string;
  entity: string;
  select?: string[];
  groupBy?: string[];
  orderBy?: string;
  limit?: number;
}

/** Column type values */
type ColumnType = 'string' | 'number' | 'date' | 'boolean' | 'currency';

/** Raw query results container */
type RawQueryResults = Record<string, Record<string, unknown>[]>;

/**
 * Report Builder Engine
 *
 * Generates comprehensive reports using templates and data processing
 */
@Injectable()
export class ReportBuilderService {
  private readonly logger = new Logger(ReportBuilderService.name);
  private readonly templates = new Map<ReportType, ReportTemplate>();
  private readonly cache = new Map<string, Report>();

  constructor(private readonly dataSource: DataSource) {
    this.loadTemplates();
  }

  /**
   * Generate report based on parameters
   */
  async generateReport(params: ReportParams): Promise<Report> {
    const startTime = Date.now();
    const reportId = this.generateReportId(params);

    // Check cache
    const cached = this.getCachedReport(reportId);
    if (cached) {
      this.logger.log(`Returning cached report ${reportId}`);
      return cached;
    }

    this.logger.log(
      `Generating ${params.type} report for period ${params.period.start} to ${params.period.end}`,
    );

    // Load template
    const template = await this.loadTemplate(params.type);

    // Fetch data
    const rawData = await this.fetchData(template, params);

    // Process data
    const processedData = await this.processData(rawData, template, params);

    // Calculate metrics
    const metrics = await this.calculateMetrics(processedData, template, params);

    // Generate charts
    const charts = params.includeCharts
      ? await this.generateCharts(processedData, template, params)
      : undefined;

    // Generate summary
    const summary = this.generateSummary(processedData, metrics, params);

    // Create report
    const report: Report = {
      id: reportId,
      type: params.type,
      title: this.generateTitle(params),
      subtitle: this.generateSubtitle(params),
      period: params.period,
      generatedAt: new Date(),
      generationTimeMs: Date.now() - startTime,
      data: processedData,
      metrics,
      charts,
      summary,
      metadata: {
        version: '1.0',
        dataSource: template.queries.map((q) => q.entity),
        filters: params.filters || {},
        cacheKey: reportId,
        expiresAt: moment().add(15, 'minutes').toDate(),
      },
    };

    // Cache report
    this.cacheReport(report);

    this.logger.log(`Report ${reportId} generated in ${report.generationTimeMs}ms`);

    return report;
  }

  /**
   * Generate dashboard report
   */
  async generateDashboardReport(period: DateRange): Promise<Report> {
    const params: ReportParams = {
      type: ReportType.DASHBOARD,
      period,
      includeCharts: true,
    };

    return this.generateReport(params);
  }

  /**
   * Generate sales report
   */
  async generateSalesReport(period: DateRange, filters?: ReportFilters): Promise<Report> {
    const params: ReportParams = {
      type: ReportType.SALES,
      period,
      filters,
      groupBy: ['date', 'machine', 'product'],
      includeCharts: true,
    };

    return this.generateReport(params);
  }

  /**
   * Generate tax report for Uzbekistan
   */
  async generateTaxReport(period: DateRange): Promise<Report> {
    // Fetch sales data
    const sales = await this.dataSource.query(
      `
      SELECT
        DATE(sale_date) as date,
        SUM(amount) as total_amount,
        payment_method,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE transaction_type = 'sale'
        AND sale_date >= $1
        AND sale_date <= $2
        AND deleted_at IS NULL
      GROUP BY DATE(sale_date), payment_method
      ORDER BY date
    `,
      [period.start, period.end],
    );

    // Calculate VAT (15% in Uzbekistan)
    const vatRate = 0.15;
    const totalRevenue = sales.reduce(
      (sum: number, row: SalesRow) => sum + Number(row.total_amount),
      0,
    );
    const vatAmount = totalRevenue * vatRate;
    const taxBase = totalRevenue * (1 - vatRate);

    // Group by payment method
    const byPaymentMethod = sales.reduce((acc: PaymentMethodAccumulator, row: SalesRow) => {
      if (!acc[row.payment_method]) {
        acc[row.payment_method] = {
          amount: 0,
          count: 0,
        };
      }
      acc[row.payment_method].amount += Number(row.total_amount);
      acc[row.payment_method].count += Number(row.transaction_count);
      return acc;
    }, {} as PaymentMethodAccumulator);

    const data: ReportData = {
      rows: sales,
      columns: [
        { key: 'date', label: 'Дата', type: 'date' },
        { key: 'total_amount', label: 'Сумма', type: 'currency' },
        { key: 'payment_method', label: 'Способ оплаты', type: 'string' },
        { key: 'transaction_count', label: 'Кол-во транзакций', type: 'number' },
      ],
      totals: {
        total_amount: totalRevenue,
        transaction_count: sales.reduce(
          (sum: number, row: SalesRow) => sum + Number(row.transaction_count),
          0,
        ),
      },
    };

    const metrics: ReportMetrics = {
      totalRevenue: {
        label: 'Общая выручка',
        value: MoneyHelper.formatUZS(totalRevenue),
        format: 'currency',
      },
      vatAmount: {
        label: 'НДС (15%)',
        value: MoneyHelper.formatUZS(vatAmount),
        format: 'currency',
      },
      taxBase: {
        label: 'Налоговая база',
        value: MoneyHelper.formatUZS(taxBase),
        format: 'currency',
      },
      cashRevenue: {
        label: 'Наличная выручка',
        value: MoneyHelper.formatUZS(byPaymentMethod.cash?.amount || 0),
        format: 'currency',
      },
      cardRevenue: {
        label: 'Безналичная выручка',
        value: MoneyHelper.formatUZS(byPaymentMethod.card?.amount || 0),
        format: 'currency',
      },
    };

    return {
      id: this.generateReportId({ type: ReportType.TAX, period }),
      type: ReportType.TAX,
      title: 'Налоговый отчет',
      subtitle: `Период: ${moment(period.start).format('DD.MM.YYYY')} - ${moment(period.end).format('DD.MM.YYYY')}`,
      period,
      generatedAt: new Date(),
      generationTimeMs: 0,
      data,
      metrics,
      summary: {
        totalRows: sales.length,
        highlights: [
          `Общая выручка: ${MoneyHelper.formatUZS(totalRevenue)}`,
          `НДС к уплате: ${MoneyHelper.formatUZS(vatAmount)}`,
          `Количество транзакций: ${data.totals.transaction_count}`,
        ],
      },
      metadata: {
        version: '1.0',
        dataSource: ['transactions'],
        filters: {},
      },
    };
  }

  /**
   * Generate machine performance report
   */
  async generateMachinePerformanceReport(machineId: string, period: DateRange): Promise<Report> {
    // Fetch machine data
    const machine = await this.dataSource.query(
      `
      SELECT * FROM machines WHERE id = $1
    `,
      [machineId],
    );

    // Fetch performance data
    const performance = await this.dataSource.query(
      `
      SELECT
        DATE(sale_date) as date,
        COUNT(*) as sales_count,
        SUM(amount) as revenue,
        AVG(amount) as avg_sale
      FROM transactions
      WHERE machine_id = $1
        AND transaction_type = 'sale'
        AND sale_date >= $2
        AND sale_date <= $3
        AND deleted_at IS NULL
      GROUP BY DATE(sale_date)
      ORDER BY date
    `,
      [machineId, period.start, period.end],
    );

    // Fetch task statistics
    const tasks = await this.dataSource.query(
      `
      SELECT
        type,
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_completion_hours
      FROM tasks
      WHERE machine_id = $1
        AND created_at >= $2
        AND created_at <= $3
        AND deleted_at IS NULL
      GROUP BY type, status
    `,
      [machineId, period.start, period.end],
    );

    // Fetch incidents
    const incidents = await this.dataSource.query(
      `
      SELECT
        incident_type,
        severity,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours
      FROM incidents
      WHERE machine_id = $1
        AND created_at >= $2
        AND created_at <= $3
        AND deleted_at IS NULL
      GROUP BY incident_type, severity
    `,
      [machineId, period.start, period.end],
    );

    const totalRevenue = performance.reduce(
      (sum: number, row: PerformanceRow) => sum + Number(row.revenue),
      0,
    );
    const totalSales = performance.reduce(
      (sum: number, row: PerformanceRow) => sum + Number(row.sales_count),
      0,
    );
    const avgDailyRevenue = totalRevenue / performance.length;

    const data: ReportData = {
      rows: performance,
      columns: [
        { key: 'date', label: 'Дата', type: 'date' },
        { key: 'sales_count', label: 'Продажи', type: 'number' },
        { key: 'revenue', label: 'Выручка', type: 'currency' },
        { key: 'avg_sale', label: 'Средний чек', type: 'currency' },
      ],
    };

    const metrics: ReportMetrics = {
      totalRevenue: {
        label: 'Общая выручка',
        value: MoneyHelper.formatUZS(totalRevenue),
        format: 'currency',
      },
      totalSales: {
        label: 'Всего продаж',
        value: totalSales,
        format: 'number',
      },
      avgDailyRevenue: {
        label: 'Средняя дневная выручка',
        value: MoneyHelper.formatUZS(avgDailyRevenue),
        format: 'currency',
      },
      avgSale: {
        label: 'Средний чек',
        value: MoneyHelper.formatUZS(totalRevenue / totalSales),
        format: 'currency',
      },
      completedTasks: {
        label: 'Выполнено задач',
        value: tasks
          .filter((t: TaskStatRow) => t.status === 'completed')
          .reduce((sum: number, t: TaskStatRow) => sum + Number(t.count), 0),
        format: 'number',
      },
      incidents: {
        label: 'Инцидентов',
        value: incidents.reduce((sum: number, i: IncidentStatRow) => sum + Number(i.count), 0),
        format: 'number',
      },
    };

    const charts: ChartData[] = [
      {
        id: 'revenue-trend',
        type: 'line',
        title: 'Динамика выручки',
        data: {
          labels: performance.map((p: PerformanceRow) => moment(p.date).format('DD.MM')),
          datasets: [
            {
              label: 'Выручка',
              data: performance.map((p: PerformanceRow) => p.revenue),
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1,
            },
          ],
        },
      },
      {
        id: 'sales-count',
        type: 'bar',
        title: 'Количество продаж',
        data: {
          labels: performance.map((p: PerformanceRow) => moment(p.date).format('DD.MM')),
          datasets: [
            {
              label: 'Продажи',
              data: performance.map((p: PerformanceRow) => p.sales_count),
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
            },
          ],
        },
      },
    ];

    return {
      id: this.generateReportId({ type: ReportType.MACHINE_PERFORMANCE, period }),
      type: ReportType.MACHINE_PERFORMANCE,
      title: `Отчет по аппарату ${machine[0]?.machine_number}`,
      subtitle: `${machine[0]?.name} | ${moment(period.start).format('DD.MM.YYYY')} - ${moment(period.end).format('DD.MM.YYYY')}`,
      period,
      generatedAt: new Date(),
      generationTimeMs: 0,
      data,
      metrics,
      charts,
      summary: {
        totalRows: performance.length,
        highlights: [
          `Общая выручка: ${MoneyHelper.formatUZS(totalRevenue)}`,
          `Всего продаж: ${totalSales}`,
          `Средний чек: ${MoneyHelper.formatUZS(totalRevenue / totalSales)}`,
        ],
        insights: this.generateMachineInsights(performance, tasks, incidents),
        recommendations: this.generateMachineRecommendations(performance, tasks, incidents),
      },
      metadata: {
        version: '1.0',
        dataSource: ['transactions', 'tasks', 'incidents'],
        filters: { machineId },
      },
    };
  }

  /**
   * Load template for report type
   */
  private async loadTemplate(type: ReportType): Promise<ReportTemplate> {
    const template = this.templates.get(type);
    if (!template) {
      return this.createDefaultTemplate(type);
    }
    return template;
  }

  /**
   * Create default template
   */
  private createDefaultTemplate(type: ReportType): ReportTemplate {
    return {
      id: type,
      name: type,
      type,
      queries: [],
      processors: [],
      metrics: [],
      charts: [],
    };
  }

  /**
   * Load all report templates
   */
  private loadTemplates(): void {
    // Dashboard template
    this.templates.set(ReportType.DASHBOARD, {
      id: 'dashboard',
      name: 'Dashboard Report',
      type: ReportType.DASHBOARD,
      queries: [
        {
          id: 'revenue',
          name: 'Revenue Query',
          entity: 'transactions',
          select: ['SUM(amount) as revenue'],
          where: { transaction_type: 'sale' },
        },
        {
          id: 'tasks',
          name: 'Tasks Query',
          entity: 'tasks',
          select: ['status', 'COUNT(*) as count'],
          groupBy: ['status'],
        },
      ],
      processors: [],
      metrics: [
        {
          id: 'total_revenue',
          label: 'Общая выручка',
          query: 'revenue',
          format: 'currency',
        },
      ],
      charts: [],
    });

    // Add more templates as needed
  }

  /**
   * Fetch data based on template queries
   */
  private async fetchData(
    template: ReportTemplate,
    params: ReportParams,
  ): Promise<RawQueryResults> {
    const results: RawQueryResults = {};

    for (const query of template.queries) {
      const queryBuilder = this.buildQuery(query, params);
      results[query.id] = await this.dataSource.query(queryBuilder.query, queryBuilder.params);
    }

    return results;
  }

  /**
   * Build SQL query from template
   */
  private buildQuery(
    query: QueryDefinition,
    params: ReportParams,
  ): { query: string; params: unknown[] } {
    let sql = `SELECT ${query.select?.join(', ') || '*'} FROM ${query.entity}`;
    const sqlParams: unknown[] = [];
    let paramIndex = 1;

    // Add WHERE clause
    const conditions: string[] = [];

    // Add period filter
    if (params.period) {
      conditions.push(`created_at >= $${paramIndex}`);
      sqlParams.push(params.period.start);
      paramIndex++;

      conditions.push(`created_at <= $${paramIndex}`);
      sqlParams.push(params.period.end);
      paramIndex++;
    }

    // Add soft delete filter
    conditions.push('deleted_at IS NULL');

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add GROUP BY
    if (query.groupBy && query.groupBy.length > 0) {
      sql += ` GROUP BY ${query.groupBy.join(', ')}`;
    }

    // Add ORDER BY
    if (query.orderBy) {
      sql += ` ORDER BY ${query.orderBy}`;
    }

    // Add LIMIT
    if (query.limit) {
      sql += ` LIMIT ${query.limit}`;
    }

    return { query: sql, params: sqlParams };
  }

  /**
   * Process raw data
   */
  private async processData(
    rawData: RawQueryResults,
    template: ReportTemplate,
    _params: ReportParams,
  ): Promise<ReportData> {
    // Simple processing for now
    const firstQuery = template.queries[0];
    const data = rawData[firstQuery?.id] || [];

    return {
      rows: data,
      columns: this.detectColumns(data),
    };
  }

  /**
   * Detect columns from data
   */
  private detectColumns(data: Record<string, unknown>[]): ColumnDefinition[] {
    if (data.length === 0) return [];

    const firstRow = data[0];
    return Object.keys(firstRow).map(
      (key): ColumnDefinition => ({
        key,
        label: this.humanizeKey(key),
        type: this.detectColumnType(firstRow[key]),
      }),
    );
  }

  /**
   * Humanize key name
   */
  private humanizeKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Detect column type
   */
  private detectColumnType(value: unknown): ColumnType {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    return 'string';
  }

  /**
   * Calculate metrics
   */
  private async calculateMetrics(
    data: ReportData,
    _template: ReportTemplate,
    _params: ReportParams,
  ): Promise<ReportMetrics> {
    const metrics: ReportMetrics = {};

    // Calculate basic metrics
    metrics.totalRows = {
      label: 'Всего строк',
      value: data.rows.length,
      format: 'number',
    };

    return metrics;
  }

  /**
   * Generate charts
   */
  private async generateCharts(
    _data: ReportData,
    _template: ReportTemplate,
    _params: ReportParams,
  ): Promise<ChartData[]> {
    return [];
  }

  /**
   * Generate report summary
   */
  private generateSummary(
    data: ReportData,
    _metrics: ReportMetrics,
    _params: ReportParams,
  ): ReportSummary {
    return {
      totalRows: data.rows.length,
      highlights: [],
    };
  }

  /**
   * Generate machine insights
   */
  private generateMachineInsights(
    performance: PerformanceRow[],
    tasks: TaskStatRow[],
    incidents: IncidentStatRow[],
  ): string[] {
    const insights: string[] = [];

    // Revenue trend
    if (performance.length > 1) {
      const firstHalf = performance.slice(0, Math.floor(performance.length / 2));
      const secondHalf = performance.slice(Math.floor(performance.length / 2));

      const firstHalfRevenue = firstHalf.reduce(
        (sum: number, p: PerformanceRow) => sum + Number(p.revenue),
        0,
      );
      const secondHalfRevenue = secondHalf.reduce(
        (sum: number, p: PerformanceRow) => sum + Number(p.revenue),
        0,
      );

      if (secondHalfRevenue > firstHalfRevenue * 1.1) {
        insights.push('📈 Выручка показывает положительную динамику');
      } else if (secondHalfRevenue < firstHalfRevenue * 0.9) {
        insights.push('📉 Выручка снижается - требуется анализ причин');
      }
    }

    // Incident analysis
    const criticalIncidents = incidents.filter((i: IncidentStatRow) => i.severity === 'critical');
    if (criticalIncidents.length > 0) {
      insights.push(`⚠️ Зафиксировано ${criticalIncidents.length} критических инцидентов`);
    }

    return insights;
  }

  /**
   * Generate machine recommendations
   */
  private generateMachineRecommendations(
    performance: PerformanceRow[],
    tasks: TaskStatRow[],
    _incidents: IncidentStatRow[],
  ): string[] {
    const recommendations: string[] = [];

    // Low sales days
    const lowSalesDays = performance.filter((p: PerformanceRow) => Number(p.sales_count) < 10);
    if (lowSalesDays.length > performance.length * 0.3) {
      recommendations.push('Рассмотрите возможность перемещения аппарата в более проходное место');
    }

    // Maintenance recommendation
    const maintenanceTasks = tasks.filter((t: TaskStatRow) => t.type === 'maintenance');
    if (maintenanceTasks.length === 0) {
      recommendations.push('Запланируйте профилактическое обслуживание');
    }

    return recommendations;
  }

  /**
   * Generate report title
   */
  private generateTitle(params: ReportParams): string {
    const titles: Record<ReportType, string> = {
      [ReportType.DASHBOARD]: 'Сводный отчет',
      [ReportType.SALES]: 'Отчет по продажам',
      [ReportType.INVENTORY]: 'Отчет по инвентарю',
      [ReportType.FINANCIAL]: 'Финансовый отчет',
      [ReportType.TAX]: 'Налоговый отчет',
      [ReportType.MACHINE_PERFORMANCE]: 'Отчет по аппарату',
      [ReportType.OPERATOR_PERFORMANCE]: 'Отчет по оператору',
      [ReportType.MAINTENANCE]: 'Отчет по обслуживанию',
      [ReportType.CUSTOM]: 'Пользовательский отчет',
    };

    return titles[params.type] || 'Отчет';
  }

  /**
   * Generate report subtitle
   */
  private generateSubtitle(params: ReportParams): string {
    const start = moment(params.period.start).format('DD.MM.YYYY');
    const end = moment(params.period.end).format('DD.MM.YYYY');
    return `Период: ${start} - ${end}`;
  }

  /**
   * Generate report ID
   */
  private generateReportId(params: ReportParams): string {
    const parts = [
      params.type,
      moment(params.period.start).format('YYYYMMDD'),
      moment(params.period.end).format('YYYYMMDD'),
      JSON.stringify(params.filters || {}),
    ];
    return parts.join('_');
  }

  /**
   * Cache report
   */
  private cacheReport(report: Report): void {
    this.cache.set(report.id, report);

    // Clean old cache entries
    setTimeout(
      () => {
        this.cache.delete(report.id);
      },
      15 * 60 * 1000,
    ); // 15 minutes
  }

  /**
   * Get cached report
   */
  private getCachedReport(id: string): Report | undefined {
    const cached = this.cache.get(id);
    if (cached && cached.metadata.expiresAt) {
      if (new Date() < cached.metadata.expiresAt) {
        return cached;
      }
      this.cache.delete(id);
    }
    return undefined;
  }
}
