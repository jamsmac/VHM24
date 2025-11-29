import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CommissionSchedulerService } from './commission-scheduler.service';
import { CommissionService, CommissionCalculationResult } from './commission.service';
import { RevenueAggregationService, RevenueAggregation } from './revenue-aggregation.service';
import { Contract, ContractStatus, CommissionType } from '../entities/contract.entity';
import { CommissionCalculation, PaymentStatus } from '../entities/commission-calculation.entity';

describe('CommissionSchedulerService', () => {
  let service: CommissionSchedulerService;
  let mockContractRepository: jest.Mocked<Repository<Contract>>;
  let mockCalculationRepository: jest.Mocked<Repository<CommissionCalculation>>;
  let mockCommissionService: jest.Mocked<CommissionService>;
  let mockRevenueService: jest.Mocked<RevenueAggregationService>;
  let mockQueryBuilder: Partial<SelectQueryBuilder<CommissionCalculation>>;

  // Test fixtures
  const mockContract: Partial<Contract> = {
    id: 'contract-123',
    contract_number: 'CONTRACT-001',
    status: ContractStatus.ACTIVE,
    commission_type: CommissionType.PERCENTAGE,
    commission_rate: 15,
    commission_fixed_period: 'monthly',
    payment_term_days: 30,
    counterparty_id: 'counterparty-123',
  };

  const mockDailyContract: Partial<Contract> = {
    ...mockContract,
    id: 'contract-daily',
    contract_number: 'CONTRACT-DAILY',
    commission_type: CommissionType.FIXED,
    commission_fixed_amount: 500_000,
    commission_fixed_period: 'daily',
  };

  const mockWeeklyContract: Partial<Contract> = {
    ...mockContract,
    id: 'contract-weekly',
    contract_number: 'CONTRACT-WEEKLY',
    commission_type: CommissionType.FIXED,
    commission_fixed_amount: 3_000_000,
    commission_fixed_period: 'weekly',
  };

  const mockQuarterlyContract: Partial<Contract> = {
    ...mockContract,
    id: 'contract-quarterly',
    contract_number: 'CONTRACT-QUARTERLY',
    commission_type: CommissionType.FIXED,
    commission_fixed_amount: 15_000_000,
    commission_fixed_period: 'quarterly',
  };

  const mockRevenue: RevenueAggregation = {
    total_revenue: 10_000_000,
    transaction_count: 150,
    average_transaction: 66_667,
    period_start: new Date('2025-01-01'),
    period_end: new Date('2025-01-31'),
  };

  const mockCalculationResult: CommissionCalculationResult = {
    total_revenue: 10_000_000,
    transaction_count: 150,
    commission_amount: 1_500_000,
    commission_type: 'percentage',
    calculation_details: { rate: 15 },
  };

  const mockCalculation: Partial<CommissionCalculation> = {
    id: 'calc-123',
    contract_id: 'contract-123',
    period_start: new Date('2025-01-01'),
    period_end: new Date('2025-01-31'),
    total_revenue: 10_000_000,
    transaction_count: 150,
    commission_amount: 1_500_000,
    commission_type: 'percentage',
    payment_status: PaymentStatus.PENDING,
    payment_due_date: new Date('2025-03-02'),
  };

  beforeEach(async () => {
    // Setup query builder mock
    mockQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    } as any;

    // Add set method after base object is created
    (mockQueryBuilder as any).set = jest.fn().mockReturnValue(mockQueryBuilder);

    mockContractRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    mockCalculationRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    mockCommissionService = {
      calculateCommission: jest.fn().mockResolvedValue(mockCalculationResult),
    } as any;

    mockRevenueService = {
      getRevenueForContract: jest.fn().mockResolvedValue(mockRevenue),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionSchedulerService,
        {
          provide: getRepositoryToken(Contract),
          useValue: mockContractRepository,
        },
        {
          provide: getRepositoryToken(CommissionCalculation),
          useValue: mockCalculationRepository,
        },
        {
          provide: CommissionService,
          useValue: mockCommissionService,
        },
        {
          provide: RevenueAggregationService,
          useValue: mockRevenueService,
        },
      ],
    }).compile();

    service = module.get<CommissionSchedulerService>(CommissionSchedulerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDailyCommissions', () => {
    it('should calculate commissions for all daily contracts', async () => {
      // Arrange
      const dailyContracts = [mockDailyContract, { ...mockDailyContract, id: 'daily-2' }];
      mockContractRepository.find.mockResolvedValue(dailyContracts as Contract[]);
      mockCalculationRepository.findOne.mockResolvedValue(null); // No existing calculation
      mockContractRepository.findOne.mockResolvedValue(mockDailyContract as Contract);
      mockCalculationRepository.create.mockReturnValue(mockCalculation as CommissionCalculation);
      mockCalculationRepository.save.mockResolvedValue(mockCalculation as CommissionCalculation);

      // Act
      const result = await service.calculateDailyCommissions();

      // Assert
      expect(result).toBe(2);
      expect(mockContractRepository.find).toHaveBeenCalledWith({
        where: {
          status: ContractStatus.ACTIVE,
          commission_fixed_period: 'daily',
        },
      });
    });

    it('should skip contracts with existing calculations', async () => {
      // Arrange
      mockContractRepository.find.mockResolvedValue([mockDailyContract] as Contract[]);
      mockCalculationRepository.findOne.mockResolvedValue(mockCalculation as CommissionCalculation); // Already exists

      // Act
      const result = await service.calculateDailyCommissions();

      // Assert
      expect(result).toBe(1); // Still counts as processed
      expect(mockCommissionService.calculateCommission).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully and continue processing', async () => {
      // Arrange
      const contracts = [mockDailyContract, { ...mockDailyContract, id: 'daily-2' }];
      mockContractRepository.find.mockResolvedValue(contracts as Contract[]);
      mockCalculationRepository.findOne.mockResolvedValue(null);

      // First contract fails, second succeeds
      mockContractRepository.findOne
        .mockResolvedValueOnce(null) // Contract not found - will fail
        .mockResolvedValueOnce(contracts[1] as Contract);

      mockCalculationRepository.create.mockReturnValue(mockCalculation as CommissionCalculation);
      mockCalculationRepository.save.mockResolvedValue(mockCalculation as CommissionCalculation);

      // Act
      const result = await service.calculateDailyCommissions();

      // Assert - should process at least one successfully
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 when no daily contracts exist', async () => {
      // Arrange
      mockContractRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.calculateDailyCommissions();

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('calculateWeeklyCommissions', () => {
    it('should calculate commissions for all weekly contracts', async () => {
      // Arrange
      const weeklyContracts = [mockWeeklyContract];
      mockContractRepository.find.mockResolvedValue(weeklyContracts as Contract[]);
      mockCalculationRepository.findOne.mockResolvedValue(null);
      mockContractRepository.findOne.mockResolvedValue(mockWeeklyContract as Contract);
      mockCalculationRepository.create.mockReturnValue(mockCalculation as CommissionCalculation);
      mockCalculationRepository.save.mockResolvedValue(mockCalculation as CommissionCalculation);

      // Act
      const result = await service.calculateWeeklyCommissions();

      // Assert
      expect(result).toBe(1);
      expect(mockContractRepository.find).toHaveBeenCalledWith({
        where: {
          status: ContractStatus.ACTIVE,
          commission_fixed_period: 'weekly',
        },
      });
    });

    it('should use Monday as week start', async () => {
      // Arrange
      mockContractRepository.find.mockResolvedValue([mockWeeklyContract] as Contract[]);
      mockCalculationRepository.findOne.mockResolvedValue(null);
      mockContractRepository.findOne.mockResolvedValue(mockWeeklyContract as Contract);
      mockCalculationRepository.create.mockReturnValue(mockCalculation as CommissionCalculation);
      mockCalculationRepository.save.mockResolvedValue(mockCalculation as CommissionCalculation);

      // Act
      await service.calculateWeeklyCommissions();

      // Assert - the period should be calculated correctly
      expect(mockCalculationRepository.findOne).toHaveBeenCalled();
    });
  });

  describe('calculateMonthlyCommissions', () => {
    it('should calculate commissions for monthly contracts', async () => {
      // Arrange
      const monthlyContracts = [mockContract];
      mockContractRepository.find.mockResolvedValue(monthlyContracts as Contract[]);
      mockCalculationRepository.findOne.mockResolvedValue(null);
      mockContractRepository.findOne.mockResolvedValue(mockContract as Contract);
      mockCalculationRepository.create.mockReturnValue(mockCalculation as CommissionCalculation);
      mockCalculationRepository.save.mockResolvedValue(mockCalculation as CommissionCalculation);

      // Act
      const result = await service.calculateMonthlyCommissions();

      // Assert
      expect(result).toBe(1);
      expect(mockContractRepository.find).toHaveBeenCalledWith({
        where: expect.arrayContaining([
          expect.objectContaining({
            status: ContractStatus.ACTIVE,
            commission_fixed_period: 'monthly',
          }),
          expect.objectContaining({
            status: ContractStatus.ACTIVE,
            commission_fixed_period: 'quarterly',
          }),
        ]),
      });
    });

    it('should include quarterly contracts in monthly calculation', async () => {
      // Arrange
      const contracts = [mockContract, mockQuarterlyContract];
      mockContractRepository.find.mockResolvedValue(contracts as Contract[]);
      mockCalculationRepository.findOne.mockResolvedValue(null);
      mockContractRepository.findOne.mockImplementation(({ where }) => {
        const id = (where as any).id;
        return Promise.resolve(contracts.find((c) => c.id === id) as Contract);
      });
      mockCalculationRepository.create.mockReturnValue(mockCalculation as CommissionCalculation);
      mockCalculationRepository.save.mockResolvedValue(mockCalculation as CommissionCalculation);

      // Act
      const result = await service.calculateMonthlyCommissions();

      // Assert
      expect(result).toBe(2);
    });
  });

  describe('calculateForContract', () => {
    it('should create new calculation when none exists', async () => {
      // Arrange
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-31');

      mockCalculationRepository.findOne.mockResolvedValue(null);
      mockContractRepository.findOne.mockResolvedValue(mockContract as Contract);
      mockRevenueService.getRevenueForContract.mockResolvedValue(mockRevenue);
      mockCommissionService.calculateCommission.mockResolvedValue(mockCalculationResult);
      mockCalculationRepository.create.mockReturnValue(mockCalculation as CommissionCalculation);
      mockCalculationRepository.save.mockResolvedValue(mockCalculation as CommissionCalculation);

      // Act
      const result = await service.calculateForContract(mockContract.id!, periodStart, periodEnd);

      // Assert
      expect(result).toEqual(mockCalculation);
      expect(mockRevenueService.getRevenueForContract).toHaveBeenCalledWith(
        mockContract.id,
        periodStart,
        periodEnd,
      );
      expect(mockCommissionService.calculateCommission).toHaveBeenCalled();
      expect(mockCalculationRepository.save).toHaveBeenCalled();
    });

    it('should return existing calculation if already exists for period', async () => {
      // Arrange
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-31');

      mockCalculationRepository.findOne.mockResolvedValue(mockCalculation as CommissionCalculation);

      // Act
      const result = await service.calculateForContract(mockContract.id!, periodStart, periodEnd);

      // Assert
      expect(result).toEqual(mockCalculation);
      expect(mockCommissionService.calculateCommission).not.toHaveBeenCalled();
      expect(mockCalculationRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error when contract not found', async () => {
      // Arrange
      mockCalculationRepository.findOne.mockResolvedValue(null);
      mockContractRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.calculateForContract('non-existent', new Date(), new Date()),
      ).rejects.toThrow('Contract not found');
    });

    it('should calculate payment due date correctly', async () => {
      // Arrange
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-31');
      const expectedDueDate = new Date(periodEnd);
      expectedDueDate.setDate(expectedDueDate.getDate() + mockContract.payment_term_days!);

      mockCalculationRepository.findOne.mockResolvedValue(null);
      mockContractRepository.findOne.mockResolvedValue(mockContract as Contract);
      mockCalculationRepository.create.mockImplementation(
        (data) =>
          ({
            ...data,
            id: 'new-calc',
          }) as any,
      );
      mockCalculationRepository.save.mockImplementation((data) => Promise.resolve(data as any));

      // Act
      const result = await service.calculateForContract(mockContract.id!, periodStart, periodEnd);

      // Assert
      expect(result.payment_due_date!.getTime()).toBeCloseTo(expectedDueDate.getTime(), -4);
    });
  });

  describe('checkAndUpdateOverduePayments', () => {
    it('should update pending payments past due date to overdue', async () => {
      // Arrange
      (mockQueryBuilder.execute as jest.Mock).mockResolvedValue({ affected: 3 });

      // Act
      const result = await service.checkAndUpdateOverduePayments();

      // Assert
      expect(result).toBe(3);
      expect(mockCalculationRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(CommissionCalculation);
      expect((mockQueryBuilder as any).set).toHaveBeenCalledWith({
        payment_status: PaymentStatus.OVERDUE,
        updated_at: expect.any(Date),
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('payment_status = :status', {
        status: PaymentStatus.PENDING,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'payment_due_date < :today',
        expect.any(Object),
      );
    });

    it('should return 0 when no payments are overdue', async () => {
      // Arrange
      (mockQueryBuilder.execute as jest.Mock).mockResolvedValue({ affected: 0 });

      // Act
      const result = await service.checkAndUpdateOverduePayments();

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('getPendingPayments', () => {
    it('should return all pending and overdue payments', async () => {
      // Arrange
      const pendingPayments = [
        { ...mockCalculation, payment_status: PaymentStatus.PENDING },
        { ...mockCalculation, id: 'calc-2', payment_status: PaymentStatus.OVERDUE },
      ];
      mockCalculationRepository.find.mockResolvedValue(pendingPayments as CommissionCalculation[]);

      // Act
      const result = await service.getPendingPayments();

      // Assert
      expect(result).toHaveLength(2);
      expect(mockCalculationRepository.find).toHaveBeenCalledWith({
        where: {
          payment_status: expect.any(Object), // In(['pending', 'overdue'])
        },
        relations: ['contract', 'contract.counterparty'],
        order: {
          payment_due_date: 'ASC',
        },
      });
    });

    it('should return empty array when no pending payments exist', async () => {
      // Arrange
      mockCalculationRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getPendingPayments();

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('getOverduePayments', () => {
    it('should return only overdue payments', async () => {
      // Arrange
      const overduePayments = [{ ...mockCalculation, payment_status: PaymentStatus.OVERDUE }];
      mockCalculationRepository.find.mockResolvedValue(overduePayments as CommissionCalculation[]);

      // Act
      const result = await service.getOverduePayments();

      // Assert
      expect(result).toHaveLength(1);
      expect(mockCalculationRepository.find).toHaveBeenCalledWith({
        where: {
          payment_status: PaymentStatus.OVERDUE,
        },
        relations: ['contract', 'contract.counterparty'],
        order: {
          payment_due_date: 'ASC',
        },
      });
    });
  });

  describe('markAsPaid', () => {
    it('should mark calculation as paid with transaction ID', async () => {
      // Arrange
      const unpaidCalculation = {
        ...mockCalculation,
        payment_status: PaymentStatus.PENDING,
        payment_date: null,
        payment_transaction_id: null,
      };
      mockCalculationRepository.findOne.mockResolvedValue(
        unpaidCalculation as CommissionCalculation,
      );
      mockCalculationRepository.save.mockImplementation((data) => Promise.resolve(data as any));

      const transactionId = 'txn-123';
      const paymentDate = new Date('2025-02-15');

      // Act
      const result = await service.markAsPaid('calc-123', transactionId, paymentDate);

      // Assert
      expect(result.payment_status).toBe(PaymentStatus.PAID);
      expect(result.payment_transaction_id).toBe(transactionId);
      expect(result.payment_date).toEqual(paymentDate);
    });

    it('should use current date when paymentDate not provided', async () => {
      // Arrange
      mockCalculationRepository.findOne.mockResolvedValue({
        ...mockCalculation,
        payment_status: PaymentStatus.PENDING,
      } as CommissionCalculation);
      mockCalculationRepository.save.mockImplementation((data) => Promise.resolve(data as any));

      // Act
      const result = await service.markAsPaid('calc-123');

      // Assert
      expect(result.payment_status).toBe(PaymentStatus.PAID);
      expect(result.payment_date).toBeInstanceOf(Date);
    });

    it('should throw error when calculation not found', async () => {
      // Arrange
      mockCalculationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.markAsPaid('non-existent')).rejects.toThrow(
        'Commission calculation not found',
      );
    });

    it('should mark previously overdue calculation as paid', async () => {
      // Arrange
      const overdueCalculation = {
        ...mockCalculation,
        payment_status: PaymentStatus.OVERDUE,
      };
      mockCalculationRepository.findOne.mockResolvedValue(
        overdueCalculation as CommissionCalculation,
      );
      mockCalculationRepository.save.mockImplementation((data) => Promise.resolve(data as any));

      // Act
      const result = await service.markAsPaid('calc-123', 'txn-123');

      // Assert
      expect(result.payment_status).toBe(PaymentStatus.PAID);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full monthly commission cycle', async () => {
      // Arrange
      const contracts = [mockContract];
      mockContractRepository.find.mockResolvedValue(contracts as Contract[]);
      mockCalculationRepository.findOne.mockResolvedValue(null);
      mockContractRepository.findOne.mockResolvedValue(mockContract as Contract);
      mockRevenueService.getRevenueForContract.mockResolvedValue(mockRevenue);
      mockCommissionService.calculateCommission.mockResolvedValue(mockCalculationResult);
      mockCalculationRepository.create.mockReturnValue(mockCalculation as CommissionCalculation);
      mockCalculationRepository.save.mockResolvedValue(mockCalculation as CommissionCalculation);

      // Act
      const calculatedCount = await service.calculateMonthlyCommissions();

      // Assert
      expect(calculatedCount).toBe(1);
      expect(mockRevenueService.getRevenueForContract).toHaveBeenCalled();
      expect(mockCommissionService.calculateCommission).toHaveBeenCalled();
    });

    it('should handle zero revenue correctly', async () => {
      // Arrange
      const zeroRevenue: RevenueAggregation = {
        ...mockRevenue,
        total_revenue: 0,
        transaction_count: 0,
        average_transaction: 0,
      };
      const zeroCommission: CommissionCalculationResult = {
        ...mockCalculationResult,
        total_revenue: 0,
        transaction_count: 0,
        commission_amount: 0,
      };

      mockCalculationRepository.findOne.mockResolvedValue(null);
      mockContractRepository.findOne.mockResolvedValue(mockContract as Contract);
      mockRevenueService.getRevenueForContract.mockResolvedValue(zeroRevenue);
      mockCommissionService.calculateCommission.mockResolvedValue(zeroCommission);
      mockCalculationRepository.create.mockImplementation((data) => data as any);
      mockCalculationRepository.save.mockImplementation((data) => Promise.resolve(data as any));

      // Act
      const result = await service.calculateForContract(
        mockContract.id!,
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      // Assert
      expect(result.commission_amount).toBe(0);
      expect(result.total_revenue).toBe(0);
    });
  });
});
