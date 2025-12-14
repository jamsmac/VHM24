import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { CommissionService } from './commission.service';
import { Contract, CommissionType } from '../entities/contract.entity';
import { CommissionCalculation, PaymentStatus } from '../entities/commission-calculation.entity';

describe('CommissionService', () => {
  let service: CommissionService;
  let _contractRepository: Repository<Contract>;
  let _calculationRepository: Repository<CommissionCalculation>;
  let mockQueryBuilder: Partial<SelectQueryBuilder<CommissionCalculation>>;

  const mockContractRepository = {
    findOne: jest.fn(),
  };

  // Setup query builder mock
  const createMockQueryBuilder = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  });

  const mockCalculationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    mockQueryBuilder = createMockQueryBuilder();
    mockCalculationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionService,
        {
          provide: getRepositoryToken(Contract),
          useValue: mockContractRepository,
        },
        {
          provide: getRepositoryToken(CommissionCalculation),
          useValue: mockCalculationRepository,
        },
      ],
    }).compile();

    service = module.get<CommissionService>(CommissionService);
    _contractRepository = module.get<Repository<Contract>>(getRepositoryToken(Contract));
    _calculationRepository = module.get<Repository<CommissionCalculation>>(
      getRepositoryToken(CommissionCalculation),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCommission - PERCENTAGE type', () => {
    it('should calculate commission correctly for percentage type', async () => {
      const contract = {
        id: '123',
        commission_type: CommissionType.PERCENTAGE,
        commission_rate: 15.0,
      } as Contract;

      const revenue = 10_000_000; // 10M UZS
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-31');

      const result = await service.calculateCommission(contract, revenue, periodStart, periodEnd);

      // Expected: 10,000,000 * 15% = 1,500,000 UZS
      expect(result.commission_amount).toBe(1_500_000);
      expect(result.commission_type).toBe(CommissionType.PERCENTAGE);
      expect(result.total_revenue).toBe(revenue);
      expect(result.calculation_details.rate).toBe(15);
    });

    it('should handle 0% commission rate', async () => {
      const contract = {
        commission_type: CommissionType.PERCENTAGE,
        commission_rate: 0,
      } as Contract;

      const result = await service.calculateCommission(
        contract,
        10_000_000,
        new Date(),
        new Date(),
      );

      expect(result.commission_amount).toBe(0);
    });

    it('should handle 100% commission rate', async () => {
      const contract = {
        commission_type: CommissionType.PERCENTAGE,
        commission_rate: 100,
      } as Contract;

      const revenue = 5_000_000;
      const result = await service.calculateCommission(contract, revenue, new Date(), new Date());

      expect(result.commission_amount).toBe(revenue);
    });

    it('should throw error if commission_rate is missing', async () => {
      const contract = {
        commission_type: CommissionType.PERCENTAGE,
        commission_rate: null,
      } as Contract;

      await expect(
        service.calculateCommission(contract, 10_000_000, new Date(), new Date()),
      ).rejects.toThrow('Commission rate is required for PERCENTAGE type');
    });
  });

  describe('calculateCommission - FIXED type', () => {
    it('should calculate fixed commission for full month', async () => {
      const contract = {
        commission_type: CommissionType.FIXED,
        commission_fixed_amount: 5_000_000, // 5M UZS/month
        commission_fixed_period: 'monthly',
      } as Contract;

      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-30'); // 30 days

      const result = await service.calculateCommission(
        contract,
        0, // Revenue doesn't matter for fixed
        periodStart,
        periodEnd,
      );

      // 30 days = full month
      expect(result.commission_amount).toBe(5_000_000);
    });

    it('should prorate fixed commission for partial month', async () => {
      const contract = {
        commission_type: CommissionType.FIXED,
        commission_fixed_amount: 6_000_000, // 6M UZS/month
        commission_fixed_period: 'monthly',
      } as Contract;

      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-15'); // 15 days

      const result = await service.calculateCommission(contract, 0, periodStart, periodEnd);

      // 15 days = half month: 6,000,000 * (15/30) = 3,000,000
      expect(result.commission_amount).toBe(3_000_000);
    });

    it('should calculate weekly fixed commission', async () => {
      const contract = {
        commission_type: CommissionType.FIXED,
        commission_fixed_amount: 1_400_000, // 1.4M UZS/week
        commission_fixed_period: 'weekly',
      } as Contract;

      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-07'); // 7 days

      const result = await service.calculateCommission(contract, 0, periodStart, periodEnd);

      expect(result.commission_amount).toBe(1_400_000);
    });

    it('should throw error if fixed amount is missing', async () => {
      const contract = {
        commission_type: CommissionType.FIXED,
        commission_fixed_amount: null,
        commission_fixed_period: 'monthly',
      } as Contract;

      await expect(
        service.calculateCommission(contract, 0, new Date(), new Date()),
      ).rejects.toThrow('Fixed amount is required for FIXED type');
    });
  });

  describe('calculateCommission - TIERED type', () => {
    it('should calculate tiered commission correctly', async () => {
      const contract = {
        commission_type: CommissionType.TIERED,
        commission_tiers: [
          { from: 0, to: 10_000_000, rate: 10 }, // 0-10M: 10%
          { from: 10_000_000, to: 50_000_000, rate: 12 }, // 10-50M: 12%
          { from: 50_000_000, to: null, rate: 15 }, // 50M+: 15%
        ],
      } as Contract;

      const revenue = 60_000_000; // 60M UZS

      const result = await service.calculateCommission(contract, revenue, new Date(), new Date());

      // Tier 1: 10M * 10% = 1M
      // Tier 2: 40M * 12% = 4.8M
      // Tier 3: 10M * 15% = 1.5M
      // Total: 7.3M
      expect(result.commission_amount).toBe(7_300_000);
      expect(result.calculation_details.tiers).toHaveLength(3);
    });

    it('should handle revenue within first tier only', async () => {
      const contract = {
        commission_type: CommissionType.TIERED,
        commission_tiers: [
          { from: 0, to: 10_000_000, rate: 10 },
          { from: 10_000_000, to: null, rate: 15 },
        ],
      } as Contract;

      const revenue = 5_000_000; // Only first tier

      const result = await service.calculateCommission(contract, revenue, new Date(), new Date());

      // 5M * 10% = 500K
      expect(result.commission_amount).toBe(500_000);
      expect(result.calculation_details.tiers).toHaveLength(1);
    });

    it('should throw error if tiers are missing', async () => {
      const contract = {
        commission_type: CommissionType.TIERED,
        commission_tiers: null,
      } as Contract;

      await expect(
        service.calculateCommission(contract, 10_000_000, new Date(), new Date()),
      ).rejects.toThrow('Commission tiers are required for TIERED type');
    });
  });

  describe('calculateCommission - HYBRID type', () => {
    it('should calculate hybrid commission correctly', async () => {
      const contract = {
        commission_type: CommissionType.HYBRID,
        commission_hybrid_fixed: 1_000_000, // 1M UZS/month
        commission_hybrid_rate: 5, // 5%
      } as Contract;

      const revenue = 20_000_000; // 20M UZS
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-30'); // 30 days = full month

      const result = await service.calculateCommission(contract, revenue, periodStart, periodEnd);

      // Fixed: 1M (full month)
      // Percentage: 20M * 5% = 1M
      // Total: 2M
      expect(result.commission_amount).toBe(2_000_000);
    });

    it('should prorate fixed part in hybrid commission', async () => {
      const contract = {
        commission_type: CommissionType.HYBRID,
        commission_hybrid_fixed: 3_000_000, // 3M UZS/month
        commission_hybrid_rate: 10, // 10%
      } as Contract;

      const revenue = 10_000_000;
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-15'); // 15 days = half month

      const result = await service.calculateCommission(contract, revenue, periodStart, periodEnd);

      // Fixed: 3M * (15/30) = 1.5M
      // Percentage: 10M * 10% = 1M
      // Total: 2.5M
      expect(result.commission_amount).toBe(2_500_000);
    });

    it('should throw error if hybrid fixed is missing', async () => {
      const contract = {
        commission_type: CommissionType.HYBRID,
        commission_hybrid_fixed: null,
        commission_hybrid_rate: 5,
      } as Contract;

      await expect(
        service.calculateCommission(contract, 10_000_000, new Date(), new Date()),
      ).rejects.toThrow('Fixed amount is required for HYBRID type');
    });

    it('should throw error if hybrid rate is missing', async () => {
      const contract = {
        commission_type: CommissionType.HYBRID,
        commission_hybrid_fixed: 1_000_000,
        commission_hybrid_rate: null,
      } as Contract;

      await expect(
        service.calculateCommission(contract, 10_000_000, new Date(), new Date()),
      ).rejects.toThrow('Commission rate is required for HYBRID type');
    });
  });

  describe('Edge cases', () => {
    it('should reject negative revenue', async () => {
      const contract = {
        commission_type: CommissionType.PERCENTAGE,
        commission_rate: 15,
      } as Contract;

      await expect(
        service.calculateCommission(contract, -1000, new Date(), new Date()),
      ).rejects.toThrow('Revenue cannot be negative');
    });

    it('should round commission to 2 decimal places', async () => {
      const contract = {
        commission_type: CommissionType.PERCENTAGE,
        commission_rate: 15.5555, // Unusual rate
      } as Contract;

      const revenue = 1000;

      const result = await service.calculateCommission(contract, revenue, new Date(), new Date());

      // Should be rounded to 2 decimals
      expect(Number.isInteger(result.commission_amount * 100)).toBe(true);
    });
  });

  describe('Real-world scenarios', () => {
    it('should calculate commission for typical location owner contract', async () => {
      // Location owner gets 20% of revenue
      const contract = {
        commission_type: CommissionType.PERCENTAGE,
        commission_rate: 20,
      } as Contract;

      const monthlyRevenue = 25_000_000; // 25M UZS/month
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-31');

      const result = await service.calculateCommission(
        contract,
        monthlyRevenue,
        periodStart,
        periodEnd,
      );

      // Commission: 25M * 20% = 5M UZS
      expect(result.commission_amount).toBe(5_000_000);
    });

    it('should calculate commission for tiered supplier contract', async () => {
      // Supplier gets progressive rates based on purchase volume
      const contract = {
        commission_type: CommissionType.TIERED,
        commission_tiers: [
          { from: 0, to: 5_000_000, rate: 2 }, // Small orders: 2%
          { from: 5_000_000, to: 20_000_000, rate: 3.5 }, // Medium: 3.5%
          { from: 20_000_000, to: null, rate: 5 }, // Large: 5%
        ],
      } as Contract;

      const monthlyPurchases = 30_000_000; // 30M UZS

      const result = await service.calculateCommission(
        contract,
        monthlyPurchases,
        new Date(),
        new Date(),
      );

      // Tier 1: 5M * 2% = 100K
      // Tier 2: 15M * 3.5% = 525K
      // Tier 3: 10M * 5% = 500K
      // Total: 1,125,000 UZS
      expect(result.commission_amount).toBe(1_125_000);
    });
  });

  describe('createCalculationRecord', () => {
    const mockContract = {
      id: 'contract-123',
      contract_number: 'CONTRACT-001',
      payment_term_days: 30,
      commission_type: CommissionType.PERCENTAGE,
      commission_rate: 15,
    };

    const mockCalculationResult = {
      total_revenue: 10_000_000,
      transaction_count: 150,
      commission_amount: 1_500_000,
      commission_type: 'percentage',
      calculation_details: { rate: 15 },
    };

    const mockSavedCalculation = {
      id: 'calc-123',
      contract_id: 'contract-123',
      period_start: new Date('2025-01-01'),
      period_end: new Date('2025-01-31'),
      total_revenue: 10_000_000,
      transaction_count: 150,
      commission_amount: 1_500_000,
      commission_type: 'percentage',
      calculation_details: { rate: 15 },
      payment_status: PaymentStatus.PENDING,
      payment_due_date: new Date('2025-03-02'), // 30 days after period_end
    };

    it('should create and save commission calculation record', async () => {
      // Arrange
      mockContractRepository.findOne.mockResolvedValue(mockContract);
      mockCalculationRepository.create.mockReturnValue(mockSavedCalculation);
      mockCalculationRepository.save.mockResolvedValue(mockSavedCalculation);

      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-31');

      // Act
      const result = await service.createCalculationRecord(
        mockContract.id,
        periodStart,
        periodEnd,
        10_000_000,
        150,
        mockCalculationResult,
        'user-123',
      );

      // Assert
      expect(result).toEqual(mockSavedCalculation);
      expect(mockContractRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockContract.id },
      });
      expect(mockCalculationRepository.create).toHaveBeenCalled();
      expect(mockCalculationRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when contract not found', async () => {
      // Arrange
      mockContractRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createCalculationRecord(
          'non-existent-contract',
          new Date(),
          new Date(),
          10_000_000,
          150,
          mockCalculationResult,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate payment due date based on payment_term_days', async () => {
      // Arrange
      mockContractRepository.findOne.mockResolvedValue(mockContract);
      mockCalculationRepository.create.mockImplementation((data) => data);
      mockCalculationRepository.save.mockImplementation((data) => Promise.resolve(data));

      const periodEnd = new Date('2025-01-31');

      // Act
      const result = await service.createCalculationRecord(
        mockContract.id,
        new Date('2025-01-01'),
        periodEnd,
        10_000_000,
        150,
        mockCalculationResult,
      );

      // Assert - payment_due_date should be 30 days after period_end
      const expectedDueDate = new Date(periodEnd);
      expectedDueDate.setDate(expectedDueDate.getDate() + 30);
      expect(result.payment_due_date!.getTime()).toBeCloseTo(expectedDueDate.getTime(), -4);
    });
  });

  describe('getCalculationsForContract', () => {
    const mockCalculations = [
      {
        id: 'calc-1',
        contract_id: 'contract-123',
        period_start: new Date('2025-02-01'),
        period_end: new Date('2025-02-28'),
        commission_amount: 2_000_000,
      },
      {
        id: 'calc-2',
        contract_id: 'contract-123',
        period_start: new Date('2025-01-01'),
        period_end: new Date('2025-01-31'),
        commission_amount: 1_500_000,
      },
    ];

    it('should return all calculations for a contract', async () => {
      // Arrange
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(mockCalculations);

      // Act
      const result = await service.getCalculationsForContract('contract-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(mockCalculationRepository.createQueryBuilder).toHaveBeenCalledWith('calc');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('calc.contract_id = :contractId', {
        contractId: 'contract-123',
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('calc.period_start', 'DESC');
    });

    it('should filter by date range when provided', async () => {
      // Arrange
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([mockCalculations[1]]);

      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-31');

      // Act
      const result = await service.getCalculationsForContract(
        'contract-123',
        periodStart,
        periodEnd,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('markAsPaid', () => {
    const mockCalculation = {
      id: 'calc-123',
      contract_id: 'contract-123',
      commission_amount: 1_500_000,
      payment_status: PaymentStatus.PENDING,
      payment_date: null,
      payment_transaction_id: null,
    };

    it('should mark calculation as paid with transaction ID', async () => {
      // Arrange
      mockCalculationRepository.findOne.mockResolvedValue({ ...mockCalculation });
      mockCalculationRepository.save.mockImplementation((data) => Promise.resolve(data));

      const paymentDate = new Date('2025-02-15');
      const transactionId = 'txn-123';

      // Act
      const result = await service.markAsPaid('calc-123', transactionId, paymentDate);

      // Assert
      expect(result.payment_status).toBe(PaymentStatus.PAID);
      expect(result.payment_date).toEqual(paymentDate);
      expect(result.payment_transaction_id).toBe(transactionId);
    });

    it('should use current date when paymentDate not provided', async () => {
      // Arrange
      mockCalculationRepository.findOne.mockResolvedValue({ ...mockCalculation });
      mockCalculationRepository.save.mockImplementation((data) => Promise.resolve(data));

      // Act
      const result = await service.markAsPaid('calc-123', 'txn-123');

      // Assert
      expect(result.payment_status).toBe(PaymentStatus.PAID);
      expect(result.payment_date).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException when calculation not found', async () => {
      // Arrange
      mockCalculationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.markAsPaid('non-existent', 'txn-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Unknown commission type', () => {
    it('should throw BadRequestException for unknown commission type', async () => {
      // Arrange
      const contract = {
        commission_type: 'unknown_type' as CommissionType,
      } as Contract;

      // Act & Assert
      await expect(
        service.calculateCommission(contract, 10_000_000, new Date(), new Date()),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.calculateCommission(contract, 10_000_000, new Date(), new Date()),
      ).rejects.toThrow(/Unknown commission type/);
    });
  });

  describe('FIXED type additional tests', () => {
    it('should calculate daily fixed commission', async () => {
      const contract = {
        commission_type: CommissionType.FIXED,
        commission_fixed_amount: 200_000, // 200K UZS/day
        commission_fixed_period: 'daily',
      } as Contract;

      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-01'); // Single day

      const result = await service.calculateCommission(contract, 0, periodStart, periodEnd);

      expect(result.commission_amount).toBe(200_000);
    });

    it('should calculate quarterly fixed commission', async () => {
      const contract = {
        commission_type: CommissionType.FIXED,
        commission_fixed_amount: 15_000_000, // 15M UZS/quarter
        commission_fixed_period: 'quarterly',
      } as Contract;

      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-03-31'); // 90 days

      const result = await service.calculateCommission(contract, 0, periodStart, periodEnd);

      expect(result.commission_amount).toBe(15_000_000);
    });

    it('should throw error for negative fixed amount', async () => {
      const contract = {
        commission_type: CommissionType.FIXED,
        commission_fixed_amount: -1000,
        commission_fixed_period: 'monthly',
      } as Contract;

      await expect(
        service.calculateCommission(contract, 0, new Date(), new Date()),
      ).rejects.toThrow('Fixed amount cannot be negative');
    });

    it('should throw error when fixed period is missing', async () => {
      const contract = {
        commission_type: CommissionType.FIXED,
        commission_fixed_amount: 5_000_000,
        commission_fixed_period: null,
      } as Contract;

      await expect(
        service.calculateCommission(contract, 0, new Date(), new Date()),
      ).rejects.toThrow('Fixed period is required for FIXED type');
    });
  });

  describe('PERCENTAGE type additional tests', () => {
    it('should throw error for rate above 100%', async () => {
      const contract = {
        commission_type: CommissionType.PERCENTAGE,
        commission_rate: 150, // Invalid - above 100%
      } as Contract;

      await expect(
        service.calculateCommission(contract, 10_000_000, new Date(), new Date()),
      ).rejects.toThrow('Commission rate must be between 0 and 100');
    });

    it('should throw error for negative rate', async () => {
      const contract = {
        commission_type: CommissionType.PERCENTAGE,
        commission_rate: -5, // Invalid - negative
      } as Contract;

      await expect(
        service.calculateCommission(contract, 10_000_000, new Date(), new Date()),
      ).rejects.toThrow('Commission rate must be between 0 and 100');
    });
  });

  describe('TIERED type additional tests', () => {
    it('should handle zero revenue correctly', async () => {
      const contract = {
        commission_type: CommissionType.TIERED,
        commission_tiers: [
          { from: 0, to: 10_000_000, rate: 10 },
          { from: 10_000_000, to: null, rate: 15 },
        ],
      } as Contract;

      const result = await service.calculateCommission(contract, 0, new Date(), new Date());

      expect(result.commission_amount).toBe(0);
    });

    it('should handle unsorted tiers correctly', async () => {
      const contract = {
        commission_type: CommissionType.TIERED,
        commission_tiers: [
          { from: 50_000_000, to: null, rate: 15 }, // Out of order
          { from: 0, to: 10_000_000, rate: 10 },
          { from: 10_000_000, to: 50_000_000, rate: 12 },
        ],
      } as Contract;

      const revenue = 25_000_000; // 25M UZS

      const result = await service.calculateCommission(contract, revenue, new Date(), new Date());

      // Should sort tiers first, then calculate:
      // Tier 1: 10M * 10% = 1M
      // Tier 2: 15M * 12% = 1.8M
      // Total: 2.8M
      expect(result.commission_amount).toBe(2_800_000);
    });
  });
});
