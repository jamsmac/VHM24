import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { HttpStatus } from '@nestjs/common';
import { ReportsController } from './reports.controller';
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

describe('ReportsController', () => {
  let controller: ReportsController;
  let mockReportsService: jest.Mocked<ReportsService>;
  let mockPdfGeneratorService: jest.Mocked<PdfGeneratorService>;
  let mockNetworkSummaryService: jest.Mocked<NetworkSummaryService>;
  let mockProfitLossService: jest.Mocked<ProfitLossService>;
  let mockCashFlowService: jest.Mocked<CashFlowService>;
  let mockExcelExportService: jest.Mocked<ExcelExportService>;
  let mockMachinePerformanceService: jest.Mocked<MachinePerformanceService>;
  let mockLocationPerformanceService: jest.Mocked<LocationPerformanceService>;
  let mockProductSalesService: jest.Mocked<ProductSalesService>;
  let mockCollectionsSummaryService: jest.Mocked<CollectionsSummaryService>;
  let mockOperatorPerformanceReportService: jest.Mocked<OperatorPerformanceReportService>;
  let mockTaskExecutionStatsService: jest.Mocked<TaskExecutionStatsService>;
  let mockWarehouseInventoryReportService: jest.Mocked<WarehouseInventoryReportService>;
  let mockDepreciationReportService: jest.Mocked<DepreciationReportService>;
  let mockExpiryTrackingReportService: jest.Mocked<ExpiryTrackingReportService>;
  let mockIncidentsStatsService: jest.Mocked<IncidentsStatsService>;
  let mockComplaintsStatsService: jest.Mocked<ComplaintsStatsService>;
  let mockAdminDashboardService: jest.Mocked<AdminDashboardService>;
  let mockManagerDashboardService: jest.Mocked<ManagerDashboardService>;
  let mockOperatorDashboardService: jest.Mocked<OperatorDashboardService>;

  const mockResponse = () => {
    const res: Partial<Response> = {
      set: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    return res as Response;
  };

  beforeEach(async () => {
    mockReportsService = {
      getDashboard: jest.fn(),
      getMachineReport: jest.fn(),
      getUserReport: jest.fn(),
    } as any;

    mockPdfGeneratorService = {
      generateDashboardReport: jest.fn(),
      generateMachineReport: jest.fn(),
    } as any;

    mockNetworkSummaryService = {
      generateReport: jest.fn(),
    } as any;

    mockProfitLossService = {
      generateReport: jest.fn(),
    } as any;

    mockCashFlowService = {
      generateReport: jest.fn(),
    } as any;

    mockExcelExportService = {
      exportNetworkSummary: jest.fn(),
      exportProfitLoss: jest.fn(),
      exportCashFlow: jest.fn(),
      exportMachinePerformance: jest.fn(),
      exportLocationPerformance: jest.fn(),
      exportProductSales: jest.fn(),
      exportAllProductsSales: jest.fn(),
      exportCollectionsSummary: jest.fn(),
    } as any;

    mockMachinePerformanceService = {
      generateReport: jest.fn(),
    } as any;

    mockLocationPerformanceService = {
      generateReport: jest.fn(),
    } as any;

    mockProductSalesService = {
      generateProductReport: jest.fn(),
      generateAllProductsReport: jest.fn(),
    } as any;

    mockCollectionsSummaryService = {
      generateReport: jest.fn(),
    } as any;

    mockOperatorPerformanceReportService = {
      generateOperatorReport: jest.fn(),
      generateAllOperatorsReport: jest.fn(),
    } as any;

    mockTaskExecutionStatsService = {
      generateReport: jest.fn(),
    } as any;

    mockWarehouseInventoryReportService = {
      generateReport: jest.fn(),
    } as any;

    mockDepreciationReportService = {
      generateReport: jest.fn(),
    } as any;

    mockExpiryTrackingReportService = {
      generateReport: jest.fn(),
    } as any;

    mockIncidentsStatsService = {
      generateReport: jest.fn(),
    } as any;

    mockComplaintsStatsService = {
      generateReport: jest.fn(),
    } as any;

    mockAdminDashboardService = {
      generateDashboard: jest.fn(),
    } as any;

    mockManagerDashboardService = {
      generateDashboard: jest.fn(),
    } as any;

    mockOperatorDashboardService = {
      generateDashboard: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useValue: mockReportsService },
        { provide: PdfGeneratorService, useValue: mockPdfGeneratorService },
        { provide: NetworkSummaryService, useValue: mockNetworkSummaryService },
        { provide: ProfitLossService, useValue: mockProfitLossService },
        { provide: CashFlowService, useValue: mockCashFlowService },
        { provide: ExcelExportService, useValue: mockExcelExportService },
        { provide: MachinePerformanceService, useValue: mockMachinePerformanceService },
        { provide: LocationPerformanceService, useValue: mockLocationPerformanceService },
        { provide: ProductSalesService, useValue: mockProductSalesService },
        { provide: CollectionsSummaryService, useValue: mockCollectionsSummaryService },
        {
          provide: OperatorPerformanceReportService,
          useValue: mockOperatorPerformanceReportService,
        },
        { provide: TaskExecutionStatsService, useValue: mockTaskExecutionStatsService },
        { provide: WarehouseInventoryReportService, useValue: mockWarehouseInventoryReportService },
        { provide: DepreciationReportService, useValue: mockDepreciationReportService },
        { provide: ExpiryTrackingReportService, useValue: mockExpiryTrackingReportService },
        { provide: IncidentsStatsService, useValue: mockIncidentsStatsService },
        { provide: ComplaintsStatsService, useValue: mockComplaintsStatsService },
        { provide: AdminDashboardService, useValue: mockAdminDashboardService },
        { provide: ManagerDashboardService, useValue: mockManagerDashboardService },
        { provide: OperatorDashboardService, useValue: mockOperatorDashboardService },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should return dashboard data', async () => {
      const mockDashboard = {
        financial: { revenue: 100000 },
        tasks: { total: 50 },
      } as any;
      mockReportsService.getDashboard.mockResolvedValue(mockDashboard);

      const result = await controller.getDashboard({});

      expect(result).toEqual(mockDashboard);
      expect(mockReportsService.getDashboard).toHaveBeenCalled();
    });

    it('should pass filters to service', async () => {
      const filters: ReportFiltersDto = {
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      };
      mockReportsService.getDashboard.mockResolvedValue({} as any);

      await controller.getDashboard(filters);

      expect(mockReportsService.getDashboard).toHaveBeenCalledWith(filters);
    });
  });

  describe('getMachineReport', () => {
    it('should return machine report', async () => {
      const mockReport = {
        machine: { id: 'machine-123' },
        sales: { total: 50000 },
      } as any;
      mockReportsService.getMachineReport.mockResolvedValue(mockReport);

      const result = await controller.getMachineReport('machine-123', {});

      expect(result).toEqual(mockReport);
      expect(mockReportsService.getMachineReport).toHaveBeenCalledWith('machine-123', {});
    });
  });

  describe('getUserReport', () => {
    it('should return user report', async () => {
      const mockReport = {
        tasks: { completed: 25 },
        collections: { total: 100000 },
      } as any;
      mockReportsService.getUserReport.mockResolvedValue(mockReport);

      const result = await controller.getUserReport('user-123', {});

      expect(result).toEqual(mockReport);
      expect(mockReportsService.getUserReport).toHaveBeenCalledWith('user-123', {});
    });
  });

  describe('downloadDashboardPDF', () => {
    it('should generate PDF report', async () => {
      const mockDashboard = { financial: { revenue: 100000 } } as any;
      mockReportsService.getDashboard.mockResolvedValue(mockDashboard);
      mockPdfGeneratorService.generateDashboardReport.mockResolvedValue(undefined);

      const res = mockResponse();
      await controller.downloadDashboardPDF({}, res);

      expect(mockReportsService.getDashboard).toHaveBeenCalled();
      expect(mockPdfGeneratorService.generateDashboardReport).toHaveBeenCalledWith(
        mockDashboard,
        res,
      );
    });
  });

  describe('downloadMachineReportPDF', () => {
    it('should generate machine PDF report', async () => {
      const mockReport = {
        machine: { id: 'machine-123', name: 'Test Machine' },
        sales: { total: 50000 },
        collections: { total: 40000 },
        tasks: [],
        incidents: 2,
      } as any;
      mockReportsService.getMachineReport.mockResolvedValue(mockReport);
      mockPdfGeneratorService.generateMachineReport.mockResolvedValue(undefined);

      const res = mockResponse();
      await controller.downloadMachineReportPDF('machine-123', {}, res);

      expect(mockReportsService.getMachineReport).toHaveBeenCalled();
      expect(mockPdfGeneratorService.generateMachineReport).toHaveBeenCalled();
    });
  });

  describe('getNetworkSummary', () => {
    it('should return JSON by default', async () => {
      const mockReport = { totalMachines: 100 } as any;
      mockNetworkSummaryService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getNetworkSummary({}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });

    it('should export Excel when format is xlsx', async () => {
      const mockReport = { totalMachines: 100 } as any;
      const mockBuffer = Buffer.from('excel data');
      mockNetworkSummaryService.generateReport.mockResolvedValue(mockReport);
      mockExcelExportService.exportNetworkSummary.mockResolvedValue(mockBuffer);

      const res = mockResponse();
      await controller.getNetworkSummary({ format: 'xlsx' as any }, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('getProfitLoss', () => {
    it('should return JSON by default', async () => {
      const mockReport = { netProfit: 50000 } as any;
      mockProfitLossService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getProfitLoss({}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });

    it('should export Excel when format is xlsx', async () => {
      const mockReport = { netProfit: 50000 } as any;
      const mockBuffer = Buffer.from('excel data');
      mockProfitLossService.generateReport.mockResolvedValue(mockReport);
      mockExcelExportService.exportProfitLoss.mockResolvedValue(mockBuffer);

      const res = mockResponse();
      await controller.getProfitLoss({ format: 'xlsx' as any }, res);

      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('getCashFlow', () => {
    it('should return JSON by default', async () => {
      const mockReport = { inflow: 100000, outflow: 50000 } as any;
      mockCashFlowService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getCashFlow({}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });

    it('should export Excel when format is xlsx', async () => {
      const mockReport = { inflow: 100000, outflow: 50000 } as any;
      const mockBuffer = Buffer.from('excel data');
      mockCashFlowService.generateReport.mockResolvedValue(mockReport);
      mockExcelExportService.exportCashFlow.mockResolvedValue(mockBuffer);

      const res = mockResponse();
      await controller.getCashFlow({ format: 'xlsx' as any }, res);

      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('getMachinePerformance', () => {
    it('should return machine performance report', async () => {
      const mockReport = { performance: 95 } as any;
      mockMachinePerformanceService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getMachinePerformance('machine-123', {}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });

    it('should export Excel when format is xlsx', async () => {
      const mockReport = { performance: 95 } as any;
      const mockBuffer = Buffer.from('excel data');
      mockMachinePerformanceService.generateReport.mockResolvedValue(mockReport);
      mockExcelExportService.exportMachinePerformance.mockResolvedValue(mockBuffer);

      const res = mockResponse();
      await controller.getMachinePerformance('machine-123', { format: 'xlsx' as any }, res);

      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('getLocationPerformance', () => {
    it('should return location performance report', async () => {
      const mockReport = { revenue: 500000 } as any;
      mockLocationPerformanceService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getLocationPerformance('location-123', {}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });

    it('should export Excel when format is xlsx', async () => {
      const mockReport = { revenue: 500000 } as any;
      const mockBuffer = Buffer.from('excel data');
      mockLocationPerformanceService.generateReport.mockResolvedValue(mockReport);
      mockExcelExportService.exportLocationPerformance.mockResolvedValue(mockBuffer);

      const res = mockResponse();
      await controller.getLocationPerformance('location-123', { format: 'xlsx' as any }, res);

      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('getProductSales', () => {
    it('should return product sales report', async () => {
      const mockReport = { totalSales: 1000 } as any;
      mockProductSalesService.generateProductReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getProductSales('product-123', {}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });

    it('should export Excel when format is xlsx', async () => {
      const mockReport = { totalSales: 1000 } as any;
      const mockBuffer = Buffer.from('excel data');
      mockProductSalesService.generateProductReport.mockResolvedValue(mockReport);
      mockExcelExportService.exportProductSales.mockResolvedValue(mockBuffer);

      const res = mockResponse();
      await controller.getProductSales('product-123', { format: 'xlsx' as any }, res);

      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('getAllProductsSales', () => {
    it('should return all products sales report', async () => {
      const mockReport = { products: [] } as any;
      mockProductSalesService.generateAllProductsReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getAllProductsSales({}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });

    it('should export Excel when format is xlsx', async () => {
      const mockReport = { products: [] } as any;
      const mockBuffer = Buffer.from('excel data');
      mockProductSalesService.generateAllProductsReport.mockResolvedValue(mockReport);
      mockExcelExportService.exportAllProductsSales.mockResolvedValue(mockBuffer);

      const res = mockResponse();
      await controller.getAllProductsSales({ format: 'xlsx' as any }, res);

      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('getCollectionsSummary', () => {
    it('should return collections summary report', async () => {
      const mockReport = { totalCollections: 500000 } as any;
      mockCollectionsSummaryService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getCollectionsSummary({}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });

    it('should export Excel when format is xlsx', async () => {
      const mockReport = { totalCollections: 500000 } as any;
      const mockBuffer = Buffer.from('excel data');
      mockCollectionsSummaryService.generateReport.mockResolvedValue(mockReport);
      mockExcelExportService.exportCollectionsSummary.mockResolvedValue(mockBuffer);

      const res = mockResponse();
      await controller.getCollectionsSummary({ format: 'xlsx' as any }, res);

      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('getOperatorPerformance', () => {
    it('should return operator performance report', async () => {
      const mockReport = { tasksCompleted: 100 } as any;
      mockOperatorPerformanceReportService.generateOperatorReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getOperatorPerformance('operator-123', {}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });
  });

  describe('getAllOperatorsPerformance', () => {
    it('should return all operators performance report', async () => {
      const mockReport = { operators: [] } as any;
      mockOperatorPerformanceReportService.generateAllOperatorsReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getAllOperatorsPerformance({}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });
  });

  describe('getTaskExecutionStats', () => {
    it('should return task execution stats', async () => {
      const mockReport = { totalTasks: 500 } as any;
      mockTaskExecutionStatsService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getTaskExecutionStats({}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });
  });

  describe('getWarehouseInventory', () => {
    it('should return warehouse inventory report', async () => {
      const mockReport = { totalItems: 1000 } as any;
      mockWarehouseInventoryReportService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getWarehouseInventory('warehouse-123', {}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });
  });

  describe('getDepreciation', () => {
    it('should return depreciation report', async () => {
      const mockReport = { totalDepreciation: 50000 } as any;
      mockDepreciationReportService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getDepreciation({}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });
  });

  describe('getExpiryTracking', () => {
    it('should return expiry tracking report with default days', async () => {
      const mockReport = { expiringItems: [] } as any;
      mockExpiryTrackingReportService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getExpiryTracking({}, res);

      expect(mockExpiryTrackingReportService.generateReport).toHaveBeenCalledWith(90);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should use custom days_ahead when provided', async () => {
      const mockReport = { expiringItems: [] } as any;
      mockExpiryTrackingReportService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getExpiryTracking({ days_ahead: 30 }, res);

      expect(mockExpiryTrackingReportService.generateReport).toHaveBeenCalledWith(30);
    });
  });

  describe('getIncidentsStats', () => {
    it('should return incidents stats', async () => {
      const mockReport = { totalIncidents: 25 } as any;
      mockIncidentsStatsService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getIncidentsStats({}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });
  });

  describe('getComplaintsStats', () => {
    it('should return complaints stats with NPS', async () => {
      const mockReport = { nps: 45 } as any;
      mockComplaintsStatsService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getComplaintsStats({}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });
  });

  describe('getAdminDashboard', () => {
    it('should return admin dashboard', async () => {
      const mockDashboard = { networkKPIs: {} } as any;
      mockAdminDashboardService.generateDashboard.mockResolvedValue(mockDashboard);

      const res = mockResponse();
      await controller.getAdminDashboard(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockDashboard);
    });
  });

  describe('getManagerDashboard', () => {
    it('should return manager dashboard', async () => {
      const mockDashboard = { operationalMetrics: {} } as any;
      mockManagerDashboardService.generateDashboard.mockResolvedValue(mockDashboard);

      const res = mockResponse();
      await controller.getManagerDashboard('', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockDashboard);
    });

    it('should pass location IDs to service', async () => {
      const mockDashboard = { operationalMetrics: {} } as any;
      mockManagerDashboardService.generateDashboard.mockResolvedValue(mockDashboard);

      const res = mockResponse();
      await controller.getManagerDashboard('loc1,loc2,loc3', res);

      expect(mockManagerDashboardService.generateDashboard).toHaveBeenCalledWith([
        'loc1',
        'loc2',
        'loc3',
      ]);
    });
  });

  describe('getOperatorDashboard', () => {
    it('should return operator dashboard', async () => {
      const mockDashboard = { tasks: [], performance: {} } as any;
      mockOperatorDashboardService.generateDashboard.mockResolvedValue(mockDashboard);

      const res = mockResponse();
      await controller.getOperatorDashboard('operator-123', 'John Doe', 'OPERATOR', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockDashboard);
    });

    it('should use default values for name and role', async () => {
      const mockDashboard = { tasks: [] } as any;
      mockOperatorDashboardService.generateDashboard.mockResolvedValue(mockDashboard);

      const res = mockResponse();
      await controller.getOperatorDashboard(
        'operator-123',
        undefined as any,
        undefined as any,
        res,
      );

      expect(mockOperatorDashboardService.generateDashboard).toHaveBeenCalledWith(
        'operator-123',
        'Оператор',
        'OPERATOR',
      );
    });
  });

  describe('getDateRange helper', () => {
    it('should use provided start_date and end_date', async () => {
      const mockReport = {} as any;
      mockNetworkSummaryService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getNetworkSummary(
        {
          start_date: '2025-01-01',
          end_date: '2025-01-31',
        },
        res,
      );

      expect(mockNetworkSummaryService.generateReport).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should default to current month when dates not provided', async () => {
      const mockReport = {} as any;
      mockNetworkSummaryService.generateReport.mockResolvedValue(mockReport);

      const res = mockResponse();
      await controller.getNetworkSummary({}, res);

      // Should be called with current month dates
      expect(mockNetworkSummaryService.generateReport).toHaveBeenCalled();
    });
  });
});
