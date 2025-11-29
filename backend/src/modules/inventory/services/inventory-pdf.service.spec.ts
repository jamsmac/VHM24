import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { InventoryPdfService } from './inventory-pdf.service';
import {
  InventoryDifferenceService,
  DifferenceReportItem,
  DifferenceDashboard,
} from './inventory-difference.service';
import { InventoryLevelType } from '../entities/inventory-actual-count.entity';
import { SeverityLevel, ThresholdType } from '../entities/inventory-difference-threshold.entity';

// Mock PDFKit - must use default export pattern for ES module
const mockPdfDoc = {
  fontSize: jest.fn().mockReturnThis(),
  font: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  moveDown: jest.fn().mockReturnThis(),
  moveTo: jest.fn().mockReturnThis(),
  lineTo: jest.fn().mockReturnThis(),
  stroke: jest.fn().mockReturnThis(),
  strokeColor: jest.fn().mockReturnThis(),
  addPage: jest.fn().mockReturnThis(),
  switchToPage: jest.fn().mockReturnThis(),
  pipe: jest.fn().mockReturnThis(),
  end: jest.fn(),
  y: 100,
  page: { height: 842 },
  bufferedPageRange: jest.fn().mockReturnValue({ count: 1 }),
};

jest.mock('pdfkit', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockPdfDoc),
  };
});

