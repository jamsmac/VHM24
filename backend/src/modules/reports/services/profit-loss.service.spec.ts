import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProfitLossService } from './profit-loss.service';
import {
  Transaction,
  TransactionType,
  ExpenseCategory,
} from '../../transactions/entities/transaction.entity';

describe('ProfitLossService', () => {
  let service: ProfitLossService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfitLossService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProfitLossService>(ProfitLossService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    it('should generate a complete P&L report', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockTransactions = [
        // Sales
        { transaction_type: TransactionType.SALE, amount: '1000', expense_category: null },
        { transaction_type: TransactionType.SALE, amount: '2000', expense_category: null },
        // Expenses by category
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '500',
          expense_category: ExpenseCategory.RENT,
        },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '300',
          expense_category: ExpenseCategory.PURCHASE,
        },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '100',
          expense_category: ExpenseCategory.REPAIR,
        },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '200',
          expense_category: ExpenseCategory.SALARY,
        },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '50',
          expense_category: ExpenseCategory.UTILITIES,
        },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '25',
          expense_category: ExpenseCategory.DEPRECIATION,
        },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '10',
          expense_category: ExpenseCategory.WRITEOFF,
        },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '15',
          expense_category: ExpenseCategory.OTHER,
        },
      ];

      mockRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.generateReport(startDate, endDate);

      expect(result.period.start_date).toEqual(startDate);
      expect(result.period.end_date).toEqual(endDate);

      // Revenue calculations
      expect(result.revenue.sales).toBe(3000);
      expect(result.revenue.other_income).toBe(0);
      expect(result.revenue.total_revenue).toBe(3000);

      // Expense calculations
      expect(result.expenses.rent).toBe(500);
      expect(result.expenses.purchase).toBe(300);
      expect(result.expenses.repair).toBe(100);
      expect(result.expenses.salary).toBe(200);
      expect(result.expenses.utilities).toBe(50);
      expect(result.expenses.depreciation).toBe(25);
      expect(result.expenses.writeoff).toBe(10);
      expect(result.expenses.other).toBe(15);
      expect(result.expenses.total_expenses).toBe(1200);

      // Profit calculations
      expect(result.profit.gross_profit).toBe(2700); // sales - purchase
      expect(result.profit.net_profit).toBe(1800); // total_revenue - total_expenses
      expect(result.profit.profit_margin_percent).toBe(60); // (1800/3000) * 100

      expect(result.generated_at).toBeDefined();
    });

    it('should handle empty transactions', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.generateReport(new Date('2025-01-01'), new Date('2025-01-31'));

      expect(result.revenue.sales).toBe(0);
      expect(result.revenue.total_revenue).toBe(0);
      expect(result.expenses.total_expenses).toBe(0);
      expect(result.profit.net_profit).toBe(0);
      expect(result.profit.profit_margin_percent).toBe(0);
    });

    it('should handle only sales transactions', async () => {
      const mockTransactions = [
        { transaction_type: TransactionType.SALE, amount: '500' },
        { transaction_type: TransactionType.SALE, amount: '700' },
      ];

      mockRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.generateReport(new Date('2025-01-01'), new Date('2025-01-31'));

      expect(result.revenue.sales).toBe(1200);
      expect(result.expenses.total_expenses).toBe(0);
      expect(result.profit.net_profit).toBe(1200);
      expect(result.profit.profit_margin_percent).toBe(100);
    });

    it('should handle only expense transactions', async () => {
      const mockTransactions = [
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '300',
          expense_category: ExpenseCategory.RENT,
        },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '200',
          expense_category: ExpenseCategory.SALARY,
        },
      ];

      mockRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.generateReport(new Date('2025-01-01'), new Date('2025-01-31'));

      expect(result.revenue.sales).toBe(0);
      expect(result.expenses.total_expenses).toBe(500);
      expect(result.profit.net_profit).toBe(-500);
      expect(result.profit.profit_margin_percent).toBe(0); // Can't calculate margin with 0 revenue
    });

    it('should categorize expenses without category as "other"', async () => {
      const mockTransactions = [
        { transaction_type: TransactionType.EXPENSE, amount: '100', expense_category: null },
        { transaction_type: TransactionType.EXPENSE, amount: '50', expense_category: undefined },
      ];

      mockRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.generateReport(new Date('2025-01-01'), new Date('2025-01-31'));

      expect(result.expenses.other).toBe(150);
    });

    it('should calculate gross profit correctly', async () => {
      const mockTransactions = [
        { transaction_type: TransactionType.SALE, amount: '1000' },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '400',
          expense_category: ExpenseCategory.PURCHASE,
        },
      ];

      mockRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.generateReport(new Date('2025-01-01'), new Date('2025-01-31'));

      // Gross profit = Sales - COGS (purchase)
      expect(result.profit.gross_profit).toBe(600);
    });

    it('should calculate operating profit correctly', async () => {
      const mockTransactions = [
        { transaction_type: TransactionType.SALE, amount: '1000' },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '100',
          expense_category: ExpenseCategory.RENT,
        },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '100',
          expense_category: ExpenseCategory.REPAIR,
        },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '100',
          expense_category: ExpenseCategory.SALARY,
        },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '50',
          expense_category: ExpenseCategory.UTILITIES,
        },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '25',
          expense_category: ExpenseCategory.OTHER,
        },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '50',
          expense_category: ExpenseCategory.DEPRECIATION,
        },
      ];

      mockRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.generateReport(new Date('2025-01-01'), new Date('2025-01-31'));

      // Operating profit = total_revenue - (rent + repair + salary + utilities + other)
      // = 1000 - (100 + 100 + 100 + 50 + 25) = 625
      expect(result.profit.operating_profit).toBe(625);
    });

    it('should handle decimal amounts', async () => {
      const mockTransactions = [
        { transaction_type: TransactionType.SALE, amount: '999.99' },
        {
          transaction_type: TransactionType.EXPENSE,
          amount: '499.50',
          expense_category: ExpenseCategory.RENT,
        },
      ];

      mockRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.generateReport(new Date('2025-01-01'), new Date('2025-01-31'));

      expect(result.revenue.sales).toBeCloseTo(999.99);
      expect(result.expenses.rent).toBeCloseTo(499.5);
      expect(result.profit.net_profit).toBeCloseTo(500.49);
    });

    it('should include generated_at timestamp', async () => {
      mockRepository.find.mockResolvedValue([]);

      const beforeGeneration = new Date();
      const result = await service.generateReport(new Date('2025-01-01'), new Date('2025-01-31'));
      const afterGeneration = new Date();

      expect(result.generated_at.getTime()).toBeGreaterThanOrEqual(beforeGeneration.getTime());
      expect(result.generated_at.getTime()).toBeLessThanOrEqual(afterGeneration.getTime());
    });

    it('should query transactions with correct date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockRepository.find.mockResolvedValue([]);

      await service.generateReport(startDate, endDate);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          transaction_date: expect.any(Object),
        },
      });
    });
  });
});
