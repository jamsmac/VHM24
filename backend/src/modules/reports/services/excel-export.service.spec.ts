import { Test, TestingModule } from '@nestjs/testing';
import { ExcelExportService } from './excel-export.service';
import { NetworkSummaryReport } from './network-summary.service';
import { ProfitLossReport } from './profit-loss.service';
import { CashFlowReport } from './cash-flow.service';
import { MachinePerformanceReport } from './machine-performance.service';
import { LocationPerformanceReport } from './location-performance.service';
import { ProductSalesReport, AllProductsSalesReport } from './product-sales.service';
import { CollectionsSummaryReport } from './collections-summary.service';

// Mock ExcelJS Workbook and Worksheet
const mockWorksheet = {
  addRows: jest.fn(),
  getColumn: jest.fn().mockReturnValue({ width: 0 }),
  getRow: jest.fn().mockReturnValue({ font: {} }),
};

const mockWorkbook = {
  addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
  xlsx: {
    writeBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
  },
};

jest.mock('exceljs', () => ({
  Workbook: jest.fn().mockImplementation(() => mockWorkbook),
}));

describe('ExcelExportService', () => {
  let service: ExcelExportService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ExcelExportService],
    }).compile();

    service = module.get<ExcelExportService>(ExcelExportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create mock dates
  const createMockDate = (dateStr: string): Date => {
    const date = new Date(dateStr);
    // Mock toLocaleDateString to return consistent Russian formatted date
    date.toLocaleDateString = jest
      .fn()
      .mockReturnValue(dateStr.split('T')[0].split('-').reverse().join('.'));
    return date;
  };

  describe('exportNetworkSummary', () => {
    const createMockNetworkSummaryReport = (): NetworkSummaryReport => ({
      period: {
        start_date: createMockDate('2025-01-01'),
        end_date: createMockDate('2025-01-31'),
      },
      machines: {
        total: 50,
        active: 45,
        offline: 3,
        disabled: 2,
        low_stock: 5,
      },
      financial: {
        total_revenue: 1500000.5,
        total_sales_count: 1200,
        total_expenses: 500000.25,
        total_collections: 1200000,
        net_profit: 1000000.25,
        average_revenue_per_machine: 30000.01,
      },
      tasks: {
        total: 100,
        completed: 85,
        pending: 10,
        in_progress: 3,
        overdue: 2,
        completion_rate: 85.5,
      },
      incidents: {
        total: 15,
        open: 3,
        resolved: 12,
        average_resolution_time_hours: 4.5,
      },
      top_machines: [
        {
          machine_number: 'M-001',
          location_name: 'Shopping Center A',
          total_revenue: 150000,
          sales_count: 120,
        },
        {
          machine_number: 'M-002',
          location_name: 'Office Building B',
          total_revenue: 120000,
          sales_count: 100,
        },
      ],
      generated_at: createMockDate('2025-01-15'),
    });

    it('should create workbook with two worksheets', async () => {
      const report = createMockNetworkSummaryReport();

      await service.exportNetworkSummary(report);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(2);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Сводка');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Топ аппараты');
    });

    it('should return a Buffer', async () => {
      const report = createMockNetworkSummaryReport();

      const result = await service.exportNetworkSummary(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should add summary data rows to the worksheet', async () => {
      const report = createMockNetworkSummaryReport();

      await service.exportNetworkSummary(report);

      // First call is for summary sheet
      expect(mockWorksheet.addRows).toHaveBeenCalled();
      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      // Verify header row
      expect(summaryCallArg[0]).toEqual(['ОТЧЕТ ПО СЕТИ']);

      // Verify machines section is present
      const machinesHeaderIndex = summaryCallArg.findIndex((row: any[]) => row[0] === 'АППАРАТЫ');
      expect(machinesHeaderIndex).toBeGreaterThan(-1);
    });

    it('should format financial values with two decimal places', async () => {
      const report = createMockNetworkSummaryReport();

      await service.exportNetworkSummary(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      // Find and verify formatted financial values
      const revenueRow = summaryCallArg.find((row: any[]) => row[0] === 'Общая выручка:');
      expect(revenueRow).toBeDefined();
      expect(revenueRow[1]).toBe('1500000.50');
    });

    it('should include top machines data in second worksheet', async () => {
      const report = createMockNetworkSummaryReport();

      await service.exportNetworkSummary(report);

      // Second call is for top machines sheet
      expect(mockWorksheet.addRows.mock.calls.length).toBe(2);
      const topMachinesCallArg = mockWorksheet.addRows.mock.calls[1][0];

      // Verify header
      expect(topMachinesCallArg[0]).toEqual(['ТОП АППАРАТОВ']);

      // Verify column headers
      const headerRow = topMachinesCallArg[2];
      expect(headerRow).toEqual(['Номер аппарата', 'Локация', 'Выручка (UZS)', 'Продаж (шт)']);
    });

    it('should include all top machine entries', async () => {
      const report = createMockNetworkSummaryReport();

      await service.exportNetworkSummary(report);

      const topMachinesCallArg = mockWorksheet.addRows.mock.calls[1][0];

      // Should have: header, empty row, column headers, and 2 machine rows
      expect(topMachinesCallArg.length).toBe(5);

      // Verify first machine data
      expect(topMachinesCallArg[3][0]).toBe('M-001');
      expect(topMachinesCallArg[3][1]).toBe('Shopping Center A');
    });

    it('should call xlsx.writeBuffer to generate the file', async () => {
      const report = createMockNetworkSummaryReport();

      await service.exportNetworkSummary(report);

      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalledTimes(1);
    });

    it('should handle empty top_machines array', async () => {
      const report = createMockNetworkSummaryReport();
      report.top_machines = [];

      const result = await service.exportNetworkSummary(report);

      expect(result).toBeInstanceOf(Buffer);
      const topMachinesCallArg = mockWorksheet.addRows.mock.calls[1][0];
      // Should only have header rows, no data rows
      expect(topMachinesCallArg.length).toBe(3);
    });

    it('should format completion rate with percentage symbol', async () => {
      const report = createMockNetworkSummaryReport();

      await service.exportNetworkSummary(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];
      const completionRateRow = summaryCallArg.find((row: any[]) => row[0] === '% выполнения:');
      expect(completionRateRow[1]).toBe('85.50%');
    });

    it('should include period dates formatted in Russian locale', async () => {
      const report = createMockNetworkSummaryReport();

      await service.exportNetworkSummary(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];
      const periodRow = summaryCallArg.find((row: any[]) => row[0] === 'Период:');
      expect(periodRow).toBeDefined();
      // Period row should have start date, dash, end date
      expect(periodRow[2]).toBe('-');
    });

    it('should include incidents section with average resolution time', async () => {
      const report = createMockNetworkSummaryReport();

      await service.exportNetworkSummary(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const incidentsSectionIndex = summaryCallArg.findIndex(
        (row: any[]) => row[0] === 'ИНЦИДЕНТЫ',
      );
      expect(incidentsSectionIndex).toBeGreaterThan(-1);

      const avgResolutionRow = summaryCallArg.find(
        (row: any[]) => row[0] === 'Ср. время решения (часы):',
      );
      expect(avgResolutionRow[1]).toBe('4.50');
    });
  });

  describe('exportProfitLoss', () => {
    const createMockProfitLossReport = (): ProfitLossReport => ({
      period: {
        start_date: createMockDate('2025-01-01'),
        end_date: createMockDate('2025-01-31'),
      },
      revenue: {
        sales: 2000000,
        other_income: 50000,
        total_revenue: 2050000,
      },
      expenses: {
        rent: 200000,
        purchase: 800000,
        repair: 50000,
        salary: 300000,
        utilities: 30000,
        depreciation: 20000,
        writeoff: 10000,
        other: 40000,
        total_expenses: 1450000,
      },
      profit: {
        gross_profit: 1200000,
        operating_profit: 600000,
        net_profit: 600000,
        profit_margin_percent: 29.27,
      },
      generated_at: createMockDate('2025-01-15'),
    });

    it('should create workbook with P&L worksheet', async () => {
      const report = createMockProfitLossReport();

      await service.exportProfitLoss(report);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(1);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('P&L');
    });

    it('should return a Buffer', async () => {
      const report = createMockProfitLossReport();

      const result = await service.exportProfitLoss(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include report header', async () => {
      const report = createMockProfitLossReport();

      await service.exportProfitLoss(report);

      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];
      expect(dataCallArg[0]).toEqual(['ОТЧЕТ О ПРИБЫЛЯХ И УБЫТКАХ (P&L)']);
    });

    it('should include revenue section with formatted values', async () => {
      const report = createMockProfitLossReport();

      await service.exportProfitLoss(report);

      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];

      // Find revenue section
      const revenueSectionIndex = dataCallArg.findIndex((row: any[]) => row[0] === 'ВЫРУЧКА (UZS)');
      expect(revenueSectionIndex).toBeGreaterThan(-1);

      // Verify sales row
      const salesRow = dataCallArg[revenueSectionIndex + 1];
      expect(salesRow[0]).toBe('Продажи:');
      expect(salesRow[1]).toBe('2000000.00');
    });

    it('should include expenses section with all categories', async () => {
      const report = createMockProfitLossReport();

      await service.exportProfitLoss(report);

      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];

      // Find expenses section
      const expensesSectionIndex = dataCallArg.findIndex(
        (row: any[]) => row[0] === 'РАСХОДЫ (UZS)',
      );
      expect(expensesSectionIndex).toBeGreaterThan(-1);

      // Verify all expense categories are present
      const rowLabels = dataCallArg.map((row: any[]) => row[0]);
      expect(rowLabels).toContain('Аренда:');
      expect(rowLabels).toContain('Закупка товара:');
      expect(rowLabels).toContain('Ремонт:');
      expect(rowLabels).toContain('Зарплата:');
      expect(rowLabels).toContain('Коммунальные услуги:');
      expect(rowLabels).toContain('Амортизация:');
      expect(rowLabels).toContain('Списание:');
      expect(rowLabels).toContain('Прочее:');
    });

    it('should include profit section with margin percentage', async () => {
      const report = createMockProfitLossReport();

      await service.exportProfitLoss(report);

      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];

      // Find profit section
      const profitSectionIndex = dataCallArg.findIndex((row: any[]) => row[0] === 'ПРИБЫЛЬ (UZS)');
      expect(profitSectionIndex).toBeGreaterThan(-1);

      // Verify margin percentage
      const marginRow = dataCallArg.find((row: any[]) => row[0] === 'Маржа прибыли (%):');
      expect(marginRow[1]).toBe('29.27%');
    });

    it('should handle zero values correctly', async () => {
      const report = createMockProfitLossReport();
      report.revenue.sales = 0;
      report.revenue.other_income = 0;
      report.revenue.total_revenue = 0;

      const result = await service.exportProfitLoss(report);

      expect(result).toBeInstanceOf(Buffer);
      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];
      const salesRow = dataCallArg.find((row: any[]) => row[0] === 'Продажи:');
      expect(salesRow[1]).toBe('0.00');
    });

    it('should include all profit types', async () => {
      const report = createMockProfitLossReport();

      await service.exportProfitLoss(report);

      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const rowLabels = dataCallArg.map((row: any[]) => row[0]);
      expect(rowLabels).toContain('Валовая прибыль:');
      expect(rowLabels).toContain('Операционная прибыль:');
      expect(rowLabels).toContain('Чистая прибыль:');
    });
  });

  describe('exportCashFlow', () => {
    const createMockCashFlowReport = (): CashFlowReport => ({
      period: {
        start_date: createMockDate('2025-01-01'),
        end_date: createMockDate('2025-01-31'),
      },
      cash_inflows: {
        cash_sales: 500000,
        card_sales: 600000,
        mobile_sales: 200000,
        qr_sales: 100000,
        collections: 1200000,
        total_inflows: 2600000,
      },
      cash_outflows: {
        expenses: 400000,
        refunds: 20000,
        total_outflows: 420000,
      },
      net_cash_flow: 2180000,
      cash_position: {
        opening_balance: 500000,
        closing_balance: 2680000,
      },
      payment_breakdown: [
        { payment_method: 'Cash', amount: 500000, transaction_count: 250, percentage: 35.71 },
        { payment_method: 'Card', amount: 600000, transaction_count: 300, percentage: 42.86 },
        { payment_method: 'Mobile', amount: 200000, transaction_count: 100, percentage: 14.29 },
        { payment_method: 'QR', amount: 100000, transaction_count: 50, percentage: 7.14 },
      ],
      generated_at: createMockDate('2025-01-15'),
    });

    it('should create workbook with Cash Flow worksheet', async () => {
      const report = createMockCashFlowReport();

      await service.exportCashFlow(report);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(1);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Cash Flow');
    });

    it('should return a Buffer', async () => {
      const report = createMockCashFlowReport();

      const result = await service.exportCashFlow(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include cash inflows section', async () => {
      const report = createMockCashFlowReport();

      await service.exportCashFlow(report);

      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];

      // Find cash inflows section
      const inflowsSectionIndex = dataCallArg.findIndex(
        (row: any[]) => row[0] === 'ДЕНЕЖНЫЕ ПОСТУПЛЕНИЯ (UZS)',
      );
      expect(inflowsSectionIndex).toBeGreaterThan(-1);

      // Verify all inflow types
      const rowLabels = dataCallArg.map((row: any[]) => row[0]);
      expect(rowLabels).toContain('Продажи (наличные):');
      expect(rowLabels).toContain('Продажи (карта):');
      expect(rowLabels).toContain('Продажи (мобильные):');
      expect(rowLabels).toContain('Продажи (QR):');
      expect(rowLabels).toContain('Инкассации:');
    });

    it('should include cash outflows section', async () => {
      const report = createMockCashFlowReport();

      await service.exportCashFlow(report);

      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const outflowsSectionIndex = dataCallArg.findIndex(
        (row: any[]) => row[0] === 'ДЕНЕЖНЫЕ РАСХОДЫ (UZS)',
      );
      expect(outflowsSectionIndex).toBeGreaterThan(-1);
    });

    it('should include payment breakdown with percentages', async () => {
      const report = createMockCashFlowReport();

      await service.exportCashFlow(report);

      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];

      // Find payment breakdown section
      const breakdownSectionIndex = dataCallArg.findIndex(
        (row: any[]) => row[0] === 'РАСПРЕДЕЛЕНИЕ ПО МЕТОДАМ ОПЛАТЫ',
      );
      expect(breakdownSectionIndex).toBeGreaterThan(-1);

      // Verify column headers
      const headerRow = dataCallArg[breakdownSectionIndex + 1];
      expect(headerRow).toEqual(['Метод оплаты', 'Сумма (UZS)', 'Кол-во', 'Доля (%)']);

      // Verify first payment method data
      const cashRow = dataCallArg[breakdownSectionIndex + 2];
      expect(cashRow[0]).toBe('Cash');
      expect(cashRow[3]).toBe('35.71%');
    });

    it('should handle empty payment_breakdown array', async () => {
      const report = createMockCashFlowReport();
      report.payment_breakdown = [];

      const result = await service.exportCashFlow(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should format net cash flow correctly', async () => {
      const report = createMockCashFlowReport();

      await service.exportCashFlow(report);

      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];
      const netFlowRow = dataCallArg.find((row: any[]) => row[0] === 'Чистый поток:');
      expect(netFlowRow[1]).toBe('2180000.00');
    });

    it('should include cash position section', async () => {
      const report = createMockCashFlowReport();

      await service.exportCashFlow(report);

      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const rowLabels = dataCallArg.map((row: any[]) => row[0]);
      expect(rowLabels).toContain('Начальный остаток:');
      expect(rowLabels).toContain('Конечный остаток:');
    });
  });

  describe('exportMachinePerformance', () => {
    const createMockMachinePerformanceReport = (): MachinePerformanceReport => ({
      machine: {
        id: 'machine-uuid-1',
        machine_number: 'M-001',
        name: 'Coffee Machine 1',
        location_name: 'Shopping Center A',
        location_address: '123 Main St',
        status: 'active',
        installed_at: createMockDate('2024-01-01'),
      },
      period: {
        start_date: createMockDate('2025-01-01'),
        end_date: createMockDate('2025-01-31'),
      },
      sales: {
        total_revenue: 500000,
        total_transactions: 400,
        average_transaction: 1250,
        payment_breakdown: [
          { payment_method: 'Cash', amount: 200000, transaction_count: 160, percentage: 40 },
          { payment_method: 'Card', amount: 300000, transaction_count: 240, percentage: 60 },
        ],
        top_products: [
          { product_name: 'Espresso', quantity_sold: 150, revenue: 150000 },
          { product_name: 'Cappuccino', quantity_sold: 100, revenue: 200000 },
        ],
      },
      tasks: {
        total: 30,
        refills: 20,
        collections: 8,
        maintenance: 1,
        repairs: 1,
        completion_rate: 96.67,
        average_completion_time_hours: 2.5,
      },
      incidents: {
        total: 5,
        by_type: [
          { type: 'mechanical', count: 2 },
          { type: 'electrical', count: 3 },
        ],
        resolved: 4,
        average_resolution_time_hours: 6.5,
      },
      expenses: {
        total: 50000,
        by_category: [
          { category: 'repair', amount: 30000, percentage: 60 },
          { category: 'maintenance', amount: 20000, percentage: 40 },
        ],
      },
      profitability: {
        revenue: 500000,
        expenses: 50000,
        net_profit: 450000,
        profit_margin: 90,
        roi: 150,
      },
      uptime: {
        total_days: 31,
        active_days: 29,
        offline_days: 2,
        uptime_percentage: 93.55,
      },
      generated_at: createMockDate('2025-01-15'),
    });

    it('should create workbook with three worksheets', async () => {
      const report = createMockMachinePerformanceReport();

      await service.exportMachinePerformance(report);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(3);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Сводка');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Методы оплаты');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Топ продукты');
    });

    it('should return a Buffer', async () => {
      const report = createMockMachinePerformanceReport();

      const result = await service.exportMachinePerformance(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include machine info in summary sheet', async () => {
      const report = createMockMachinePerformanceReport();

      await service.exportMachinePerformance(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      // Verify machine info
      const rowLabels = summaryCallArg.map((row: any[]) => row[0]);
      expect(rowLabels).toContain('Номер аппарата:');
      expect(rowLabels).toContain('Название:');
      expect(rowLabels).toContain('Локация:');
      expect(rowLabels).toContain('Статус:');
    });

    it('should include sales section with formatted values', async () => {
      const report = createMockMachinePerformanceReport();

      await service.exportMachinePerformance(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const salesSectionIndex = summaryCallArg.findIndex(
        (row: any[]) => row[0] === 'ПРОДАЖИ (UZS)',
      );
      expect(salesSectionIndex).toBeGreaterThan(-1);

      const revenueRow = summaryCallArg[salesSectionIndex + 1];
      expect(revenueRow[0]).toBe('Общая выручка:');
      expect(revenueRow[1]).toBe('500000.00');
    });

    it('should include tasks section with completion rate', async () => {
      const report = createMockMachinePerformanceReport();

      await service.exportMachinePerformance(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const tasksSectionIndex = summaryCallArg.findIndex((row: any[]) => row[0] === 'ЗАДАЧИ');
      expect(tasksSectionIndex).toBeGreaterThan(-1);

      const completionRateRow = summaryCallArg.find((row: any[]) => row[0] === '% выполнения:');
      expect(completionRateRow[1]).toBe('96.67%');
    });

    it('should include profitability section with ROI', async () => {
      const report = createMockMachinePerformanceReport();

      await service.exportMachinePerformance(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const profitabilitySectionIndex = summaryCallArg.findIndex(
        (row: any[]) => row[0] === 'РЕНТАБЕЛЬНОСТЬ (UZS)',
      );
      expect(profitabilitySectionIndex).toBeGreaterThan(-1);

      const roiRow = summaryCallArg.find((row: any[]) => row[0] === 'ROI (%):');
      expect(roiRow[1]).toBe('150.00%');
    });

    it('should include uptime section', async () => {
      const report = createMockMachinePerformanceReport();

      await service.exportMachinePerformance(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const uptimeSectionIndex = summaryCallArg.findIndex(
        (row: any[]) => row[0] === 'ВРЕМЯ РАБОТЫ',
      );
      expect(uptimeSectionIndex).toBeGreaterThan(-1);

      const uptimePercentageRow = summaryCallArg.find((row: any[]) => row[0] === 'Uptime (%):');
      expect(uptimePercentageRow[1]).toBe('93.55%');
    });

    it('should include payment methods worksheet with data', async () => {
      const report = createMockMachinePerformanceReport();

      await service.exportMachinePerformance(report);

      const paymentCallArg = mockWorksheet.addRows.mock.calls[1][0];

      // Verify header
      expect(paymentCallArg[0]).toEqual(['РАСПРЕДЕЛЕНИЕ ПО МЕТОДАМ ОПЛАТЫ']);

      // Verify column headers
      const headerRow = paymentCallArg[2];
      expect(headerRow).toEqual(['Метод оплаты', 'Сумма (UZS)', 'Транзакций', 'Доля (%)']);
    });

    it('should include top products worksheet with data', async () => {
      const report = createMockMachinePerformanceReport();

      await service.exportMachinePerformance(report);

      const productsCallArg = mockWorksheet.addRows.mock.calls[2][0];

      // Verify header
      expect(productsCallArg[0]).toEqual(['ТОП ПРОДУКТОВ']);

      // Verify column headers
      const headerRow = productsCallArg[2];
      expect(headerRow).toEqual(['Наименование', 'Продано (шт)', 'Выручка (UZS)']);

      // Verify first product
      const firstProductRow = productsCallArg[3];
      expect(firstProductRow[0]).toBe('Espresso');
      expect(firstProductRow[1]).toBe(150);
    });

    it('should handle empty payment_breakdown', async () => {
      const report = createMockMachinePerformanceReport();
      report.sales.payment_breakdown = [];

      const result = await service.exportMachinePerformance(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle empty top_products', async () => {
      const report = createMockMachinePerformanceReport();
      report.sales.top_products = [];

      const result = await service.exportMachinePerformance(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include all task types', async () => {
      const report = createMockMachinePerformanceReport();

      await service.exportMachinePerformance(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const rowLabels = summaryCallArg.map((row: any[]) => row[0]);
      expect(rowLabels).toContain('Пополнения:');
      expect(rowLabels).toContain('Инкассации:');
      expect(rowLabels).toContain('Обслуживание:');
      expect(rowLabels).toContain('Ремонт:');
    });
  });

  describe('exportLocationPerformance', () => {
    const createMockLocationPerformanceReport = (): LocationPerformanceReport => ({
      location: {
        id: 'location-uuid-1',
        name: 'Shopping Center A',
        address: '123 Main St',
        type: 'shopping_center',
        owner_name: 'John Doe',
      },
      period: {
        start_date: createMockDate('2025-01-01'),
        end_date: createMockDate('2025-01-31'),
      },
      machines: {
        total: 5,
        active: 4,
        offline: 1,
        performance: [
          {
            machine_number: 'M-001',
            machine_name: 'Coffee 1',
            revenue: 200000,
            transactions: 160,
            status: 'active',
          },
          {
            machine_number: 'M-002',
            machine_name: 'Snack 1',
            revenue: 150000,
            transactions: 120,
            status: 'active',
          },
        ],
      },
      financial: {
        total_revenue: 350000,
        total_expenses: 50000,
        owner_commission: 35000,
        net_profit: 265000,
        profit_margin: 75.71,
        average_revenue_per_machine: 70000,
      },
      top_performers: [
        { machine_number: 'M-001', revenue: 200000, contribution_percentage: 57.14 },
        { machine_number: 'M-002', revenue: 150000, contribution_percentage: 42.86 },
      ],
      generated_at: createMockDate('2025-01-15'),
    });

    it('should create workbook with three worksheets', async () => {
      const report = createMockLocationPerformanceReport();

      await service.exportLocationPerformance(report);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(3);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Сводка');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Аппараты');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Топ аппараты');
    });

    it('should return a Buffer', async () => {
      const report = createMockLocationPerformanceReport();

      const result = await service.exportLocationPerformance(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include location info in summary sheet', async () => {
      const report = createMockLocationPerformanceReport();

      await service.exportLocationPerformance(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      // Verify location info
      const nameRow = summaryCallArg.find((row: any[]) => row[0] === 'Название:');
      expect(nameRow[1]).toBe('Shopping Center A');

      const addressRow = summaryCallArg.find((row: any[]) => row[0] === 'Адрес:');
      expect(addressRow[1]).toBe('123 Main St');
    });

    it('should include machines summary', async () => {
      const report = createMockLocationPerformanceReport();

      await service.exportLocationPerformance(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const machinesSectionIndex = summaryCallArg.findIndex((row: any[]) => row[0] === 'АППАРАТЫ');
      expect(machinesSectionIndex).toBeGreaterThan(-1);

      const totalRow = summaryCallArg[machinesSectionIndex + 1];
      expect(totalRow[0]).toBe('Всего:');
      expect(totalRow[1]).toBe(5);
    });

    it('should include financial section with owner commission', async () => {
      const report = createMockLocationPerformanceReport();

      await service.exportLocationPerformance(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const commissionRow = summaryCallArg.find((row: any[]) => row[0] === 'Комиссия владельца:');
      expect(commissionRow[1]).toBe('35000.00');
    });

    it('should include machines performance worksheet', async () => {
      const report = createMockLocationPerformanceReport();

      await service.exportLocationPerformance(report);

      const machinesCallArg = mockWorksheet.addRows.mock.calls[1][0];

      // Verify header
      expect(machinesCallArg[0]).toEqual(['ПРОИЗВОДИТЕЛЬНОСТЬ АППАРАТОВ']);

      // Verify column headers
      const headerRow = machinesCallArg[2];
      expect(headerRow).toEqual(['Номер', 'Название', 'Выручка (UZS)', 'Транзакций', 'Статус']);
    });

    it('should include top performers worksheet', async () => {
      const report = createMockLocationPerformanceReport();

      await service.exportLocationPerformance(report);

      const topCallArg = mockWorksheet.addRows.mock.calls[2][0];

      // Verify header
      expect(topCallArg[0]).toEqual(['ТОП АППАРАТОВ']);

      // Verify first top performer
      const firstTopRow = topCallArg[3];
      expect(firstTopRow[0]).toBe('M-001');
      expect(firstTopRow[2]).toBe('57.14%');
    });

    it('should handle empty machines performance array', async () => {
      const report = createMockLocationPerformanceReport();
      report.machines.performance = [];

      const result = await service.exportLocationPerformance(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include location type and owner', async () => {
      const report = createMockLocationPerformanceReport();

      await service.exportLocationPerformance(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const typeRow = summaryCallArg.find((row: any[]) => row[0] === 'Тип:');
      expect(typeRow[1]).toBe('shopping_center');

      const ownerRow = summaryCallArg.find((row: any[]) => row[0] === 'Владелец:');
      expect(ownerRow[1]).toBe('John Doe');
    });
  });

  describe('exportProductSales', () => {
    const createMockProductSalesReport = (): ProductSalesReport => ({
      product: {
        id: 'product-uuid-1',
        name: 'Espresso',
        category: 'coffee',
        type: 'drink',
        sale_price: 15000,
        purchase_price: 5000,
      },
      period: {
        start_date: createMockDate('2025-01-01'),
        end_date: createMockDate('2025-01-31'),
      },
      sales: {
        total_quantity: 500,
        total_revenue: 7500000,
        total_cost: 2500000,
        gross_profit: 5000000,
        profit_margin: 66.67,
        average_price: 15000,
      },
      by_machine: [
        {
          machine_number: 'M-001',
          machine_name: 'Coffee 1',
          location_name: 'Mall A',
          quantity: 200,
          revenue: 3000000,
          contribution_percentage: 40,
        },
        {
          machine_number: 'M-002',
          machine_name: 'Coffee 2',
          location_name: 'Mall B',
          quantity: 150,
          revenue: 2250000,
          contribution_percentage: 30,
        },
      ],
      by_payment_method: [
        { payment_method: 'Cash', quantity: 250, revenue: 3750000, percentage: 50 },
        { payment_method: 'Card', quantity: 250, revenue: 3750000, percentage: 50 },
      ],
      daily_trend: [
        { date: '2025-01-01', quantity: 20, revenue: 300000 },
        { date: '2025-01-02', quantity: 18, revenue: 270000 },
      ],
      generated_at: createMockDate('2025-01-15'),
    });

    it('should create workbook with four worksheets', async () => {
      const report = createMockProductSalesReport();

      await service.exportProductSales(report);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(4);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Сводка');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('По аппаратам');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Методы оплаты');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Динамика');
    });

    it('should return a Buffer', async () => {
      const report = createMockProductSalesReport();

      const result = await service.exportProductSales(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include product info in summary sheet', async () => {
      const report = createMockProductSalesReport();

      await service.exportProductSales(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const nameRow = summaryCallArg.find((row: any[]) => row[0] === 'Наименование:');
      expect(nameRow[1]).toBe('Espresso');

      const categoryRow = summaryCallArg.find((row: any[]) => row[0] === 'Категория:');
      expect(categoryRow[1]).toBe('coffee');
    });

    it('should include sales summary with margin', async () => {
      const report = createMockProductSalesReport();

      await service.exportProductSales(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const marginRow = summaryCallArg.find((row: any[]) => row[0] === 'Маржа (%):');
      expect(marginRow[1]).toBe('66.67%');
    });

    it('should include by_machine worksheet with contribution percentages', async () => {
      const report = createMockProductSalesReport();

      await service.exportProductSales(report);

      const machinesCallArg = mockWorksheet.addRows.mock.calls[1][0];

      // Verify header
      expect(machinesCallArg[0]).toEqual(['ПРОДАЖИ ПО АППАРАТАМ']);

      // Verify column headers
      const headerRow = machinesCallArg[2];
      expect(headerRow).toEqual([
        'Номер',
        'Название',
        'Локация',
        'Количество',
        'Выручка (UZS)',
        'Вклад (%)',
      ]);
    });

    it('should include by_payment_method worksheet', async () => {
      const report = createMockProductSalesReport();

      await service.exportProductSales(report);

      const paymentCallArg = mockWorksheet.addRows.mock.calls[2][0];

      // Verify header
      expect(paymentCallArg[0]).toEqual(['ПРОДАЖИ ПО МЕТОДАМ ОПЛАТЫ']);

      // Verify column headers
      const headerRow = paymentCallArg[2];
      expect(headerRow).toEqual(['Метод оплаты', 'Количество', 'Выручка (UZS)', 'Доля (%)']);
    });

    it('should include daily_trend worksheet', async () => {
      const report = createMockProductSalesReport();

      await service.exportProductSales(report);

      const trendCallArg = mockWorksheet.addRows.mock.calls[3][0];

      // Verify header
      expect(trendCallArg[0]).toEqual(['ДИНАМИКА ПРОДАЖ ПО ДНЯМ']);

      // Verify column headers
      const headerRow = trendCallArg[2];
      expect(headerRow).toEqual(['Дата', 'Количество', 'Выручка (UZS)']);

      // Verify first data row
      const firstDataRow = trendCallArg[3];
      expect(firstDataRow[0]).toBe('2025-01-01');
    });

    it('should handle empty arrays gracefully', async () => {
      const report = createMockProductSalesReport();
      report.by_machine = [];
      report.by_payment_method = [];
      report.daily_trend = [];

      const result = await service.exportProductSales(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include product prices', async () => {
      const report = createMockProductSalesReport();

      await service.exportProductSales(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const salePriceRow = summaryCallArg.find((row: any[]) => row[0] === 'Цена продажи:');
      expect(salePriceRow[1]).toBe('15000.00');

      const purchasePriceRow = summaryCallArg.find((row: any[]) => row[0] === 'Цена закупки:');
      expect(purchasePriceRow[1]).toBe('5000.00');
    });
  });

  describe('exportAllProductsSales', () => {
    const createMockAllProductsSalesReport = (): AllProductsSalesReport => ({
      period: {
        start_date: createMockDate('2025-01-01'),
        end_date: createMockDate('2025-01-31'),
      },
      summary: {
        total_products: 25,
        total_quantity_sold: 5000,
        total_revenue: 75000000,
        total_cost: 25000000,
        total_profit: 50000000,
        average_margin: 66.67,
      },
      products: [
        {
          product_name: 'Espresso',
          category: 'coffee',
          quantity_sold: 500,
          revenue: 7500000,
          cost: 2500000,
          profit: 5000000,
          margin: 66.67,
          contribution_percentage: 10,
        },
        {
          product_name: 'Cappuccino',
          category: 'coffee',
          quantity_sold: 400,
          revenue: 8000000,
          cost: 3200000,
          profit: 4800000,
          margin: 60,
          contribution_percentage: 10.67,
        },
      ],
      top_performers: [
        { product_name: 'Cappuccino', revenue: 8000000, quantity: 400 },
        { product_name: 'Espresso', revenue: 7500000, quantity: 500 },
      ],
      low_performers: [{ product_name: 'Green Tea', revenue: 500000, quantity: 50 }],
      generated_at: createMockDate('2025-01-15'),
    });

    it('should create workbook with three worksheets', async () => {
      const report = createMockAllProductsSalesReport();

      await service.exportAllProductsSales(report);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(3);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Сводка');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Продукты');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Топ продукты');
    });

    it('should return a Buffer', async () => {
      const report = createMockAllProductsSalesReport();

      const result = await service.exportAllProductsSales(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include summary section', async () => {
      const report = createMockAllProductsSalesReport();

      await service.exportAllProductsSales(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      // Verify summary header
      expect(summaryCallArg[0]).toEqual(['ОТЧЕТ ПО ВСЕМ ПРОДУКТАМ']);

      const totalProductsRow = summaryCallArg.find((row: any[]) => row[0] === 'Всего продуктов:');
      expect(totalProductsRow[1]).toBe(25);

      const avgMarginRow = summaryCallArg.find((row: any[]) => row[0] === 'Средняя маржа (%):');
      expect(avgMarginRow[1]).toBe('66.67%');
    });

    it('should include products worksheet with full details', async () => {
      const report = createMockAllProductsSalesReport();

      await service.exportAllProductsSales(report);

      const productsCallArg = mockWorksheet.addRows.mock.calls[1][0];

      // Verify header
      expect(productsCallArg[0]).toEqual(['ВСЕ ПРОДУКТЫ']);

      // Verify column headers
      const headerRow = productsCallArg[2];
      expect(headerRow).toEqual([
        'Наименование',
        'Категория',
        'Продано (шт)',
        'Выручка (UZS)',
        'Себестоимость (UZS)',
        'Прибыль (UZS)',
        'Маржа (%)',
        'Вклад (%)',
      ]);

      // Verify first product row
      const firstProductRow = productsCallArg[3];
      expect(firstProductRow[0]).toBe('Espresso');
      expect(firstProductRow[6]).toBe('66.67%');
    });

    it('should include top performers worksheet', async () => {
      const report = createMockAllProductsSalesReport();

      await service.exportAllProductsSales(report);

      const topCallArg = mockWorksheet.addRows.mock.calls[2][0];

      // Verify header
      expect(topCallArg[0]).toEqual(['ТОП ПРОДУКТОВ']);

      // Verify column headers
      const headerRow = topCallArg[2];
      expect(headerRow).toEqual(['Наименование', 'Выручка (UZS)', 'Продано (шт)']);

      // Verify first top performer
      const firstTopRow = topCallArg[3];
      expect(firstTopRow[0]).toBe('Cappuccino');
    });

    it('should handle empty products array', async () => {
      const report = createMockAllProductsSalesReport();
      report.products = [];
      report.top_performers = [];
      report.low_performers = [];

      const result = await service.exportAllProductsSales(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include all summary fields', async () => {
      const report = createMockAllProductsSalesReport();

      await service.exportAllProductsSales(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const rowLabels = summaryCallArg.map((row: any[]) => row[0]);
      expect(rowLabels).toContain('Продано (шт):');
      expect(rowLabels).toContain('Общая выручка (UZS):');
      expect(rowLabels).toContain('Себестоимость (UZS):');
      expect(rowLabels).toContain('Валовая прибыль (UZS):');
    });
  });

  describe('exportCollectionsSummary', () => {
    const createMockCollectionsSummaryReport = (): CollectionsSummaryReport => ({
      period: {
        start_date: createMockDate('2025-01-01'),
        end_date: createMockDate('2025-01-31'),
      },
      summary: {
        total_collections: 50,
        total_collected_amount: 10000000,
        expected_amount: 10500000,
        variance: -500000,
        variance_percentage: -4.76,
        average_collection_amount: 200000,
      },
      by_machine: [
        {
          machine_number: 'M-001',
          machine_name: 'Coffee 1',
          location_name: 'Mall A',
          collections_count: 10,
          collected_amount: 2000000,
          expected_amount: 2100000,
          variance: -100000,
          variance_percentage: -4.76,
        },
        {
          machine_number: 'M-002',
          machine_name: 'Snack 1',
          location_name: 'Mall B',
          collections_count: 8,
          collected_amount: 1600000,
          expected_amount: 1600000,
          variance: 0,
          variance_percentage: 0,
        },
      ],
      by_collector: [
        {
          collector_name: 'Ivan Petrov',
          collections_count: 25,
          total_amount: 5000000,
          average_amount: 200000,
        },
        {
          collector_name: 'Anna Sidorova',
          collections_count: 25,
          total_amount: 5000000,
          average_amount: 200000,
        },
      ],
      discrepancies: [
        {
          machine_number: 'M-003',
          collection_date: createMockDate('2025-01-15'),
          collected_amount: 100000,
          expected_amount: 150000,
          variance: -50000,
          variance_percentage: -33.33,
          status: 'under_review',
        },
      ],
      daily_trend: [
        { date: '2025-01-01', collections_count: 5, total_amount: 1000000 },
        { date: '2025-01-02', collections_count: 4, total_amount: 800000 },
      ],
      generated_at: createMockDate('2025-01-15'),
    });

    it('should create workbook with five worksheets when discrepancies exist', async () => {
      const report = createMockCollectionsSummaryReport();

      await service.exportCollectionsSummary(report);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(5);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Сводка');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('По аппаратам');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('По инкассаторам');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Расхождения');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Динамика');
    });

    it('should create workbook with four worksheets when no discrepancies', async () => {
      const report = createMockCollectionsSummaryReport();
      report.discrepancies = [];

      await service.exportCollectionsSummary(report);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(4);
      expect(mockWorkbook.addWorksheet).not.toHaveBeenCalledWith('Расхождения');
    });

    it('should return a Buffer', async () => {
      const report = createMockCollectionsSummaryReport();

      const result = await service.exportCollectionsSummary(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include summary section with variance', async () => {
      const report = createMockCollectionsSummaryReport();

      await service.exportCollectionsSummary(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      // Verify summary header
      expect(summaryCallArg[0]).toEqual(['СВОДНЫЙ ОТЧЕТ ПО ИНКАССАЦИЯМ']);

      const varianceRow = summaryCallArg.find((row: any[]) => row[0] === 'Расхождение (UZS):');
      expect(varianceRow[1]).toBe('-500000.00');

      const variancePercentRow = summaryCallArg.find((row: any[]) => row[0] === 'Расхождение (%):');
      expect(variancePercentRow[1]).toBe('-4.76%');
    });

    it('should include by_machine worksheet with variance data', async () => {
      const report = createMockCollectionsSummaryReport();

      await service.exportCollectionsSummary(report);

      const machinesCallArg = mockWorksheet.addRows.mock.calls[1][0];

      // Verify header
      expect(machinesCallArg[0]).toEqual(['ИНКАССАЦИИ ПО АППАРАТАМ']);

      // Verify column headers
      const headerRow = machinesCallArg[2];
      expect(headerRow).toEqual([
        'Номер',
        'Название',
        'Локация',
        'Кол-во',
        'Собрано (UZS)',
        'Ожидалось (UZS)',
        'Расхождение (UZS)',
        'Расх. (%)',
      ]);
    });

    it('should include by_collector worksheet', async () => {
      const report = createMockCollectionsSummaryReport();

      await service.exportCollectionsSummary(report);

      const collectorsCallArg = mockWorksheet.addRows.mock.calls[2][0];

      // Verify header
      expect(collectorsCallArg[0]).toEqual(['ИНКАССАЦИИ ПО ИНКАССАТОРАМ']);

      // Verify column headers
      const headerRow = collectorsCallArg[2];
      expect(headerRow).toEqual(['Инкассатор', 'Кол-во', 'Сумма (UZS)', 'Ср. сумма (UZS)']);

      // Verify first collector
      const firstCollectorRow = collectorsCallArg[3];
      expect(firstCollectorRow[0]).toBe('Ivan Petrov');
    });

    it('should include discrepancies worksheet when discrepancies exist', async () => {
      const report = createMockCollectionsSummaryReport();

      await service.exportCollectionsSummary(report);

      const discrepanciesCallArg = mockWorksheet.addRows.mock.calls[3][0];

      // Verify header
      expect(discrepanciesCallArg[0]).toEqual(['ЗНАЧИТЕЛЬНЫЕ РАСХОЖДЕНИЯ (>10%)']);

      // Verify column headers
      const headerRow = discrepanciesCallArg[2];
      expect(headerRow).toEqual([
        'Номер аппарата',
        'Дата',
        'Собрано (UZS)',
        'Ожидалось (UZS)',
        'Расхождение (UZS)',
        'Расх. (%)',
      ]);
    });

    it('should include daily_trend worksheet', async () => {
      const report = createMockCollectionsSummaryReport();

      await service.exportCollectionsSummary(report);

      // When discrepancies exist, daily_trend is at index 4
      const trendCallArg = mockWorksheet.addRows.mock.calls[4][0];

      // Verify header
      expect(trendCallArg[0]).toEqual(['ДИНАМИКА ИНКАССАЦИЙ ПО ДНЯМ']);

      // Verify column headers
      const headerRow = trendCallArg[2];
      expect(headerRow).toEqual(['Дата', 'Количество', 'Сумма (UZS)']);
    });

    it('should handle negative variance correctly', async () => {
      const report = createMockCollectionsSummaryReport();
      report.summary.variance = -500000;
      report.summary.variance_percentage = -4.76;

      await service.exportCollectionsSummary(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];
      const varianceRow = summaryCallArg.find((row: any[]) => row[0] === 'Расхождение (UZS):');
      expect(varianceRow[1]).toBe('-500000.00');
    });

    it('should handle empty arrays gracefully', async () => {
      const report = createMockCollectionsSummaryReport();
      report.by_machine = [];
      report.by_collector = [];
      report.discrepancies = [];
      report.daily_trend = [];

      const result = await service.exportCollectionsSummary(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include all summary fields', async () => {
      const report = createMockCollectionsSummaryReport();

      await service.exportCollectionsSummary(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      const rowLabels = summaryCallArg.map((row: any[]) => row[0]);
      expect(rowLabels).toContain('Всего инкассаций:');
      expect(rowLabels).toContain('Собрано (UZS):');
      expect(rowLabels).toContain('Ожидалось (UZS):');
      expect(rowLabels).toContain('Ср. сумма инкассации:');
    });
  });

  describe('error handling', () => {
    it('should handle xlsx.writeBuffer errors', async () => {
      mockWorkbook.xlsx.writeBuffer.mockRejectedValueOnce(new Error('Write error'));

      const report: NetworkSummaryReport = {
        period: {
          start_date: createMockDate('2025-01-01'),
          end_date: createMockDate('2025-01-31'),
        },
        machines: { total: 0, active: 0, offline: 0, disabled: 0, low_stock: 0 },
        financial: {
          total_revenue: 0,
          total_sales_count: 0,
          total_expenses: 0,
          total_collections: 0,
          net_profit: 0,
          average_revenue_per_machine: 0,
        },
        tasks: {
          total: 0,
          completed: 0,
          pending: 0,
          in_progress: 0,
          overdue: 0,
          completion_rate: 0,
        },
        incidents: { total: 0, open: 0, resolved: 0, average_resolution_time_hours: 0 },
        top_machines: [],
        generated_at: createMockDate('2025-01-15'),
      };

      await expect(service.exportNetworkSummary(report)).rejects.toThrow('Write error');
    });

    it('should handle undefined values in report data', async () => {
      const report: NetworkSummaryReport = {
        period: {
          start_date: createMockDate('2025-01-01'),
          end_date: createMockDate('2025-01-31'),
        },
        machines: { total: 0, active: 0, offline: 0, disabled: 0, low_stock: 0 },
        financial: {
          total_revenue: 0,
          total_sales_count: 0,
          total_expenses: 0,
          total_collections: 0,
          net_profit: 0,
          average_revenue_per_machine: 0,
        },
        tasks: {
          total: 0,
          completed: 0,
          pending: 0,
          in_progress: 0,
          overdue: 0,
          completion_rate: 0,
        },
        incidents: { total: 0, open: 0, resolved: 0, average_resolution_time_hours: 0 },
        top_machines: [],
        generated_at: createMockDate('2025-01-15'),
      };

      const result = await service.exportNetworkSummary(report);

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('data formatting', () => {
    it('should format all monetary values with two decimal places', async () => {
      const report: ProfitLossReport = {
        period: {
          start_date: createMockDate('2025-01-01'),
          end_date: createMockDate('2025-01-31'),
        },
        revenue: {
          sales: 1234567.891,
          other_income: 50000.5,
          total_revenue: 1284568.391,
        },
        expenses: {
          rent: 200000.123,
          purchase: 800000,
          repair: 50000,
          salary: 300000,
          utilities: 30000,
          depreciation: 20000,
          writeoff: 10000,
          other: 40000,
          total_expenses: 1450000.123,
        },
        profit: {
          gross_profit: 1200000.268,
          operating_profit: 600000,
          net_profit: 600000,
          profit_margin_percent: 29.2734,
        },
        generated_at: createMockDate('2025-01-15'),
      };

      await service.exportProfitLoss(report);

      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];

      // Check that sales is formatted with 2 decimal places
      const salesRow = dataCallArg.find((row: any[]) => row[0] === 'Продажи:');
      expect(salesRow[1]).toBe('1234567.89');

      // Check percentage formatting
      const marginRow = dataCallArg.find((row: any[]) => row[0] === 'Маржа прибыли (%):');
      expect(marginRow[1]).toBe('29.27%');
    });

    it('should handle very large numbers correctly', async () => {
      const report: ProfitLossReport = {
        period: {
          start_date: createMockDate('2025-01-01'),
          end_date: createMockDate('2025-01-31'),
        },
        revenue: {
          sales: 9999999999.99,
          other_income: 0,
          total_revenue: 9999999999.99,
        },
        expenses: {
          rent: 0,
          purchase: 0,
          repair: 0,
          salary: 0,
          utilities: 0,
          depreciation: 0,
          writeoff: 0,
          other: 0,
          total_expenses: 0,
        },
        profit: {
          gross_profit: 9999999999.99,
          operating_profit: 9999999999.99,
          net_profit: 9999999999.99,
          profit_margin_percent: 100,
        },
        generated_at: createMockDate('2025-01-15'),
      };

      const result = await service.exportProfitLoss(report);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle zero values without errors', async () => {
      const report: ProfitLossReport = {
        period: {
          start_date: createMockDate('2025-01-01'),
          end_date: createMockDate('2025-01-31'),
        },
        revenue: {
          sales: 0,
          other_income: 0,
          total_revenue: 0,
        },
        expenses: {
          rent: 0,
          purchase: 0,
          repair: 0,
          salary: 0,
          utilities: 0,
          depreciation: 0,
          writeoff: 0,
          other: 0,
          total_expenses: 0,
        },
        profit: {
          gross_profit: 0,
          operating_profit: 0,
          net_profit: 0,
          profit_margin_percent: 0,
        },
        generated_at: createMockDate('2025-01-15'),
      };

      await service.exportProfitLoss(report);

      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];
      const salesRow = dataCallArg.find((row: any[]) => row[0] === 'Продажи:');
      expect(salesRow[1]).toBe('0.00');
    });

    it('should handle negative values correctly', async () => {
      const report: ProfitLossReport = {
        period: {
          start_date: createMockDate('2025-01-01'),
          end_date: createMockDate('2025-01-31'),
        },
        revenue: {
          sales: 500000,
          other_income: 0,
          total_revenue: 500000,
        },
        expenses: {
          rent: 0,
          purchase: 0,
          repair: 0,
          salary: 0,
          utilities: 0,
          depreciation: 0,
          writeoff: 0,
          other: 0,
          total_expenses: 600000,
        },
        profit: {
          gross_profit: -100000,
          operating_profit: -100000,
          net_profit: -100000,
          profit_margin_percent: -20,
        },
        generated_at: createMockDate('2025-01-15'),
      };

      await service.exportProfitLoss(report);

      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];
      const netProfitRow = dataCallArg.find((row: any[]) => row[0] === 'Чистая прибыль:');
      expect(netProfitRow[1]).toBe('-100000.00');

      const marginRow = dataCallArg.find((row: any[]) => row[0] === 'Маржа прибыли (%):');
      expect(marginRow[1]).toBe('-20.00%');
    });
  });

  describe('worksheet structure validation', () => {
    it('should include empty rows for visual separation in network summary', async () => {
      const report: NetworkSummaryReport = {
        period: {
          start_date: createMockDate('2025-01-01'),
          end_date: createMockDate('2025-01-31'),
        },
        machines: { total: 50, active: 45, offline: 3, disabled: 2, low_stock: 5 },
        financial: {
          total_revenue: 1500000,
          total_sales_count: 1200,
          total_expenses: 500000,
          total_collections: 1200000,
          net_profit: 1000000,
          average_revenue_per_machine: 30000,
        },
        tasks: {
          total: 100,
          completed: 85,
          pending: 10,
          in_progress: 3,
          overdue: 2,
          completion_rate: 85.5,
        },
        incidents: { total: 15, open: 3, resolved: 12, average_resolution_time_hours: 4.5 },
        top_machines: [],
        generated_at: createMockDate('2025-01-15'),
      };

      await service.exportNetworkSummary(report);

      const summaryCallArg = mockWorksheet.addRows.mock.calls[0][0];

      // Check for empty row separators
      const emptyRows = summaryCallArg.filter((row: any[]) => row[0] === '');
      expect(emptyRows.length).toBeGreaterThan(0);
    });

    it('should have correct section ordering in P&L report', async () => {
      const report: ProfitLossReport = {
        period: {
          start_date: createMockDate('2025-01-01'),
          end_date: createMockDate('2025-01-31'),
        },
        revenue: { sales: 2000000, other_income: 50000, total_revenue: 2050000 },
        expenses: {
          rent: 200000,
          purchase: 800000,
          repair: 50000,
          salary: 300000,
          utilities: 30000,
          depreciation: 20000,
          writeoff: 10000,
          other: 40000,
          total_expenses: 1450000,
        },
        profit: {
          gross_profit: 1200000,
          operating_profit: 600000,
          net_profit: 600000,
          profit_margin_percent: 29.27,
        },
        generated_at: createMockDate('2025-01-15'),
      };

      await service.exportProfitLoss(report);

      const dataCallArg = mockWorksheet.addRows.mock.calls[0][0];

      // Find section indices
      const headerIndex = dataCallArg.findIndex(
        (row: any[]) => row[0] === 'ОТЧЕТ О ПРИБЫЛЯХ И УБЫТКАХ (P&L)',
      );
      const revenueIndex = dataCallArg.findIndex((row: any[]) => row[0] === 'ВЫРУЧКА (UZS)');
      const expensesIndex = dataCallArg.findIndex((row: any[]) => row[0] === 'РАСХОДЫ (UZS)');
      const profitIndex = dataCallArg.findIndex((row: any[]) => row[0] === 'ПРИБЫЛЬ (UZS)');

      // Verify correct ordering
      expect(headerIndex).toBe(0);
      expect(revenueIndex).toBeGreaterThan(headerIndex);
      expect(expensesIndex).toBeGreaterThan(revenueIndex);
      expect(profitIndex).toBeGreaterThan(expensesIndex);
    });
  });
});