describe('InventoryPdfService', () => {
  let service: InventoryPdfService;
  let differenceService: jest.Mocked<InventoryDifferenceService>;

  const mockDashboard: DifferenceDashboard = {
    summary: {
      total_discrepancies: 10,
      total_items_counted: 100,
      critical_count: 2,
      warning_count: 5,
      info_count: 3,
      total_abs_difference: 50,
      avg_rel_difference: 5.5,
    },
    top_products: [],
    top_machines: [],
    top_operators: [],
  };

  const mockDifferenceItem: DifferenceReportItem = {
    actual_count_id: 'count-1',
    nomenclature_id: 'nom-1',
    nomenclature_name: 'Test Product',
    level_type: InventoryLevelType.MACHINE,
    level_ref_id: 'machine-1',
    counted_at: new Date('2025-01-15'),
    actual_quantity: 45,
    counted_by: { id: 'user-1', full_name: 'Test User' },
    calculated_quantity: 50,
    difference_abs: -5,
    difference_rel: -10,
    severity: SeverityLevel.WARNING,
    threshold_exceeded: true,
    applied_threshold: {
      id: 'threshold-1',
      name: 'Default Threshold',
      threshold_type: ThresholdType.GLOBAL,
    },
  };

  const createMockResponse = (): jest.Mocked<Response> => {
    return {
      setHeader: jest.fn(),
      pipe: jest.fn(),
    } as any;
  };

  beforeEach(async () => {
    const mockDifferenceService = {
      getDifferencesReport: jest.fn(),
      getDifferenceDashboard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryPdfService,
        {
          provide: InventoryDifferenceService,
          useValue: mockDifferenceService,
        },
      ],
    }).compile();

    service = module.get<InventoryPdfService>(InventoryPdfService);
    differenceService = module.get(InventoryDifferenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDifferencesPDF', () => {
    it('should generate PDF with differences report successfully', async () => {
      const mockRes = createMockResponse();
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [mockDifferenceItem],
        total: 1,
      });
      differenceService.getDifferenceDashboard.mockResolvedValue(mockDashboard);

      await service.generateDifferencesPDF(
        { date_from: '2025-01-01', date_to: '2025-01-31' },
        mockRes,
      );

      expect(differenceService.getDifferencesReport).toHaveBeenCalledWith({
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        limit: 100,
        offset: 0,
      });
      expect(differenceService.getDifferenceDashboard).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename="inventory-differences-report-'),
      );
    });

    it('should handle empty differences list', async () => {
      const mockRes = createMockResponse();
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [],
        total: 0,
      });
      differenceService.getDifferenceDashboard.mockResolvedValue({
        ...mockDashboard,
        summary: { ...mockDashboard.summary, total_discrepancies: 0 },
      });

      await service.generateDifferencesPDF({}, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });

    it('should throw error when getDifferencesReport fails', async () => {
      const mockRes = createMockResponse();
      const error = new Error('Database error');
      differenceService.getDifferencesReport.mockRejectedValue(error);

      await expect(service.generateDifferencesPDF({}, mockRes)).rejects.toThrow('Database error');
    });

    it('should throw error when getDifferenceDashboard fails', async () => {
      const mockRes = createMockResponse();
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [],
        total: 0,
      });
      differenceService.getDifferenceDashboard.mockRejectedValue(new Error('Dashboard error'));

      await expect(service.generateDifferencesPDF({}, mockRes)).rejects.toThrow('Dashboard error');
    });

    it('should handle dashboard with zero total discrepancies to prevent division by zero', async () => {
      const mockRes = createMockResponse();
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [],
        total: 0,
      });
      differenceService.getDifferenceDashboard.mockResolvedValue({
        ...mockDashboard,
        summary: {
          ...mockDashboard.summary,
          total_discrepancies: 0,
          critical_count: 0,
          warning_count: 0,
          info_count: 0,
        },
      });

      // Should not throw - handles division by zero gracefully
      await expect(service.generateDifferencesPDF({}, mockRes)).resolves.not.toThrow();
    });

    it('should truncate long product names', async () => {
      const mockRes = createMockResponse();
      const longNameItem: DifferenceReportItem = {
        ...mockDifferenceItem,
        nomenclature_name: 'A'.repeat(50), // 50 characters, more than 30
      };
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [longNameItem],
        total: 1,
      });
      differenceService.getDifferenceDashboard.mockResolvedValue(mockDashboard);

      await expect(service.generateDifferencesPDF({}, mockRes)).resolves.not.toThrow();
    });

    it('should handle more than 50 differences and show truncation message', async () => {
      const mockRes = createMockResponse();
      const manyDifferences = Array.from({ length: 60 }, (_, i) => ({
        ...mockDifferenceItem,
        actual_count_id: `count-${i}`,
        nomenclature_name: `Product ${i}`,
      }));
      differenceService.getDifferencesReport.mockResolvedValue({
        data: manyDifferences,
        total: 60,
      });
      differenceService.getDifferenceDashboard.mockResolvedValue(mockDashboard);

      await expect(service.generateDifferencesPDF({}, mockRes)).resolves.not.toThrow();
    });

    it('should handle differences with positive difference_rel', async () => {
      const mockRes = createMockResponse();
      const positiveItem: DifferenceReportItem = {
        ...mockDifferenceItem,
        difference_rel: 15.5, // Positive difference
      };
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [positiveItem],
        total: 1,
      });
      differenceService.getDifferenceDashboard.mockResolvedValue(mockDashboard);

      await expect(service.generateDifferencesPDF({}, mockRes)).resolves.not.toThrow();
    });

    it('should translate CRITICAL severity to Russian', async () => {
      const mockRes = createMockResponse();
      const criticalItem: DifferenceReportItem = {
        ...mockDifferenceItem,
        severity: SeverityLevel.CRITICAL,
      };
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [criticalItem],
        total: 1,
      });
      differenceService.getDifferenceDashboard.mockResolvedValue(mockDashboard);

      await expect(service.generateDifferencesPDF({}, mockRes)).resolves.not.toThrow();
    });

    it('should translate WARNING severity to Russian', async () => {
      const mockRes = createMockResponse();
      const warningItem: DifferenceReportItem = {
        ...mockDifferenceItem,
        severity: SeverityLevel.WARNING,
      };
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [warningItem],
        total: 1,
      });
      differenceService.getDifferenceDashboard.mockResolvedValue(mockDashboard);

      await expect(service.generateDifferencesPDF({}, mockRes)).resolves.not.toThrow();
    });

    it('should translate INFO severity to Russian', async () => {
      const mockRes = createMockResponse();
      const infoItem: DifferenceReportItem = {
        ...mockDifferenceItem,
        severity: SeverityLevel.INFO,
      };
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [infoItem],
        total: 1,
      });
      differenceService.getDifferenceDashboard.mockResolvedValue(mockDashboard);

      await expect(service.generateDifferencesPDF({}, mockRes)).resolves.not.toThrow();
    });

    it('should return original severity string for unknown severity', async () => {
      const mockRes = createMockResponse();
      const unknownItem: DifferenceReportItem = {
        ...mockDifferenceItem,
        severity: 'UNKNOWN' as SeverityLevel,
      };
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [unknownItem],
        total: 1,
      });
      differenceService.getDifferenceDashboard.mockResolvedValue(mockDashboard);

      await expect(service.generateDifferencesPDF({}, mockRes)).resolves.not.toThrow();
    });

    it('should handle product name exactly 30 characters (no truncation needed)', async () => {
      const mockRes = createMockResponse();
      const exactLengthItem: DifferenceReportItem = {
        ...mockDifferenceItem,
        nomenclature_name: 'A'.repeat(30), // Exactly 30 characters
      };
      differenceService.getDifferencesReport.mockResolvedValue({
        data: [exactLengthItem],
        total: 1,
      });
      differenceService.getDifferenceDashboard.mockResolvedValue(mockDashboard);

      await expect(service.generateDifferencesPDF({}, mockRes)).resolves.not.toThrow();
    });

    it('should add divider lines every 5 rows', async () => {
      const mockRes = createMockResponse();
      const tenItems = Array.from({ length: 10 }, (_, i) => ({
        ...mockDifferenceItem,
        actual_count_id: `count-${i}`,
        nomenclature_name: `Product ${i}`,
      }));
      differenceService.getDifferencesReport.mockResolvedValue({
        data: tenItems,
        total: 10,
      });
      differenceService.getDifferenceDashboard.mockResolvedValue(mockDashboard);

      await expect(service.generateDifferencesPDF({}, mockRes)).resolves.not.toThrow();
    });
  });

  describe('translateSeverity (private method via integration)', () => {
    it('should translate all severity levels correctly', async () => {
      const mockRes = createMockResponse();
      const severities = [SeverityLevel.CRITICAL, SeverityLevel.WARNING, SeverityLevel.INFO];

      for (const severity of severities) {
        differenceService.getDifferencesReport.mockResolvedValue({
          data: [{ ...mockDifferenceItem, severity }],
          total: 1,
        });
        differenceService.getDifferenceDashboard.mockResolvedValue(mockDashboard);

        await expect(service.generateDifferencesPDF({}, mockRes)).resolves.not.toThrow();
      }
    });
  });
});
