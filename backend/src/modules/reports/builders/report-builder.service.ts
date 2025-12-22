import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
 * Whitelist of allowed entities (tables) for report queries.
 * This prevents SQL injection by only allowing known safe table names.
 */
const ALLOWED_ENTITIES = new Set([
  'transactions',
  'tasks',
  'machines',
  'incidents',
  'complaints',
  'users',
  'inventory_movements',
  'locations',
  'nomenclature',
  'recipes',
  'operator_inventory',
  'machine_inventory',
  'warehouse_inventory',
  'audit_logs',
  'equipment',
  'components',
]);

/**
 * Whitelist of allowed columns per entity for report queries.
 * Columns not in this list will be rejected to prevent SQL injection.
 */
const ALLOWED_COLUMNS: Record<string, Set<string>> = {
  transactions: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'sale_date', 'amount',
    'transaction_type', 'payment_method', 'machine_id', 'user_id', 'recipe_id',
    'transaction_number', 'quantity', 'notes', 'counterparty_id', 'contract_id',
  ]),
  tasks: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'completed_at', 'started_at',
    'type', 'status', 'priority', 'machine_id', 'assigned_to_user_id', 'created_by_id',
    'scheduled_date', 'due_date', 'notes', 'rejection_reason', 'actual_cash_amount',
  ]),
  machines: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'machine_number', 'name',
    'status', 'location_id', 'type_code', 'model', 'manufacturer', 'serial_number',
    'installation_date', 'total_sales_count', 'total_revenue', 'current_cash_amount',
  ]),
  incidents: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'resolved_at', 'incident_type',
    'severity', 'status', 'machine_id', 'reported_by_id', 'assigned_to_id',
    'description', 'resolution_notes',
  ]),
  complaints: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'resolved_at', 'complaint_type',
    'status', 'machine_id', 'customer_name', 'customer_phone', 'description',
    'resolution_notes', 'refund_amount',
  ]),
  users: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'username', 'email',
    'first_name', 'last_name', 'role', 'status', 'last_login_at',
  ]),
  inventory_movements: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'operation_date', 'movement_type',
    'quantity', 'nomenclature_id', 'machine_id', 'operator_id', 'task_id', 'notes',
  ]),
  locations: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'name', 'address',
    'type_code', 'latitude', 'longitude', 'city', 'region',
  ]),
  nomenclature: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'name', 'sku',
    'category_code', 'unit', 'price', 'cost_price', 'is_active',
  ]),
  recipes: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'name', 'type_code',
    'price', 'cost_price', 'is_active', 'version',
  ]),
  operator_inventory: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'operator_id',
    'nomenclature_id', 'quantity', 'reserved_quantity',
  ]),
  machine_inventory: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'machine_id',
    'nomenclature_id', 'quantity', 'min_quantity', 'max_quantity',
  ]),
  warehouse_inventory: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'warehouse_id',
    'nomenclature_id', 'quantity', 'reserved_quantity', 'batch_number',
  ]),
  audit_logs: new Set([
    'id', 'created_at', 'user_id', 'event_type', 'severity',
    'ip_address', 'user_agent', 'entity_type', 'entity_id',
  ]),
  equipment: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'name', 'type',
    'serial_number', 'status', 'machine_id', 'purchase_date',
  ]),
  components: new Set([
    'id', 'created_at', 'updated_at', 'deleted_at', 'name', 'type',
    'serial_number', 'status', 'equipment_id', 'installation_date',
  ]),
};

/**
 * Allowed SQL aggregate functions for SELECT
 */
const ALLOWED_AGGREGATES = new Set([
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE',
]);

/**
 * Allowed ORDER BY directions
 */
