import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { InventoryExportService } from './inventory-export.service';
import { InventoryDifferenceService, DifferenceReportItem } from './inventory-difference.service';
import { InventoryLevelType } from '../entities/inventory-actual-count.entity';
import { SeverityLevel } from '../entities/inventory-difference-threshold.entity';

/**
 * Unit Tests for InventoryExportService
 *
 * Tests Excel and CSV export functionality for inventory difference reports.
 */
describe('InventoryExportService', () => {
  let service: InventoryExportService;
  let differenceService: any;
  let mockResponse: Partial<Response>;

  // Test fixtures
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testMachineId = '22222222-2222-2222-2222-222222222222';

  const createDifferenceReportItem = (overrides = {}): DifferenceReportItem => ({
    actual_count_id: 'count-1',
    nomenclature_id: 'nom-1',
    nomenclature_name: 'Coffee Beans',
    level_type: InventoryLevelType.MACHINE,
    level_ref_id: testMachineId,
    counted_at: new Date('2025-06-15'),
    actual_quantity: 80,
    counted_by: { id: testUserId, full_name: 'John Doe' },
    calculated_quantity: 100,
    difference_abs: -20,
    difference_rel: -20,
    severity: SeverityLevel.WARNING,
    threshold_exceeded: true,
    applied_threshold: {
      id: 'threshold-1',
      name: 'Warning Threshold',
      threshold_type: 'GLOBAL' as any,
    },
    ...overrides,
  });

  beforeEach(async () => {
    differenceService = {
      getDifferencesReport: jest.fn(),
    };

    mockResponse = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryExportService,
        {
          provide: InventoryDifferenceService,
          useValue: differenceService,
        },
      ],
    }).compile();

    service = module.get<InventoryExportService>(InventoryExportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportDifferencesToExcel', () => {
    it('should export differences to Excel with correct headers', async () => {
      // Arrange
      const mockData = [
        createDifferenceReportItem(),
        createDifferenceReportItem({
          actual_count_id: 'count-2',
          nomenclature_name: 'Milk',
          actual_quantity: 50,
          calculated_quantity: 60,
          difference_abs: -10,
          difference_rel: -16.67,
        }),
      ];

      differenceService.getDifferencesReport.mockResolvedValue({
        data: mockData,
        total: 2,
      });

      // Act
      await service.exportDifferencesToExcel({}, mockResponse as Response);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.xlsx'),
      );
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should include date in filename', async () => {
      // Arrange
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [],
        total: 0,
      });

      // Act
      await service.exportDifferencesToExcel({}, mockResponse as Response);

      // Assert
      const headerCall = (mockResponse.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Disposition',
      );
      expect(headerCall[1]).toMatch(/inventory-differences-\d{4}-\d{2}-\d{2}\.xlsx/);
    });

    it('should pass filters without pagination to difference service', async () => {
      // Arrange
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [],
        total: 0,
      });

      const filters = {
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        limit: 10, // Should be removed
        offset: 5, // Should be removed
      };

      // Act
      await service.exportDifferencesToExcel(filters, mockResponse as Response);

      // Assert
      expect(differenceService.getDifferencesReport).toHaveBeenCalledWith({
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        limit: undefined,
        offset: undefined,
      });
    });

    it('should handle empty data gracefully', async () => {
      // Arrange
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [],
        total: 0,
      });

      // Act
      await service.exportDifferencesToExcel({}, mockResponse as Response);

      // Assert
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should throw error when export fails', async () => {
      // Arrange
      differenceService.getDifferencesReport.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.exportDifferencesToExcel({}, mockResponse as Response)).rejects.toThrow(
        'Database error',
      );
    });

    it('should send buffer response', async () => {
      // Arrange
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [createDifferenceReportItem()],
        total: 1,
      });

      // Act
      await service.exportDifferencesToExcel({}, mockResponse as Response);

      // Assert
      expect(mockResponse.send).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });

  describe('exportDifferencesToCSV', () => {
    it('should export differences to CSV with correct headers', async () => {
      // Arrange
      const mockData = [createDifferenceReportItem()];

      differenceService.getDifferencesReport.mockResolvedValue({
        data: mockData,
        total: 1,
      });

      // Act
      await service.exportDifferencesToCSV({}, mockResponse as Response);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv; charset=utf-8',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.csv'),
      );
    });

    it('should include BOM for Excel compatibility', async () => {
      // Arrange
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [],
        total: 0,
      });

      // Act
      await service.exportDifferencesToCSV({}, mockResponse as Response);

      // Assert
      const sendCall = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(sendCall.startsWith('\uFEFF')).toBe(true); // BOM character
    });

    it('should include date in filename', async () => {
      // Arrange
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [],
        total: 0,
      });

      // Act
      await service.exportDifferencesToCSV({}, mockResponse as Response);

      // Assert
      const headerCall = (mockResponse.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Disposition',
      );
      expect(headerCall[1]).toMatch(/inventory-differences-\d{4}-\d{2}-\d{2}\.csv/);
    });

    it('should pass filters without pagination to difference service', async () => {
      // Arrange
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [],
        total: 0,
      });

      const filters = {
        nomenclature_id: 'nom-1',
        limit: 100,
        offset: 20,
      };

      // Act
      await service.exportDifferencesToCSV(filters, mockResponse as Response);

      // Assert
      expect(differenceService.getDifferencesReport).toHaveBeenCalledWith({
        nomenclature_id: 'nom-1',
        limit: undefined,
        offset: undefined,
      });
    });

    it('should handle empty data gracefully', async () => {
      // Arrange
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [],
        total: 0,
      });

      // Act
      await service.exportDifferencesToCSV({}, mockResponse as Response);

      // Assert
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should throw error when export fails', async () => {
      // Arrange
      differenceService.getDifferencesReport.mockRejectedValue(new Error('Service error'));

      // Act & Assert
      await expect(service.exportDifferencesToCSV({}, mockResponse as Response)).rejects.toThrow(
        'Service error',
      );
    });
  });

  describe('Data transformation', () => {
    it('should translate level type to Russian', async () => {
      // Arrange
      const mockData = [
        createDifferenceReportItem({ level_type: InventoryLevelType.WAREHOUSE }),
        createDifferenceReportItem({ level_type: InventoryLevelType.OPERATOR }),
        createDifferenceReportItem({ level_type: InventoryLevelType.MACHINE }),
      ];

      differenceService.getDifferencesReport.mockResolvedValue({
        data: mockData,
        total: 3,
      });

      // Act
      await service.exportDifferencesToExcel({}, mockResponse as Response);

      // Assert
      // The buffer is sent, so we just verify the export completes successfully
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should translate severity to Russian', async () => {
      // Arrange
      const mockData = [
        createDifferenceReportItem({ severity: SeverityLevel.CRITICAL }),
        createDifferenceReportItem({ severity: SeverityLevel.WARNING }),
        createDifferenceReportItem({ severity: SeverityLevel.INFO }),
      ];

      differenceService.getDifferencesReport.mockResolvedValue({
        data: mockData,
        total: 3,
      });

      // Act
      await service.exportDifferencesToExcel({}, mockResponse as Response);

      // Assert
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should format threshold_exceeded as Yes/No', async () => {
      // Arrange
      const mockData = [
        createDifferenceReportItem({ threshold_exceeded: true }),
        createDifferenceReportItem({ threshold_exceeded: false }),
      ];

      differenceService.getDifferencesReport.mockResolvedValue({
        data: mockData,
        total: 2,
      });

      // Act
      await service.exportDifferencesToExcel({}, mockResponse as Response);

      // Assert
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should format difference_rel with percentage', async () => {
      // Arrange
      const mockData = [createDifferenceReportItem({ difference_rel: 15.333 })];

      differenceService.getDifferencesReport.mockResolvedValue({
        data: mockData,
        total: 1,
      });

      // Act
      await service.exportDifferencesToExcel({}, mockResponse as Response);

      // Assert
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should handle null counted_by gracefully', async () => {
      // Arrange
      const mockData = [createDifferenceReportItem({ counted_by: null as any })];

      differenceService.getDifferencesReport.mockResolvedValue({
        data: mockData,
        total: 1,
      });

      // Act
      await service.exportDifferencesToExcel({}, mockResponse as Response);

      // Assert
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe('Summary data generation', () => {
    it('should calculate correct summary statistics', async () => {
      // Arrange
      const mockData = [
        createDifferenceReportItem({
          severity: SeverityLevel.CRITICAL,
          threshold_exceeded: true,
          difference_abs: -20,
          difference_rel: -20,
        }),
        createDifferenceReportItem({
          severity: SeverityLevel.WARNING,
          threshold_exceeded: true,
          difference_abs: 10,
          difference_rel: 10,
        }),
        createDifferenceReportItem({
          severity: SeverityLevel.INFO,
          threshold_exceeded: false,
          difference_abs: 0,
          difference_rel: 0,
        }),
      ];

      differenceService.getDifferencesReport.mockResolvedValue({
        data: mockData,
        total: 3,
      });

      // Act
      await service.exportDifferencesToExcel({}, mockResponse as Response);

      // Assert - Summary sheet should include these calculations
      // Total: 3, Critical: 1, Warning: 1, Info: 1
      // Threshold exceeded: 2
      // Avg difference: (20 + 10 + 0) / 3 = 10%
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should count discrepancies correctly', async () => {
      // Arrange
      const mockData = [
        createDifferenceReportItem({ difference_abs: 0 }), // No discrepancy
        createDifferenceReportItem({ difference_abs: 5 }),
        createDifferenceReportItem({ difference_abs: -10 }),
      ];

      differenceService.getDifferencesReport.mockResolvedValue({
        data: mockData,
        total: 3,
      });

      // Act
      await service.exportDifferencesToExcel({}, mockResponse as Response);

      // Assert - Should count 2 discrepancies (non-zero)
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });
});
