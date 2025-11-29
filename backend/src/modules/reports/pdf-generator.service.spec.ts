import { Test, TestingModule } from '@nestjs/testing';
import { PdfGeneratorService } from './pdf-generator.service';
import { Response } from 'express';

// Mock PDFDocument
const mockPdfDocument = {
  pipe: jest.fn().mockReturnThis(),
  end: jest.fn().mockReturnThis(),
  fontSize: jest.fn().mockReturnThis(),
  font: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  moveDown: jest.fn().mockReturnThis(),
  fillColor: jest.fn().mockReturnThis(),
  addPage: jest.fn().mockReturnThis(),
  switchToPage: jest.fn().mockReturnThis(),
  bufferedPageRange: jest.fn().mockReturnValue({ count: 1 }),
  y: 100,
  page: {
    height: 800,
  },
};

jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => mockPdfDocument);
});

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset mock y position for each test
    mockPdfDocument.y = 100;

    mockResponse = {
      setHeader: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfGeneratorService],
    }).compile();

    service = module.get<PdfGeneratorService>(PdfGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDashboardReport', () => {
    const mockDashboardData = {
      period: {
        from: '2025-01-01',
        to: '2025-01-31',
      },
      financial: {
        revenue: 1500000,
        expenses: 500000,
        collections: 1200000,
        net_profit: 1000000,
      },
      tasks: {
        total: 100,
        completed: 85,
        overdue: 5,
        completion_rate: 85.0,
      },
      incidents: {
        open: 3,
        critical: 1,
      },
      complaints: {
        new: 2,
      },
      machines: {
        active: 25,
        total: 30,
      },
    };

    it('should set correct Content-Type header', async () => {
      await service.generateDashboardReport(mockDashboardData, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });

    it('should set Content-Disposition header with date in filename', async () => {
      const today = new Date().toISOString().split('T')[0];

      await service.generateDashboardReport(mockDashboardData, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename=dashboard-report-${today}.pdf`,
      );
    });

    it('should pipe PDF document to response', async () => {
      await service.generateDashboardReport(mockDashboardData, mockResponse as Response);

      expect(mockPdfDocument.pipe).toHaveBeenCalledWith(mockResponse);
    });

    it('should call doc.end() to finalize PDF', async () => {
      await service.generateDashboardReport(mockDashboardData, mockResponse as Response);

      expect(mockPdfDocument.end).toHaveBeenCalled();
    });

    it('should render header with correct title', async () => {
      await service.generateDashboardReport(mockDashboardData, mockResponse as Response);

      expect(mockPdfDocument.fontSize).toHaveBeenCalledWith(20);
      expect(mockPdfDocument.font).toHaveBeenCalledWith('Helvetica-Bold');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('VendHub Manager - Dashboard Report', {
        align: 'center',
      });
    });

    it('should render period information with Russian locale dates', async () => {
      await service.generateDashboardReport(mockDashboardData, mockResponse as Response);

      const fromDate = new Date(mockDashboardData.period.from).toLocaleDateString('ru-RU');
      const toDate = new Date(mockDashboardData.period.to).toLocaleDateString('ru-RU');

      expect(mockPdfDocument.text).toHaveBeenCalledWith(`Period: ${fromDate} - ${toDate}`, {
        align: 'center',
      });
    });

    it('should render financial summary section', async () => {
      await service.generateDashboardReport(mockDashboardData, mockResponse as Response);

      // Check section title
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Financial Summary');

      // Check financial values are rendered (currency format may vary by locale)
      expect(mockPdfDocument.text).toHaveBeenCalledWith(expect.stringContaining('Revenue:'));
      expect(mockPdfDocument.text).toHaveBeenCalledWith(expect.stringContaining('Expenses:'));
      expect(mockPdfDocument.text).toHaveBeenCalledWith(expect.stringContaining('Collections:'));
      expect(mockPdfDocument.text).toHaveBeenCalledWith(expect.stringContaining('Net Profit:'), {
        underline: true,
      });
    });

    it('should render tasks overview section', async () => {
      await service.generateDashboardReport(mockDashboardData, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Tasks Overview');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Total Tasks: 100');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Completed: 85');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Overdue: 5');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Completion Rate: 85.0%');
    });

    it('should render incidents and complaints section', async () => {
      await service.generateDashboardReport(mockDashboardData, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Incidents & Complaints');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Open Incidents: 3');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Critical Incidents: 1');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('New Complaints: 2');
    });

    it('should render machines status section', async () => {
      await service.generateDashboardReport(mockDashboardData, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Machines Status');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Active Machines: 25');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Total Machines: 30');
    });

    it('should apply section styling with blue color', async () => {
      await service.generateDashboardReport(mockDashboardData, mockResponse as Response);

      expect(mockPdfDocument.fillColor).toHaveBeenCalledWith('#2196F3');
      expect(mockPdfDocument.fillColor).toHaveBeenCalledWith('black');
    });

    it('should handle undefined completion_rate gracefully', async () => {
      const dataWithUndefinedRate = {
        ...mockDashboardData,
        tasks: {
          ...mockDashboardData.tasks,
          completion_rate: undefined,
        },
      };

      await expect(
        service.generateDashboardReport(dataWithUndefinedRate, mockResponse as Response),
      ).resolves.not.toThrow();
    });
  });

  describe('generateMachineReport', () => {
    const mockMachine = {
      machine_number: 'M-001',
      model: 'Vendo 500',
      serial_number: 'SN123456',
      status: 'active',
      location: {
        name: 'Shopping Center A',
      },
    };

    const mockStats = {
      total_revenue: 2500000,
      total_collections: 2400000,
      total_expenses: 300000,
      net_profit: 2200000,
      tasks: {
        total: 50,
        completed: 45,
        pending: 3,
        overdue: 2,
      },
      incidents: {
        total: 10,
        open: 2,
        resolved: 8,
      },
    };

    it('should set correct Content-Type header', async () => {
      await service.generateMachineReport(mockMachine, mockStats, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });

    it('should set Content-Disposition header with machine number in filename', async () => {
      await service.generateMachineReport(mockMachine, mockStats, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=machine-M-001-report.pdf',
      );
    });

    it('should pipe PDF document to response', async () => {
      await service.generateMachineReport(mockMachine, mockStats, mockResponse as Response);

      expect(mockPdfDocument.pipe).toHaveBeenCalledWith(mockResponse);
    });

    it('should call doc.end() to finalize PDF', async () => {
      await service.generateMachineReport(mockMachine, mockStats, mockResponse as Response);

      expect(mockPdfDocument.end).toHaveBeenCalled();
    });

    it('should render header with machine number in title', async () => {
      await service.generateMachineReport(mockMachine, mockStats, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Machine Report - M-001', {
        align: 'center',
      });
    });

    it('should render machine information section', async () => {
      await service.generateMachineReport(mockMachine, mockStats, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Machine Information');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Machine Number: M-001');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Model: Vendo 500');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Serial Number: SN123456');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Status: active');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Location: Shopping Center A');
    });

    it('should render financial performance section', async () => {
      await service.generateMachineReport(mockMachine, mockStats, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Financial Performance');
      expect(mockPdfDocument.text).toHaveBeenCalledWith(expect.stringContaining('Total Revenue:'));
      expect(mockPdfDocument.text).toHaveBeenCalledWith(
        expect.stringContaining('Total Collections:'),
      );
      expect(mockPdfDocument.text).toHaveBeenCalledWith(expect.stringContaining('Total Expenses:'));
      expect(mockPdfDocument.text).toHaveBeenCalledWith(expect.stringContaining('Net Profit:'), {
        underline: true,
      });
    });

    it('should render tasks statistics section', async () => {
      await service.generateMachineReport(mockMachine, mockStats, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Tasks Statistics');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Total Tasks: 50');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Completed Tasks: 45');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Pending Tasks: 3');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Overdue Tasks: 2');
    });

    it('should render incidents section', async () => {
      await service.generateMachineReport(mockMachine, mockStats, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Incidents & Issues');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Total Incidents: 10');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Open Incidents: 2');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Resolved Incidents: 8');
    });

    it('should handle missing optional machine fields with N/A', async () => {
      const machineWithMissingFields = {
        machine_number: 'M-002',
        status: 'active',
        // model, serial_number, location are missing
      };

      await service.generateMachineReport(
        machineWithMissingFields,
        mockStats,
        mockResponse as Response,
      );

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Model: N/A');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Serial Number: N/A');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Location: N/A');
    });

    it('should handle machine without location', async () => {
      const machineWithoutLocation = {
        ...mockMachine,
        location: undefined,
      };

      await service.generateMachineReport(
        machineWithoutLocation,
        mockStats,
        mockResponse as Response,
      );

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Location: N/A');
    });
  });

  describe('generateSalesReport', () => {
    const mockSummary = {
      total_amount: 5000000,
      average_sale: 50000,
    };

    const createSalesData = (count: number) => {
      return Array.from({ length: count }, (_, i) => {
        // Use modular dates to avoid invalid dates (e.g., January 32)
        const day = (i % 28) + 1;
        const month = Math.floor(i / 28) + 1;
        return {
          sale_date: new Date(2025, month - 1, day).toISOString(),
          machine_number: `M-${String(i + 1).padStart(3, '0')}`,
          amount: 50000 + i * 1000,
          payment_method: i % 2 === 0 ? 'Cash' : 'Card',
        };
      });
    };

    it('should set correct Content-Type header', async () => {
      const sales = createSalesData(5);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });

    it('should set Content-Disposition header with date in filename', async () => {
      const sales = createSalesData(5);
      const today = new Date().toISOString().split('T')[0];

      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename=sales-report-${today}.pdf`,
      );
    });

    it('should pipe PDF document to response', async () => {
      const sales = createSalesData(5);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockPdfDocument.pipe).toHaveBeenCalledWith(mockResponse);
    });

    it('should call doc.end() to finalize PDF', async () => {
      const sales = createSalesData(5);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockPdfDocument.end).toHaveBeenCalled();
    });

    it('should render header with correct title', async () => {
      const sales = createSalesData(5);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Sales Report', { align: 'center' });
    });

    it('should render summary section with sales count', async () => {
      const sales = createSalesData(15);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Summary');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Total Sales: 15');
    });

    it('should render summary with formatted currency amounts', async () => {
      const sales = createSalesData(5);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith(expect.stringContaining('Total Amount:'));
      expect(mockPdfDocument.text).toHaveBeenCalledWith(expect.stringContaining('Average Sale:'));
    });

    it('should render table header with bold font', async () => {
      const sales = createSalesData(5);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockPdfDocument.font).toHaveBeenCalledWith('Helvetica-Bold');
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Date', 50, expect.any(Number), {
        width: 120,
      });
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Machine', 50 + 120, expect.any(Number), {
        width: 120,
      });
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Amount', 50 + 240, expect.any(Number), {
        width: 120,
      });
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Method', 50 + 360, expect.any(Number), {
        width: 120,
      });
    });

    it('should render sales table rows with Russian locale dates', async () => {
      const sales = createSalesData(5);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      // Check that dates are formatted in Russian locale
      const expectedDate = new Date(sales[0].sale_date).toLocaleDateString('ru-RU');
      expect(mockPdfDocument.text).toHaveBeenCalledWith(expectedDate, 50, expect.any(Number), {
        width: 120,
      });
    });

    it('should render machine numbers in table', async () => {
      const sales = createSalesData(5);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('M-001', 50 + 120, expect.any(Number), {
        width: 120,
      });
    });

    it('should render payment methods in table', async () => {
      const sales = createSalesData(5);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Cash', 50 + 360, expect.any(Number), {
        width: 120,
      });
      expect(mockPdfDocument.text).toHaveBeenCalledWith('Card', 50 + 360, expect.any(Number), {
        width: 120,
      });
    });

    it('should handle missing machine_number with N/A', async () => {
      const sales = [
        {
          sale_date: '2025-01-01',
          // machine_number is missing
          amount: 50000,
          payment_method: 'Cash',
        },
      ];

      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('N/A', 50 + 120, expect.any(Number), {
        width: 120,
      });
    });

    it('should handle missing payment_method with Cash default', async () => {
      const sales = [
        {
          sale_date: '2025-01-01',
          machine_number: 'M-001',
          amount: 50000,
          // payment_method is missing
        },
      ];

      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Cash', 50 + 360, expect.any(Number), {
        width: 120,
      });
    });

    it('should limit table to first 20 items', async () => {
      const sales = createSalesData(25);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      // Check that "and X more sales" message is shown
      expect(mockPdfDocument.text).toHaveBeenCalledWith('... and 5 more sales', {
        align: 'center',
      });
    });

    it('should not show pagination message for 20 or fewer items', async () => {
      const sales = createSalesData(20);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      // Check that "and X more sales" message is NOT shown
      const calls = mockPdfDocument.text.mock.calls;
      const hasMoreMessage = calls.some(
        (call) => typeof call[0] === 'string' && call[0].includes('more sales'),
      );
      expect(hasMoreMessage).toBe(false);
    });

    it('should render correct count for pagination message with varying data', async () => {
      const sales = createSalesData(35);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('... and 15 more sales', {
        align: 'center',
      });
    });

    it('should handle empty sales array', async () => {
      const sales: any[] = [];
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith('Total Sales: 0');
      expect(mockPdfDocument.end).toHaveBeenCalled();
    });

    it('should use font size 8 for table data', async () => {
      const sales = createSalesData(5);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      expect(mockPdfDocument.fontSize).toHaveBeenCalledWith(8);
    });

    it('should switch to regular font for table data after header', async () => {
      const sales = createSalesData(5);
      await service.generateSalesReport(sales, mockSummary, mockResponse as Response);

      // Font changes: bold for headers, then regular for data
      const fontCalls = mockPdfDocument.font.mock.calls;
      expect(fontCalls).toContainEqual(['Helvetica-Bold']);
      expect(fontCalls).toContainEqual(['Helvetica']);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency in UZS with Uzbek locale', async () => {
      // Testing through generateDashboardReport as formatCurrency is private
      const mockData = {
        period: { from: '2025-01-01', to: '2025-01-31' },
        financial: {
          revenue: 1500000,
          expenses: 500000,
          collections: 1200000,
          net_profit: 1000000,
        },
        tasks: { total: 10, completed: 8, overdue: 1, completion_rate: 80 },
        incidents: { open: 0, critical: 0 },
        complaints: { new: 0 },
        machines: { active: 5, total: 5 },
      };

      await service.generateDashboardReport(mockData, mockResponse as Response);

      // Verify that currency values are formatted (the exact format depends on locale)
      // The service uses Intl.NumberFormat('ru-UZ', { style: 'currency', currency: 'UZS' })
      expect(mockPdfDocument.text).toHaveBeenCalledWith(expect.stringContaining('Revenue:'));
    });

    it('should handle zero values in currency formatting', async () => {
      const mockData = {
        period: { from: '2025-01-01', to: '2025-01-31' },
        financial: {
          revenue: 0,
          expenses: 0,
          collections: 0,
          net_profit: 0,
        },
        tasks: { total: 0, completed: 0, overdue: 0, completion_rate: 0 },
        incidents: { open: 0, critical: 0 },
        complaints: { new: 0 },
        machines: { active: 0, total: 0 },
      };

      await expect(
        service.generateDashboardReport(mockData, mockResponse as Response),
      ).resolves.not.toThrow();

      expect(mockPdfDocument.end).toHaveBeenCalled();
    });

    it('should handle negative values in currency formatting', async () => {
      const mockData = {
        period: { from: '2025-01-01', to: '2025-01-31' },
        financial: {
          revenue: 500000,
          expenses: 800000,
          collections: 400000,
          net_profit: -300000,
        },
        tasks: { total: 10, completed: 8, overdue: 1, completion_rate: 80 },
        incidents: { open: 0, critical: 0 },
        complaints: { new: 0 },
        machines: { active: 5, total: 5 },
      };

      await expect(
        service.generateDashboardReport(mockData, mockResponse as Response),
      ).resolves.not.toThrow();

      expect(mockPdfDocument.end).toHaveBeenCalled();
    });
  });

  describe('PDF structure and styling', () => {
    it('should create PDF document with correct margin', async () => {
      const PDFDocument = require('pdfkit');
      const mockData = {
        period: { from: '2025-01-01', to: '2025-01-31' },
        financial: { revenue: 1000, expenses: 500, collections: 800, net_profit: 500 },
        tasks: { total: 10, completed: 8, overdue: 1, completion_rate: 80 },
        incidents: { open: 0, critical: 0 },
        complaints: { new: 0 },
        machines: { active: 5, total: 5 },
      };

      await service.generateDashboardReport(mockData, mockResponse as Response);

      expect(PDFDocument).toHaveBeenCalledWith({ margin: 50 });
    });

    it('should add generation timestamp with Russian locale', async () => {
      const mockData = {
        period: { from: '2025-01-01', to: '2025-01-31' },
        financial: { revenue: 1000, expenses: 500, collections: 800, net_profit: 500 },
        tasks: { total: 10, completed: 8, overdue: 1, completion_rate: 80 },
        incidents: { open: 0, critical: 0 },
        complaints: { new: 0 },
        machines: { active: 5, total: 5 },
      };

      await service.generateDashboardReport(mockData, mockResponse as Response);

      expect(mockPdfDocument.text).toHaveBeenCalledWith(expect.stringContaining('Generated:'), {
        align: 'center',
      });
    });

    it('should add footer with page numbers', async () => {
      mockPdfDocument.bufferedPageRange.mockReturnValue({ count: 2 });

      const mockData = {
        period: { from: '2025-01-01', to: '2025-01-31' },
        financial: { revenue: 1000, expenses: 500, collections: 800, net_profit: 500 },
        tasks: { total: 10, completed: 8, overdue: 1, completion_rate: 80 },
        incidents: { open: 0, critical: 0 },
        complaints: { new: 0 },
        machines: { active: 5, total: 5 },
      };

      await service.generateDashboardReport(mockData, mockResponse as Response);

      expect(mockPdfDocument.switchToPage).toHaveBeenCalledWith(0);
      expect(mockPdfDocument.switchToPage).toHaveBeenCalledWith(1);
      expect(mockPdfDocument.text).toHaveBeenCalledWith(
        'VendHub Manager | Page 1 of 2',
        50,
        expect.any(Number),
        { align: 'center' },
      );
      expect(mockPdfDocument.text).toHaveBeenCalledWith(
        'VendHub Manager | Page 2 of 2',
        50,
        expect.any(Number),
        { align: 'center' },
      );
    });

    it('should use fontSize 8 for footer text', async () => {
      const mockData = {
        period: { from: '2025-01-01', to: '2025-01-31' },
        financial: { revenue: 1000, expenses: 500, collections: 800, net_profit: 500 },
        tasks: { total: 10, completed: 8, overdue: 1, completion_rate: 80 },
        incidents: { open: 0, critical: 0 },
        complaints: { new: 0 },
        machines: { active: 5, total: 5 },
      };

      await service.generateDashboardReport(mockData, mockResponse as Response);

      // Footer uses fontSize(8)
      expect(mockPdfDocument.fontSize).toHaveBeenCalledWith(8);
    });

    it('should use fontSize 14 for section titles', async () => {
      const mockData = {
        period: { from: '2025-01-01', to: '2025-01-31' },
        financial: { revenue: 1000, expenses: 500, collections: 800, net_profit: 500 },
        tasks: { total: 10, completed: 8, overdue: 1, completion_rate: 80 },
        incidents: { open: 0, critical: 0 },
        complaints: { new: 0 },
        machines: { active: 5, total: 5 },
      };

      await service.generateDashboardReport(mockData, mockResponse as Response);

      expect(mockPdfDocument.fontSize).toHaveBeenCalledWith(14);
    });

    it('should use fontSize 10 for content text', async () => {
      const mockData = {
        period: { from: '2025-01-01', to: '2025-01-31' },
        financial: { revenue: 1000, expenses: 500, collections: 800, net_profit: 500 },
        tasks: { total: 10, completed: 8, overdue: 1, completion_rate: 80 },
        incidents: { open: 0, critical: 0 },
        complaints: { new: 0 },
        machines: { active: 5, total: 5 },
      };

      await service.generateDashboardReport(mockData, mockResponse as Response);

      expect(mockPdfDocument.fontSize).toHaveBeenCalledWith(10);
    });
  });

  describe('error handling', () => {
    it('should handle undefined period dates', async () => {
      // Testing edge case with invalid data - using type assertion
      const mockData = {
        period: { from: undefined, to: undefined },
        financial: { revenue: 1000, expenses: 500, collections: 800, net_profit: 500 },
        tasks: { total: 10, completed: 8, overdue: 1, completion_rate: 80 },
        incidents: { open: 0, critical: 0 },
        complaints: { new: 0 },
        machines: { active: 5, total: 5 },
      } as unknown as Parameters<typeof service.generateDashboardReport>[0];

      // This might throw or produce invalid date string
      // The service should ideally handle this gracefully
      await expect(
        service.generateDashboardReport(mockData, mockResponse as Response),
      ).resolves.not.toThrow();
    });

    it('should handle undefined financial values', async () => {
      // Testing edge case with invalid data - using type assertion
      const mockData = {
        period: { from: '2025-01-01', to: '2025-01-31' },
        financial: {
          revenue: undefined,
          expenses: undefined,
          collections: undefined,
          net_profit: undefined,
        },
        tasks: { total: 10, completed: 8, overdue: 1, completion_rate: 80 },
        incidents: { open: 0, critical: 0 },
        complaints: { new: 0 },
        machines: { active: 5, total: 5 },
      } as unknown as Parameters<typeof service.generateDashboardReport>[0];

      // The service uses Intl.NumberFormat which handles undefined
      await expect(
        service.generateDashboardReport(mockData, mockResponse as Response),
      ).resolves.not.toThrow();
    });
  });
});