const ALLOWED_ORDER_DIRECTIONS = new Set(['ASC', 'DESC', 'asc', 'desc']);

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
          `Количество транзакций: ${data.totals?.transaction_count ?? 0}`,
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
   * Validate entity name against whitelist
   * @throws Error if entity is not allowed
   */
  private validateEntity(entity: string): void {
    if (!ALLOWED_ENTITIES.has(entity)) {
      this.logger.error(`SQL Injection attempt blocked: invalid entity "${entity}"`);
      throw new BadRequestException(`Invalid entity: ${entity}. Entity not in allowed list.`);
    }
  }

  /**
   * Validate and sanitize a column name for a specific entity
   * Supports aggregate functions like COUNT(*), SUM(amount), etc.
   * @returns sanitized column expression or throws error
   */
  private validateColumn(column: string, entity: string): string {
    const trimmed = column.trim();
    const allowedColumns = ALLOWED_COLUMNS[entity];

    if (!allowedColumns) {
      throw new BadRequestException(`No column whitelist defined for entity: ${entity}`);
    }

    // Handle SELECT * case
    if (trimmed === '*') {
      return '*';
    }

    // Handle aggregate functions: COUNT(*), SUM(column), AVG(column) as alias
    const aggregateMatch = trimmed.match(
      /^(COUNT|SUM|AVG|MIN|MAX|COALESCE)\s*\(\s*(\*|[a-z_][a-z0-9_]*)\s*\)(?:\s+as\s+([a-z_][a-z0-9_]*))?$/i,
    );

    if (aggregateMatch) {
      const [, func, innerColumn, alias] = aggregateMatch;
      const upperFunc = func.toUpperCase();

      if (!ALLOWED_AGGREGATES.has(upperFunc)) {
        throw new BadRequestException(`Invalid aggregate function: ${func}`);
      }

      // Validate inner column (unless it's *)
      if (innerColumn !== '*' && !allowedColumns.has(innerColumn.toLowerCase())) {
        this.logger.error(
          `SQL Injection attempt blocked: invalid column "${innerColumn}" in aggregate for entity "${entity}"`,
        );
        throw new BadRequestException(`Invalid column in aggregate: ${innerColumn}`);
      }

      // Return sanitized aggregate expression
      const sanitizedInner = innerColumn === '*' ? '*' : innerColumn.toLowerCase();
      return alias
        ? `${upperFunc}(${sanitizedInner}) as ${alias.toLowerCase()}`
        : `${upperFunc}(${sanitizedInner})`;
    }

    // Handle DATE(column) function
    const dateMatch = trimmed.match(/^DATE\s*\(\s*([a-z_][a-z0-9_]*)\s*\)(?:\s+as\s+([a-z_][a-z0-9_]*))?$/i);
    if (dateMatch) {
      const [, innerColumn, alias] = dateMatch;
      if (!allowedColumns.has(innerColumn.toLowerCase())) {
        throw new BadRequestException(`Invalid column in DATE function: ${innerColumn}`);
      }
      return alias
        ? `DATE(${innerColumn.toLowerCase()}) as ${alias.toLowerCase()}`
        : `DATE(${innerColumn.toLowerCase()})`;
    }

    // Handle EXTRACT function: EXTRACT(EPOCH FROM (col1 - col2))/3600
    const extractMatch = trimmed.match(
      /^EXTRACT\s*\(\s*EPOCH\s+FROM\s+\(\s*([a-z_][a-z0-9_]*)\s*-\s*([a-z_][a-z0-9_]*)\s*\)\s*\)\s*\/\s*(\d+)(?:\s+as\s+([a-z_][a-z0-9_]*))?$/i,
    );
    if (extractMatch) {
      const [, col1, col2, divisor, alias] = extractMatch;
      if (!allowedColumns.has(col1.toLowerCase()) || !allowedColumns.has(col2.toLowerCase())) {
        throw new BadRequestException(`Invalid column in EXTRACT: ${col1} or ${col2}`);
      }
      const expr = `EXTRACT(EPOCH FROM (${col1.toLowerCase()} - ${col2.toLowerCase()}))/${divisor}`;
      return alias ? `${expr} as ${alias.toLowerCase()}` : expr;
    }

    // Handle simple "column as alias" syntax
    const aliasMatch = trimmed.match(/^([a-z_][a-z0-9_]*)\s+as\s+([a-z_][a-z0-9_]*)$/i);
    if (aliasMatch) {
      const [, col, alias] = aliasMatch;
      if (!allowedColumns.has(col.toLowerCase())) {
        this.logger.error(
          `SQL Injection attempt blocked: invalid column "${col}" for entity "${entity}"`,
        );
        throw new BadRequestException(`Invalid column: ${col}`);
      }
      return `${col.toLowerCase()} as ${alias.toLowerCase()}`;
    }

    // Handle simple column name
    const simpleMatch = trimmed.match(/^[a-z_][a-z0-9_]*$/i);
    if (simpleMatch && allowedColumns.has(trimmed.toLowerCase())) {
      return trimmed.toLowerCase();
    }

    this.logger.error(
      `SQL Injection attempt blocked: invalid column expression "${column}" for entity "${entity}"`,
    );
    throw new BadRequestException(`Invalid column expression: ${column}`);
  }

  /**
   * Validate ORDER BY clause
   * @returns sanitized ORDER BY expression or throws error
   */
  private validateOrderBy(orderBy: string, entity: string): string {
    const trimmed = orderBy.trim();
    const allowedColumns = ALLOWED_COLUMNS[entity];

    if (!allowedColumns) {
      throw new BadRequestException(`No column whitelist defined for entity: ${entity}`);
    }

    // Parse "column [ASC|DESC]" format
    const match = trimmed.match(/^([a-z_][a-z0-9_]*)(?:\s+(ASC|DESC))?$/i);
    if (!match) {
      this.logger.error(`SQL Injection attempt blocked: invalid ORDER BY "${orderBy}"`);
      throw new BadRequestException(`Invalid ORDER BY format: ${orderBy}`);
    }

    const [, column, direction] = match;

    if (!allowedColumns.has(column.toLowerCase())) {
      this.logger.error(
        `SQL Injection attempt blocked: invalid ORDER BY column "${column}" for entity "${entity}"`,
      );
      throw new BadRequestException(`Invalid ORDER BY column: ${column}`);
    }

    const sanitizedDirection = direction?.toUpperCase() || 'ASC';
    if (!ALLOWED_ORDER_DIRECTIONS.has(sanitizedDirection)) {
      throw new BadRequestException(`Invalid ORDER BY direction: ${direction}`);
    }

    return `${column.toLowerCase()} ${sanitizedDirection}`;
  }

  /**
   * Validate LIMIT value
   * @returns validated limit number or throws error
   */
  private validateLimit(limit: number): number {
    if (!Number.isInteger(limit) || limit < 1 || limit > 10000) {
      throw new BadRequestException(`Invalid LIMIT value: ${limit}. Must be integer between 1 and 10000.`);
    }
    return limit;
  }

  /**
   * Build SQL query from template with full validation
   * All inputs are validated against whitelists to prevent SQL injection
   */
  private buildQuery(
    query: QueryDefinition,
    params: ReportParams,
  ): { query: string; params: unknown[] } {
    // Validate entity
    this.validateEntity(query.entity);

    // Validate and build SELECT clause
    let selectClause: string;
    if (query.select && query.select.length > 0) {
      const validatedColumns = query.select.map((col) =>
        this.validateColumn(col, query.entity),
      );
      selectClause = validatedColumns.join(', ');
    } else {
      selectClause = '*';
    }

    let sql = `SELECT ${selectClause} FROM ${query.entity}`;
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

    // Add GROUP BY with validation
    if (query.groupBy && query.groupBy.length > 0) {
      const validatedGroupBy = query.groupBy.map((col) => {
        // GroupBy can be simple column or DATE(column)
        const dateMatch = col.match(/^DATE\s*\(\s*([a-z_][a-z0-9_]*)\s*\)$/i);
        if (dateMatch) {
          const allowedColumns = ALLOWED_COLUMNS[query.entity];
          if (!allowedColumns?.has(dateMatch[1].toLowerCase())) {
            throw new BadRequestException(`Invalid GROUP BY column: ${dateMatch[1]}`);
          }
          return `DATE(${dateMatch[1].toLowerCase()})`;
        }

        const allowedColumns = ALLOWED_COLUMNS[query.entity];
        if (!allowedColumns?.has(col.toLowerCase())) {
          this.logger.error(
            `SQL Injection attempt blocked: invalid GROUP BY column "${col}" for entity "${query.entity}"`,
          );
          throw new BadRequestException(`Invalid GROUP BY column: ${col}`);
        }
        return col.toLowerCase();
      });
      sql += ` GROUP BY ${validatedGroupBy.join(', ')}`;
    }

    // Add ORDER BY with validation
    if (query.orderBy) {
      const validatedOrderBy = this.validateOrderBy(query.orderBy, query.entity);
      sql += ` ORDER BY ${validatedOrderBy}`;
    }

    // Add LIMIT with validation
    if (query.limit) {
      const validatedLimit = this.validateLimit(query.limit);
      sql += ` LIMIT ${validatedLimit}`;
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
