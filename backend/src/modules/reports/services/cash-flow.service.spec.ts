import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashFlowService } from './cash-flow.service';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
} from '../../transactions/entities/transaction.entity';

describe('CashFlowService', () => {
  let service: CashFlowService;
  let mockTransactionRepository: jest.Mocked<Repository<Transaction>>;

  // Helper to create a mock transaction
  const createMockTransaction = (
    type: TransactionType,
    amount: number,
    paymentMethod: PaymentMethod | null = null,
  ): Partial<Transaction> => ({
    id: `txn-${Math.random().toString(36).substring(7)}`,
    transaction_type: type,
    amount,
    payment_method: paymentMethod,
    transaction_date: new Date('2025-01-15'),
  });

  beforeEach(async () => {
    mockTransactionRepository = {
      find: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashFlowService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
      ],
    }).compile();

    service = module.get<CashFlowService>(CashFlowService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');

    describe('date range filtering', () => {
      it('should call repository.find with correct date range using Between operator', async () => {
        // Arrange
        mockTransactionRepository.find.mockResolvedValue([]);

        // Act
        await service.generateReport(startDate, endDate);

        // Assert
        expect(mockTransactionRepository.find).toHaveBeenCalledWith({
          where: {
            transaction_date: expect.objectContaining({
              _type: 'between',
              _value: [startDate, endDate],
            }),
          },
        });
      });

      it('should return period with correct start and end dates', async () => {
        // Arrange
        mockTransactionRepository.find.mockResolvedValue([]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.period.start_date).toEqual(startDate);
        expect(result.period.end_date).toEqual(endDate);
      });
    });

    describe('cash inflows calculation', () => {
      it('should calculate cash_sales from CASH payment method + SALE type', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 100, PaymentMethod.CASH),
          createMockTransaction(TransactionType.SALE, 200, PaymentMethod.CASH),
          createMockTransaction(TransactionType.SALE, 50, PaymentMethod.CARD),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_inflows.cash_sales).toBe(300);
      });

      it('should calculate card_sales from CARD payment method + SALE type', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 150, PaymentMethod.CARD),
          createMockTransaction(TransactionType.SALE, 250, PaymentMethod.CARD),
          createMockTransaction(TransactionType.SALE, 100, PaymentMethod.CASH),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_inflows.card_sales).toBe(400);
      });

      it('should calculate mobile_sales from MOBILE payment method + SALE type', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 75, PaymentMethod.MOBILE),
          createMockTransaction(TransactionType.SALE, 125, PaymentMethod.MOBILE),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_inflows.mobile_sales).toBe(200);
      });

      it('should calculate qr_sales from QR payment method + SALE type', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 50, PaymentMethod.QR),
          createMockTransaction(TransactionType.SALE, 100, PaymentMethod.QR),
          createMockTransaction(TransactionType.SALE, 150, PaymentMethod.QR),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_inflows.qr_sales).toBe(300);
      });

      it('should calculate collections from COLLECTION transaction type', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.COLLECTION, 1000),
          createMockTransaction(TransactionType.COLLECTION, 2000),
          createMockTransaction(TransactionType.SALE, 100, PaymentMethod.CASH),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_inflows.collections).toBe(3000);
      });

      it('should calculate total_inflows as sum of all inflows', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 100, PaymentMethod.CASH),
          createMockTransaction(TransactionType.SALE, 200, PaymentMethod.CARD),
          createMockTransaction(TransactionType.SALE, 150, PaymentMethod.MOBILE),
          createMockTransaction(TransactionType.SALE, 50, PaymentMethod.QR),
          createMockTransaction(TransactionType.COLLECTION, 500),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_inflows.total_inflows).toBe(1000); // 100 + 200 + 150 + 50 + 500
        expect(result.cash_inflows.cash_sales).toBe(100);
        expect(result.cash_inflows.card_sales).toBe(200);
        expect(result.cash_inflows.mobile_sales).toBe(150);
        expect(result.cash_inflows.qr_sales).toBe(50);
        expect(result.cash_inflows.collections).toBe(500);
      });
    });

    describe('cash outflows calculation', () => {
      it('should calculate expenses from EXPENSE transaction type', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.EXPENSE, 500),
          createMockTransaction(TransactionType.EXPENSE, 300),
          createMockTransaction(TransactionType.SALE, 100, PaymentMethod.CASH),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_outflows.expenses).toBe(800);
      });

      it('should calculate refunds from REFUND transaction type', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.REFUND, 50),
          createMockTransaction(TransactionType.REFUND, 75),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_outflows.refunds).toBe(125);
      });

      it('should calculate total_outflows as sum of expenses and refunds', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.EXPENSE, 400),
          createMockTransaction(TransactionType.REFUND, 100),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_outflows.total_outflows).toBe(500);
        expect(result.cash_outflows.expenses).toBe(400);
        expect(result.cash_outflows.refunds).toBe(100);
      });
    });

    describe('net cash flow calculation', () => {
      it('should calculate net_cash_flow as inflows minus outflows', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 1000, PaymentMethod.CASH),
          createMockTransaction(TransactionType.SALE, 500, PaymentMethod.CARD),
          createMockTransaction(TransactionType.EXPENSE, 300),
          createMockTransaction(TransactionType.REFUND, 50),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        // Inflows: 1000 + 500 = 1500
        // Outflows: 300 + 50 = 350
        // Net: 1500 - 350 = 1150
        expect(result.net_cash_flow).toBe(1150);
      });

      it('should return negative net_cash_flow when outflows exceed inflows', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 200, PaymentMethod.CASH),
          createMockTransaction(TransactionType.EXPENSE, 500),
          createMockTransaction(TransactionType.REFUND, 100),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.net_cash_flow).toBe(-400); // 200 - 600
      });
    });

    describe('cash position', () => {
      it('should set opening_balance to 0 (placeholder)', async () => {
        // Arrange
        mockTransactionRepository.find.mockResolvedValue([]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_position.opening_balance).toBe(0);
      });

      it('should set closing_balance equal to net_cash_flow', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 500, PaymentMethod.CASH),
          createMockTransaction(TransactionType.EXPENSE, 200),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_position.closing_balance).toBe(300); // net_cash_flow
      });
    });

    describe('payment breakdown', () => {
      it('should include all four payment methods in breakdown', async () => {
        // Arrange
        mockTransactionRepository.find.mockResolvedValue([]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.payment_breakdown).toHaveLength(4);
        expect(result.payment_breakdown.map((b) => b.payment_method)).toEqual([
          'CASH',
          'CARD',
          'MOBILE',
          'QR',
        ]);
      });

      it('should calculate correct amounts per payment method', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 100, PaymentMethod.CASH),
          createMockTransaction(TransactionType.SALE, 200, PaymentMethod.CARD),
          createMockTransaction(TransactionType.SALE, 150, PaymentMethod.MOBILE),
          createMockTransaction(TransactionType.SALE, 50, PaymentMethod.QR),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        const cashBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'CASH');
        const cardBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'CARD');
        const mobileBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'MOBILE');
        const qrBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'QR');

        expect(cashBreakdown?.amount).toBe(100);
        expect(cardBreakdown?.amount).toBe(200);
        expect(mobileBreakdown?.amount).toBe(150);
        expect(qrBreakdown?.amount).toBe(50);
      });

      it('should calculate correct transaction counts per payment method', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 100, PaymentMethod.CASH),
          createMockTransaction(TransactionType.SALE, 50, PaymentMethod.CASH),
          createMockTransaction(TransactionType.SALE, 200, PaymentMethod.CARD),
          createMockTransaction(TransactionType.SALE, 150, PaymentMethod.MOBILE),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        const cashBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'CASH');
        const cardBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'CARD');
        const mobileBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'MOBILE');
        const qrBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'QR');

        expect(cashBreakdown?.transaction_count).toBe(2);
        expect(cardBreakdown?.transaction_count).toBe(1);
        expect(mobileBreakdown?.transaction_count).toBe(1);
        expect(qrBreakdown?.transaction_count).toBe(0);
      });

      it('should calculate correct percentages based on total inflows', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 200, PaymentMethod.CASH),
          createMockTransaction(TransactionType.SALE, 300, PaymentMethod.CARD),
          createMockTransaction(TransactionType.SALE, 250, PaymentMethod.MOBILE),
          createMockTransaction(TransactionType.SALE, 250, PaymentMethod.QR),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert - Total inflows: 1000
        const cashBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'CASH');
        const cardBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'CARD');
        const mobileBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'MOBILE');
        const qrBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'QR');

        expect(cashBreakdown?.percentage).toBe(20); // 200/1000 * 100
        expect(cardBreakdown?.percentage).toBe(30); // 300/1000 * 100
        expect(mobileBreakdown?.percentage).toBe(25); // 250/1000 * 100
        expect(qrBreakdown?.percentage).toBe(25); // 250/1000 * 100
      });

      it('should set percentage to 0 when total inflows is 0', async () => {
        // Arrange
        const transactions = [createMockTransaction(TransactionType.EXPENSE, 500)];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        result.payment_breakdown.forEach((breakdown) => {
          expect(breakdown.percentage).toBe(0);
        });
      });

      it('should include collections in total inflows for percentage calculation', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 500, PaymentMethod.CASH),
          createMockTransaction(TransactionType.COLLECTION, 500),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert - Total inflows: 1000 (500 cash sales + 500 collections)
        const cashBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'CASH');
        expect(cashBreakdown?.percentage).toBe(50); // 500/1000 * 100
      });
    });

    describe('empty transactions handling', () => {
      it('should return zeros for all values when no transactions exist', async () => {
        // Arrange
        mockTransactionRepository.find.mockResolvedValue([]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_inflows.cash_sales).toBe(0);
        expect(result.cash_inflows.card_sales).toBe(0);
        expect(result.cash_inflows.mobile_sales).toBe(0);
        expect(result.cash_inflows.qr_sales).toBe(0);
        expect(result.cash_inflows.collections).toBe(0);
        expect(result.cash_inflows.total_inflows).toBe(0);

        expect(result.cash_outflows.expenses).toBe(0);
        expect(result.cash_outflows.refunds).toBe(0);
        expect(result.cash_outflows.total_outflows).toBe(0);

        expect(result.net_cash_flow).toBe(0);
        expect(result.cash_position.closing_balance).toBe(0);
      });

      it('should return empty breakdown counts when no transactions exist', async () => {
        // Arrange
        mockTransactionRepository.find.mockResolvedValue([]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        result.payment_breakdown.forEach((breakdown) => {
          expect(breakdown.amount).toBe(0);
          expect(breakdown.transaction_count).toBe(0);
          expect(breakdown.percentage).toBe(0);
        });
      });
    });

    describe('edge cases', () => {
      it('should handle all transactions being from the same payment method', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 100, PaymentMethod.CASH),
          createMockTransaction(TransactionType.SALE, 200, PaymentMethod.CASH),
          createMockTransaction(TransactionType.SALE, 300, PaymentMethod.CASH),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        const cashBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'CASH');
        const cardBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'CARD');

        expect(cashBreakdown?.amount).toBe(600);
        expect(cashBreakdown?.transaction_count).toBe(3);
        expect(cashBreakdown?.percentage).toBe(100);

        expect(cardBreakdown?.amount).toBe(0);
        expect(cardBreakdown?.transaction_count).toBe(0);
        expect(cardBreakdown?.percentage).toBe(0);
      });

      it('should handle only expenses with no sales', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.EXPENSE, 500),
          createMockTransaction(TransactionType.EXPENSE, 300),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_inflows.total_inflows).toBe(0);
        expect(result.cash_outflows.expenses).toBe(800);
        expect(result.cash_outflows.total_outflows).toBe(800);
        expect(result.net_cash_flow).toBe(-800);
      });

      it('should handle only refunds with no sales', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.REFUND, 100),
          createMockTransaction(TransactionType.REFUND, 50),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_inflows.total_inflows).toBe(0);
        expect(result.cash_outflows.refunds).toBe(150);
        expect(result.cash_outflows.total_outflows).toBe(150);
        expect(result.net_cash_flow).toBe(-150);
      });

      it('should handle only collections with no sales', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.COLLECTION, 1000),
          createMockTransaction(TransactionType.COLLECTION, 2000),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_inflows.cash_sales).toBe(0);
        expect(result.cash_inflows.card_sales).toBe(0);
        expect(result.cash_inflows.collections).toBe(3000);
        expect(result.cash_inflows.total_inflows).toBe(3000);
        expect(result.net_cash_flow).toBe(3000);
      });

      it('should handle decimal amounts correctly', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 99.99, PaymentMethod.CASH),
          createMockTransaction(TransactionType.SALE, 150.5, PaymentMethod.CARD),
          createMockTransaction(TransactionType.EXPENSE, 75.25),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_inflows.cash_sales).toBeCloseTo(99.99, 2);
        expect(result.cash_inflows.card_sales).toBeCloseTo(150.5, 2);
        expect(result.cash_outflows.expenses).toBeCloseTo(75.25, 2);
        expect(result.net_cash_flow).toBeCloseTo(175.24, 2); // 250.49 - 75.25
      });

      it('should handle string amounts (from database decimals)', async () => {
        // Arrange - TypeORM can return decimal columns as strings
        const transactions = [
          {
            ...createMockTransaction(TransactionType.SALE, 0, PaymentMethod.CASH),
            amount: '100.50' as any, // Simulating string from DB
          },
          {
            ...createMockTransaction(TransactionType.SALE, 0, PaymentMethod.CARD),
            amount: '200.75' as any,
          },
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_inflows.cash_sales).toBe(100.5);
        expect(result.cash_inflows.card_sales).toBe(200.75);
        expect(result.cash_inflows.total_inflows).toBe(301.25);
      });

      it('should handle very large transaction amounts', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 999999999.99, PaymentMethod.CASH),
          createMockTransaction(TransactionType.SALE, 888888888.88, PaymentMethod.CARD),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.cash_inflows.cash_sales).toBe(999999999.99);
        expect(result.cash_inflows.card_sales).toBe(888888888.88);
        expect(result.cash_inflows.total_inflows).toBeCloseTo(1888888888.87, 2);
      });

      it('should handle mixed transaction types correctly', async () => {
        // Arrange - Complex scenario with all transaction types
        const transactions = [
          // Sales
          createMockTransaction(TransactionType.SALE, 100, PaymentMethod.CASH),
          createMockTransaction(TransactionType.SALE, 200, PaymentMethod.CARD),
          createMockTransaction(TransactionType.SALE, 150, PaymentMethod.MOBILE),
          createMockTransaction(TransactionType.SALE, 50, PaymentMethod.QR),
          // Collections
          createMockTransaction(TransactionType.COLLECTION, 500),
          // Expenses
          createMockTransaction(TransactionType.EXPENSE, 300),
          createMockTransaction(TransactionType.EXPENSE, 100),
          // Refunds
          createMockTransaction(TransactionType.REFUND, 25),
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        // Inflows: 100 + 200 + 150 + 50 + 500 = 1000
        expect(result.cash_inflows.cash_sales).toBe(100);
        expect(result.cash_inflows.card_sales).toBe(200);
        expect(result.cash_inflows.mobile_sales).toBe(150);
        expect(result.cash_inflows.qr_sales).toBe(50);
        expect(result.cash_inflows.collections).toBe(500);
        expect(result.cash_inflows.total_inflows).toBe(1000);

        // Outflows: 300 + 100 + 25 = 425
        expect(result.cash_outflows.expenses).toBe(400);
        expect(result.cash_outflows.refunds).toBe(25);
        expect(result.cash_outflows.total_outflows).toBe(425);

        // Net: 1000 - 425 = 575
        expect(result.net_cash_flow).toBe(575);
        expect(result.cash_position.closing_balance).toBe(575);

        // Percentages based on total inflows (1000)
        const cashBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'CASH');
        expect(cashBreakdown?.percentage).toBe(10); // 100/1000 * 100
      });

      it('should not count non-SALE transactions in payment breakdown counts', async () => {
        // Arrange
        const transactions = [
          createMockTransaction(TransactionType.SALE, 100, PaymentMethod.CASH),
          createMockTransaction(TransactionType.COLLECTION, 500), // Not a SALE
          createMockTransaction(TransactionType.EXPENSE, 200), // Not a SALE
        ];
        mockTransactionRepository.find.mockResolvedValue(transactions as Transaction[]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert - Only the SALE transaction should be counted
        const cashBreakdown = result.payment_breakdown.find((b) => b.payment_method === 'CASH');
        expect(cashBreakdown?.transaction_count).toBe(1);
      });
    });

    describe('generated_at timestamp', () => {
      it('should include generated_at timestamp', async () => {
        // Arrange
        mockTransactionRepository.find.mockResolvedValue([]);
        const beforeTest = new Date();

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert
        expect(result.generated_at).toBeDefined();
        expect(result.generated_at).toBeInstanceOf(Date);
        expect(result.generated_at.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      });
    });

    describe('report structure', () => {
      it('should return a complete CashFlowReport structure', async () => {
        // Arrange
        mockTransactionRepository.find.mockResolvedValue([]);

        // Act
        const result = await service.generateReport(startDate, endDate);

        // Assert - Verify all required properties exist
        expect(result).toHaveProperty('period');
        expect(result).toHaveProperty('period.start_date');
        expect(result).toHaveProperty('period.end_date');

        expect(result).toHaveProperty('cash_inflows');
        expect(result).toHaveProperty('cash_inflows.cash_sales');
        expect(result).toHaveProperty('cash_inflows.card_sales');
        expect(result).toHaveProperty('cash_inflows.mobile_sales');
        expect(result).toHaveProperty('cash_inflows.qr_sales');
        expect(result).toHaveProperty('cash_inflows.collections');
        expect(result).toHaveProperty('cash_inflows.total_inflows');

        expect(result).toHaveProperty('cash_outflows');
        expect(result).toHaveProperty('cash_outflows.expenses');
        expect(result).toHaveProperty('cash_outflows.refunds');
        expect(result).toHaveProperty('cash_outflows.total_outflows');

        expect(result).toHaveProperty('net_cash_flow');

        expect(result).toHaveProperty('cash_position');
        expect(result).toHaveProperty('cash_position.opening_balance');
        expect(result).toHaveProperty('cash_position.closing_balance');

        expect(result).toHaveProperty('payment_breakdown');
        expect(result).toHaveProperty('generated_at');
      });
    });
  });
});
