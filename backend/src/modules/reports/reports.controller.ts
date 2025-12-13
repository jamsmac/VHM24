import { Controller, Get, Query, Param, Res, HttpStatus, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import {
  ReportsCacheInterceptor,
  CacheTTL,
  CACHE_TTL_CONFIG,
} from './interceptors/cache.interceptor';
import { ReportsService } from './reports.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { NetworkSummaryService } from './services/network-summary.service';
import { ProfitLossService } from './services/profit-loss.service';
import { CashFlowService } from './services/cash-flow.service';
import { ExcelExportService } from './services/excel-export.service';
import { MachinePerformanceService } from './services/machine-performance.service';
import { LocationPerformanceService } from './services/location-performance.service';
import { ProductSalesService } from './services/product-sales.service';
import { CollectionsSummaryService } from './services/collections-summary.service';
import { OperatorPerformanceReportService } from './services/operator-performance-report.service';
import { TaskExecutionStatsService } from './services/task-execution-stats.service';
import { WarehouseInventoryReportService } from './services/warehouse-inventory-report.service';
import { DepreciationReportService } from './services/depreciation-report.service';
import { ExpiryTrackingReportService } from './services/expiry-tracking-report.service';
import { IncidentsStatsService } from './services/incidents-stats.service';
import { ComplaintsStatsService } from './services/complaints-stats.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { ManagerDashboardService } from './services/manager-dashboard.service';
import { OperatorDashboardService } from './services/operator-dashboard.service';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { startOfMonth, endOfMonth } from 'date-fns';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly networkSummaryService: NetworkSummaryService,
    private readonly profitLossService: ProfitLossService,
    private readonly cashFlowService: CashFlowService,
    private readonly excelExportService: ExcelExportService,
    private readonly machinePerformanceService: MachinePerformanceService,
    private readonly locationPerformanceService: LocationPerformanceService,
    private readonly productSalesService: ProductSalesService,
    private readonly collectionsSummaryService: CollectionsSummaryService,
    private readonly operatorPerformanceReportService: OperatorPerformanceReportService,
    private readonly taskExecutionStatsService: TaskExecutionStatsService,
    private readonly warehouseInventoryReportService: WarehouseInventoryReportService,
    private readonly depreciationReportService: DepreciationReportService,
    private readonly expiryTrackingReportService: ExpiryTrackingReportService,
    private readonly incidentsStatsService: IncidentsStatsService,
    private readonly complaintsStatsService: ComplaintsStatsService,
    private readonly adminDashboardService: AdminDashboardService,
    private readonly managerDashboardService: ManagerDashboardService,
    private readonly operatorDashboardService: OperatorDashboardService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Получить сводный дашборд' })
  @ApiResponse({
    status: 200,
    description: 'Сводные данные по всем метрикам',
  })
  getDashboard(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getDashboard(filters);
  }

  @Get('machine/:machineId')
  @ApiOperation({ summary: 'Получить отчет по аппарату' })
  @ApiParam({ name: 'machineId', description: 'UUID аппарата' })
  @ApiResponse({
    status: 200,
    description: 'Детальный отчет по аппарату',
  })
  getMachineReport(@Param('machineId') machineId: string, @Query() filters: ReportFiltersDto) {
    return this.reportsService.getMachineReport(machineId, filters);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Получить отчет по пользователю (оператору)' })
  @ApiParam({ name: 'userId', description: 'UUID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Отчет по активности оператора',
  })
  getUserReport(@Param('userId') userId: string, @Query() filters: ReportFiltersDto) {
    return this.reportsService.getUserReport(userId, filters);
  }

  // ============================================================================
  // PDF EXPORTS
  // ============================================================================

  @Get('dashboard/pdf')
  @ApiOperation({ summary: 'Скачать дашборд как PDF' })
  @ApiResponse({
    status: 200,
    description: 'PDF файл дашборда',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async downloadDashboardPDF(@Query() filters: ReportFiltersDto, @Res() res: Response) {
    const data = await this.reportsService.getDashboard(filters);
    await this.pdfGeneratorService.generateDashboardReport(data, res);
  }

  @Get('machine/:machineId/pdf')
  @ApiOperation({ summary: 'Скачать отчет по аппарату как PDF' })
  @ApiParam({ name: 'machineId', description: 'UUID аппарата' })
  @ApiResponse({
    status: 200,
    description: 'PDF файл отчета по аппарату',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async downloadMachineReportPDF(
    @Param('machineId') machineId: string,
    @Query() filters: ReportFiltersDto,
    @Res() res: Response,
  ) {
    const data = await this.reportsService.getMachineReport(machineId, filters);

    // Transform data to match MachineStatsData interface
    const stats = {
      total_revenue: data.sales?.total || 0,
      total_collections: data.collections?.total || 0,
      total_expenses: 0,
      net_profit: (data.sales?.total || 0) - (data.collections?.total || 0),
      tasks: {
        total: data.tasks?.reduce((sum, t) => sum + t.count, 0) || 0,
        completed: data.tasks?.find((t) => t.type === 'completed')?.count || 0,
        pending: data.tasks?.find((t) => t.type === 'pending')?.count || 0,
        overdue: 0,
      },
      incidents: {
        total: data.incidents || 0,
        open: 0,
        resolved: 0,
      },
    };

    await this.pdfGeneratorService.generateMachineReport(data.machine, stats, res);
  }

  // ============================================================================
  // NETWORK SUMMARY REPORT
  // ============================================================================

  @Get('network-summary')
  @ApiOperation({ summary: 'Получить отчет по сети' })
  @ApiResponse({
    status: 200,
    description: 'Сводный отчет по всей сети аппаратов',
  })
  async getNetworkSummary(@Query() filters: ReportFiltersDto, @Res() res: Response) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.networkSummaryService.generateReport(startDate, endDate);

    // Check if Excel export requested
    if (filters.format === 'xlsx') {
      const buffer = await this.excelExportService.exportNetworkSummary(report);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="network-summary-${startDate.toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': buffer.length,
      });

      return res.status(HttpStatus.OK).send(buffer);
    }

    // Default: return JSON
    return res.status(HttpStatus.OK).json(report);
  }

  // ============================================================================
  // PROFIT & LOSS REPORT
  // ============================================================================

  @Get('profit-loss')
  @ApiOperation({ summary: 'Получить отчет о прибылях и убытках (P&L)' })
  @ApiResponse({
    status: 200,
    description: 'Отчет о прибылях и убытках за период',
  })
  async getProfitLoss(@Query() filters: ReportFiltersDto, @Res() res: Response) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.profitLossService.generateReport(startDate, endDate);

    // Check if Excel export requested
    if (filters.format === 'xlsx') {
      const buffer = await this.excelExportService.exportProfitLoss(report);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="profit-loss-${startDate.toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': buffer.length,
      });

      return res.status(HttpStatus.OK).send(buffer);
    }

    // Default: return JSON
    return res.status(HttpStatus.OK).json(report);
  }

  // ============================================================================
  // CASH FLOW REPORT
  // ============================================================================

  @Get('cash-flow')
  @ApiOperation({ summary: 'Получить отчет о движении денежных средств' })
  @ApiResponse({
    status: 200,
    description: 'Отчет о движении денежных средств за период',
  })
  async getCashFlow(@Query() filters: ReportFiltersDto, @Res() res: Response) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.cashFlowService.generateReport(startDate, endDate);

    // Check if Excel export requested
    if (filters.format === 'xlsx') {
      const buffer = await this.excelExportService.exportCashFlow(report);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="cash-flow-${startDate.toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': buffer.length,
      });

      return res.status(HttpStatus.OK).send(buffer);
    }

    // Default: return JSON
    return res.status(HttpStatus.OK).json(report);
  }

  // ============================================================================
  // MACHINE PERFORMANCE REPORT
  // ============================================================================

  @Get('machine-performance/:machineId')
  @ApiOperation({ summary: 'Получить отчет по производительности аппарата' })
  @ApiParam({ name: 'machineId', description: 'UUID аппарата' })
  @ApiResponse({
    status: 200,
    description: 'Детальный отчет по производительности аппарата',
  })
  async getMachinePerformance(
    @Param('machineId') machineId: string,
    @Query() filters: ReportFiltersDto,
    @Res() res: Response,
  ) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.machinePerformanceService.generateReport(
      machineId,
      startDate,
      endDate,
    );

    // Check if Excel export requested
    if (filters.format === 'xlsx') {
      const buffer = await this.excelExportService.exportMachinePerformance(report);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="machine-${machineId}-${startDate.toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': buffer.length,
      });

      return res.status(HttpStatus.OK).send(buffer);
    }

    // Default: return JSON
    return res.status(HttpStatus.OK).json(report);
  }

  // ============================================================================
  // LOCATION PERFORMANCE REPORT
  // ============================================================================

  @Get('location-performance/:locationId')
  @ApiOperation({ summary: 'Получить отчет по производительности локации' })
  @ApiParam({ name: 'locationId', description: 'UUID локации' })
  @ApiResponse({
    status: 200,
    description: 'Детальный отчет по производительности локации',
  })
  async getLocationPerformance(
    @Param('locationId') locationId: string,
    @Query() filters: ReportFiltersDto,
    @Res() res: Response,
  ) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.locationPerformanceService.generateReport(
      locationId,
      startDate,
      endDate,
    );

    // Check if Excel export requested
    if (filters.format === 'xlsx') {
      const buffer = await this.excelExportService.exportLocationPerformance(report);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="location-${locationId}-${startDate.toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': buffer.length,
      });

      return res.status(HttpStatus.OK).send(buffer);
    }

    // Default: return JSON
    return res.status(HttpStatus.OK).json(report);
  }

  // ============================================================================
  // PRODUCT SALES REPORTS
  // ============================================================================

  @Get('product-sales/:productId')
  @ApiOperation({ summary: 'Получить отчет по продажам продукта' })
  @ApiParam({ name: 'productId', description: 'UUID продукта' })
  @ApiResponse({
    status: 200,
    description: 'Детальный отчет по продажам конкретного продукта',
  })
  async getProductSales(
    @Param('productId') productId: string,
    @Query() filters: ReportFiltersDto,
    @Res() res: Response,
  ) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.productSalesService.generateProductReport(
      productId,
      startDate,
      endDate,
    );

    // Check if Excel export requested
    if (filters.format === 'xlsx') {
      const buffer = await this.excelExportService.exportProductSales(report);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="product-${productId}-${startDate.toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': buffer.length,
      });

      return res.status(HttpStatus.OK).send(buffer);
    }

    // Default: return JSON
    return res.status(HttpStatus.OK).json(report);
  }

  @Get('product-sales')
  @ApiOperation({ summary: 'Получить отчет по продажам всех продуктов' })
  @ApiResponse({
    status: 200,
    description: 'Сводный отчет по продажам всех продуктов',
  })
  async getAllProductsSales(@Query() filters: ReportFiltersDto, @Res() res: Response) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.productSalesService.generateAllProductsReport(startDate, endDate);

    // Check if Excel export requested
    if (filters.format === 'xlsx') {
      const buffer = await this.excelExportService.exportAllProductsSales(report);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="all-products-${startDate.toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': buffer.length,
      });

      return res.status(HttpStatus.OK).send(buffer);
    }

    // Default: return JSON
    return res.status(HttpStatus.OK).json(report);
  }

  // ============================================================================
  // COLLECTIONS SUMMARY REPORT
  // ============================================================================

  @Get('collections-summary')
  @ApiOperation({ summary: 'Получить сводный отчет по инкассациям' })
  @ApiResponse({
    status: 200,
    description: 'Сводный отчет по всем инкассациям',
  })
  async getCollectionsSummary(@Query() filters: ReportFiltersDto, @Res() res: Response) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.collectionsSummaryService.generateReport(startDate, endDate);

    // Check if Excel export requested
    if (filters.format === 'xlsx') {
      const buffer = await this.excelExportService.exportCollectionsSummary(report);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="collections-summary-${startDate.toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': buffer.length,
      });

      return res.status(HttpStatus.OK).send(buffer);
    }

    // Default: return JSON
    return res.status(HttpStatus.OK).json(report);
  }

  // ============================================================================
  // OPERATOR PERFORMANCE REPORT
  // ============================================================================

  @Get('operator-performance/:operatorId')
  @ApiOperation({ summary: 'Получить отчет по производительности оператора' })
  @ApiParam({ name: 'operatorId', description: 'UUID оператора' })
  @ApiResponse({
    status: 200,
    description: 'Детальный отчет по производительности оператора',
  })
  async getOperatorPerformance(
    @Param('operatorId') operatorId: string,
    @Query() filters: ReportFiltersDto,
    @Res() res: Response,
  ) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.operatorPerformanceReportService.generateOperatorReport(
      operatorId,
      startDate,
      endDate,
    );

    return res.status(HttpStatus.OK).json(report);
  }

  @Get('operator-performance')
  @ApiOperation({ summary: 'Получить отчет по всем операторам' })
  @ApiResponse({
    status: 200,
    description: 'Сводный отчет по всем операторам',
  })
  async getAllOperatorsPerformance(@Query() filters: ReportFiltersDto, @Res() res: Response) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.operatorPerformanceReportService.generateAllOperatorsReport(
      startDate,
      endDate,
    );

    return res.status(HttpStatus.OK).json(report);
  }

  // ============================================================================
  // TASK EXECUTION STATISTICS
  // ============================================================================

  @Get('task-execution-stats')
  @ApiOperation({ summary: 'Получить статистику выполнения задач' })
  @ApiResponse({
    status: 200,
    description: 'Статистика выполнения задач за период',
  })
  async getTaskExecutionStats(@Query() filters: ReportFiltersDto, @Res() res: Response) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.taskExecutionStatsService.generateReport(startDate, endDate);

    return res.status(HttpStatus.OK).json(report);
  }

  // ============================================================================
  // WAREHOUSE INVENTORY REPORT
  // ============================================================================

  @Get('warehouse-inventory/:warehouseId')
  @ApiOperation({ summary: 'Получить отчет по складским запасам' })
  @ApiParam({ name: 'warehouseId', description: 'UUID склада' })
  @ApiResponse({
    status: 200,
    description: 'Детальный отчет по складским запасам',
  })
  async getWarehouseInventory(
    @Param('warehouseId') warehouseId: string,
    @Query() filters: ReportFiltersDto,
    @Res() res: Response,
  ) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.warehouseInventoryReportService.generateReport(
      warehouseId,
      startDate,
      endDate,
    );

    return res.status(HttpStatus.OK).json(report);
  }

  // ============================================================================
  // DEPRECIATION REPORT
  // ============================================================================

  @Get('depreciation')
  @ApiOperation({ summary: 'Получить отчет по амортизации оборудования' })
  @ApiResponse({
    status: 200,
    description: 'Отчет по амортизации всех активов',
  })
  async getDepreciation(@Query() filters: ReportFiltersDto, @Res() res: Response) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.depreciationReportService.generateReport(startDate, endDate);

    return res.status(HttpStatus.OK).json(report);
  }

  // ============================================================================
  // EXPIRY TRACKING REPORT
  // ============================================================================

  @Get('expiry-tracking')
  @ApiOperation({ summary: 'Получить отчет по срокам годности товаров' })
  @ApiResponse({
    status: 200,
    description: 'Отчет по товарам с истекающим сроком годности',
  })
  async getExpiryTracking(@Query() filters: ReportFiltersDto, @Res() res: Response) {
    // Default: look 90 days ahead for expiry tracking
    const daysAhead = filters.days_ahead || 90;

    const report = await this.expiryTrackingReportService.generateReport(daysAhead);

    return res.status(HttpStatus.OK).json(report);
  }

  // ============================================================================
  // INCIDENTS STATISTICS
  // ============================================================================

  @Get('incidents-stats')
  @ApiOperation({ summary: 'Получить статистику инцидентов' })
  @ApiResponse({
    status: 200,
    description: 'Статистика инцидентов за период',
  })
  async getIncidentsStats(@Query() filters: ReportFiltersDto, @Res() res: Response) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.incidentsStatsService.generateReport(startDate, endDate);

    return res.status(HttpStatus.OK).json(report);
  }

  // ============================================================================
  // COMPLAINTS STATISTICS (WITH NPS)
  // ============================================================================

  @Get('complaints-stats')
  @ApiOperation({ summary: 'Получить статистику жалоб с расчетом NPS' })
  @ApiResponse({
    status: 200,
    description: 'Статистика жалоб за период с индексом NPS',
  })
  async getComplaintsStats(@Query() filters: ReportFiltersDto, @Res() res: Response) {
    const { startDate, endDate } = this.getDateRange(filters);

    const report = await this.complaintsStatsService.generateReport(startDate, endDate);

    return res.status(HttpStatus.OK).json(report);
  }

  // ============================================================================
  // EXTENDED DASHBOARDS (ROLE-SPECIFIC)
  // ============================================================================

  @Get('dashboards/admin')
  @UseInterceptors(ReportsCacheInterceptor)
  @CacheTTL(CACHE_TTL_CONFIG.DASHBOARD_ADMIN)
  @ApiOperation({ summary: 'Получить расширенный дашборд администратора' })
  @ApiResponse({
    status: 200,
    description: 'Расширенный дашборд с сетевыми KPI для администратора (кэш: 5 мин)',
  })
  async getAdminDashboard(@Res() res: Response) {
    const dashboard = await this.adminDashboardService.generateDashboard();
    return res.status(HttpStatus.OK).json(dashboard);
  }

  @Get('dashboards/manager')
  @UseInterceptors(ReportsCacheInterceptor)
  @CacheTTL(CACHE_TTL_CONFIG.DASHBOARD_MANAGER)
  @ApiOperation({ summary: 'Получить расширенный дашборд менеджера' })
  @ApiResponse({
    status: 200,
    description: 'Расширенный дашборд с операционными метриками для менеджера (кэш: 5 мин)',
  })
  async getManagerDashboard(@Query('location_ids') locationIds: string, @Res() res: Response) {
    // Parse location IDs if provided
    const locationIdArray = locationIds ? locationIds.split(',').filter(Boolean) : undefined;

    const dashboard = await this.managerDashboardService.generateDashboard(locationIdArray);
    return res.status(HttpStatus.OK).json(dashboard);
  }

  @Get('dashboards/operator/:operatorId')
  @UseInterceptors(ReportsCacheInterceptor)
  @CacheTTL(CACHE_TTL_CONFIG.DASHBOARD_OPERATOR)
  @ApiOperation({ summary: 'Получить расширенный дашборд оператора' })
  @ApiParam({ name: 'operatorId', description: 'UUID оператора' })
  @ApiResponse({
    status: 200,
    description: 'Расширенный дашборд с задачами и производительностью для оператора (кэш: 3 мин)',
  })
  async getOperatorDashboard(
    @Param('operatorId') operatorId: string,
    @Query('operator_name') operatorName: string,
    @Query('operator_role') operatorRole: string,
    @Res() res: Response,
  ) {
    const dashboard = await this.operatorDashboardService.generateDashboard(
      operatorId,
      operatorName || 'Оператор',
      operatorRole || 'OPERATOR',
    );
    return res.status(HttpStatus.OK).json(dashboard);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get date range from filters or default to current month
   */
  private getDateRange(filters: ReportFiltersDto): {
    startDate: Date;
    endDate: Date;
  } {
    let startDate: Date;
    let endDate: Date;

    if (filters.start_date && filters.end_date) {
      startDate = new Date(filters.start_date);
      endDate = new Date(filters.end_date);
    } else {
      // Default: current month
      const now = new Date();
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }

    return { startDate, endDate };
  }
}
