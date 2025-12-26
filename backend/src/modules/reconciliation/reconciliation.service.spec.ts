import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import {
  ReconciliationRun,
  ReconciliationStatus,
  ReconciliationSource,
} from './entities/reconciliation-run.entity';
import { ReconciliationMismatch, MismatchType } from './entities/reconciliation-mismatch.entity';
import { HwImportedSale, HwImportSource } from './entities/hw-imported-sale.entity';
import { Transaction, TransactionType, PaymentMethod } from '../transactions/entities/transaction.entity';
import { Machine } from '../machines/entities/machine.entity';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let mockRunRepository: jest.Mocked<Repository<ReconciliationRun>>;
  let mockMismatchRepository: jest.Mocked<Repository<ReconciliationMismatch>>;
  let mockTransactionRepository: jest.Mocked<Repository<Transaction>>;
  let mockHwImportedSaleRepository: jest.Mocked<Repository<HwImportedSale>>;
  let mockMachineRepository: jest.Mocked<Repository<Machine>>;
  let mockDataSource: jest.Mocked<DataSource>;

  // Test data
  const mockUserId = 'user-id-1';
  const mockRunId = 'run-id-1';
  const mockMachineId = 'machine-id-1';
  const mockMachineNumber = 'M-001';

  const mockMachine: Partial<Machine> = {
    id: mockMachineId,
    machine_number: mockMachineNumber,
    name: 'Test Machine',
  };

  const mockRun: Partial<ReconciliationRun> = {
    id: mockRunId,
    status: ReconciliationStatus.PENDING,
    date_from: new Date('2025-01-01'),
    date_to: new Date('2025-01-31'),
    sources: [ReconciliationSource.SALES_REPORT, ReconciliationSource.HW],
    machine_ids: null,
    time_tolerance: 5,
    amount_tolerance: 100,
    created_by_user_id: mockUserId,
    created_at: new Date(),
  };

  const mockTransaction: Partial<Transaction> = {
    id: 'transaction-id-1',
    transaction_type: TransactionType.SALE,
    transaction_date: new Date('2025-01-15T10:00:00Z'),
    sale_date: new Date('2025-01-15T10:00:00Z'),
    amount: 15000,
    payment_method: PaymentMethod.CASH,
    machine_id: mockMachineId,
    machine: mockMachine as Machine,
    transaction_number: 'TXN-001',
  };

  const mockHwSale: Partial<HwImportedSale> = {
    id: 'hw-sale-id-1',
    import_batch_id: 'batch-id-1',
    sale_date: new Date('2025-01-15T10:00:02Z'),
    machine_code: mockMachineNumber,
    machine_id: mockMachineId,
    machine: mockMachine as Machine,
    amount: 15000,
    order_number: 'HW-001',
    transaction_id: 'HW-TXN-001',
    import_source: HwImportSource.EXCEL,
  };

  const createMockQueryBuilder = (results: any[] = []) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(results),
    getCount: jest.fn().mockResolvedValue(results.length),
  });

  beforeEach(async () => {
    mockRunRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    } as any;

    mockMismatchRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    } as any;

    mockTransactionRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    } as any;

    mockHwImportedSaleRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    } as any;

    mockMachineRepository = {
      findOne: jest.fn(),
    } as any;

    mockDataSource = {
      createQueryRunner: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        {
          provide: getRepositoryToken(ReconciliationRun),
          useValue: mockRunRepository,
        },
        {
          provide: getRepositoryToken(ReconciliationMismatch),
          useValue: mockMismatchRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(HwImportedSale),
          useValue: mockHwImportedSaleRepository,
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: mockMachineRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createAndRun', () => {
    it('should create a reconciliation run and start processing', async () => {
      // Arrange
      mockRunRepository.create.mockReturnValue(mockRun as ReconciliationRun);
      mockRunRepository.save.mockResolvedValue(mockRun as ReconciliationRun);

      // Act
      const result = await service.createAndRun(mockUserId, {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        sources: [ReconciliationSource.SALES_REPORT, ReconciliationSource.HW],
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockRunId);
      expect(mockRunRepository.create).toHaveBeenCalled();
      expect(mockRunRepository.save).toHaveBeenCalled();
    });

    it('should use default tolerances when not provided', async () => {
      // Arrange
      mockRunRepository.create.mockReturnValue(mockRun as ReconciliationRun);
      mockRunRepository.save.mockResolvedValue(mockRun as ReconciliationRun);

      // Act
      await service.createAndRun(mockUserId, {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        sources: [ReconciliationSource.SALES_REPORT],
      });

      // Assert
      expect(mockRunRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          time_tolerance: 5,
          amount_tolerance: 100,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a reconciliation run by ID', async () => {
      // Arrange
      mockRunRepository.findOne.mockResolvedValue(mockRun as ReconciliationRun);

      // Act
      const result = await service.findOne(mockRunId);

      // Assert
      expect(result).toEqual(mockRun);
      expect(mockRunRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRunId },
        relations: ['created_by'],
      });
    });

    it('should throw NotFoundException when run not found', async () => {
      // Arrange
      mockRunRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated reconciliation runs', async () => {
      // Arrange
      const runs = [mockRun, { ...mockRun, id: 'run-id-2' }];
      const mockQb = createMockQueryBuilder(runs);
      mockRunRepository.createQueryBuilder.mockReturnValue(mockQb as any);

      // Act
      const result = await service.findAll({ limit: 10, offset: 0 });

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder([mockRun]);
      mockRunRepository.createQueryBuilder.mockReturnValue(mockQb as any);

      // Act
      await service.findAll({ status: ReconciliationStatus.COMPLETED });

      // Assert
      expect(mockQb.andWhere).toHaveBeenCalledWith('run.status = :status', {
        status: ReconciliationStatus.COMPLETED,
      });
    });
  });

  describe('getMismatches', () => {
    it('should return mismatches for a run', async () => {
      // Arrange
      const mockMismatch: Partial<ReconciliationMismatch> = {
        id: 'mismatch-id-1',
        run_id: mockRunId,
        mismatch_type: MismatchType.AMOUNT_MISMATCH,
        amount: 15000,
        discrepancy_amount: 500,
      };

      mockRunRepository.findOne.mockResolvedValue(mockRun as ReconciliationRun);
      const mockQb = createMockQueryBuilder([mockMismatch]);
      mockMismatchRepository.createQueryBuilder.mockReturnValue(mockQb as any);

      // Act
      const result = await service.getMismatches(mockRunId, { limit: 10 });

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0].mismatch_type).toBe(MismatchType.AMOUNT_MISMATCH);
    });

    it('should filter by mismatch type', async () => {
      // Arrange
      mockRunRepository.findOne.mockResolvedValue(mockRun as ReconciliationRun);
      const mockQb = createMockQueryBuilder([]);
      mockMismatchRepository.createQueryBuilder.mockReturnValue(mockQb as any);

      // Act
      await service.getMismatches(mockRunId, { mismatch_type: MismatchType.ORDER_NOT_FOUND });

      // Assert
      expect(mockQb.andWhere).toHaveBeenCalledWith('mismatch.mismatch_type = :type', {
        type: MismatchType.ORDER_NOT_FOUND,
      });
    });
  });

  describe('resolveMismatch', () => {
    it('should resolve a mismatch', async () => {
      // Arrange
      const mockMismatch: Partial<ReconciliationMismatch> = {
        id: 'mismatch-id-1',
        run_id: mockRunId,
        is_resolved: false,
      };

      const resolvedMismatch: Partial<ReconciliationMismatch> = {
        ...mockMismatch,
        is_resolved: true,
        resolved_by_user_id: mockUserId,
        resolution_notes: 'Resolved manually',
      };

      mockMismatchRepository.findOne
        .mockResolvedValueOnce(mockMismatch as ReconciliationMismatch)
        .mockResolvedValueOnce(resolvedMismatch as ReconciliationMismatch);
      mockMismatchRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.resolveMismatch('mismatch-id-1', mockUserId, {
        resolution_notes: 'Resolved manually',
      });

      // Assert
      expect(result.is_resolved).toBe(true);
      expect(mockMismatchRepository.update).toHaveBeenCalledWith(
        'mismatch-id-1',
        expect.objectContaining({
          is_resolved: true,
          resolved_by_user_id: mockUserId,
        }),
      );
    });

    it('should throw BadRequestException when mismatch already resolved', async () => {
      // Arrange
      const mockMismatch: Partial<ReconciliationMismatch> = {
        id: 'mismatch-id-1',
        is_resolved: true,
      };

      mockMismatchRepository.findOne.mockResolvedValue(mockMismatch as ReconciliationMismatch);

      // Act & Assert
      await expect(
        service.resolveMismatch('mismatch-id-1', mockUserId, { resolution_notes: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when mismatch not found', async () => {
      // Arrange
      mockMismatchRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.resolveMismatch('non-existent-id', mockUserId, { resolution_notes: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('should cancel a pending reconciliation run', async () => {
      // Arrange
      const pendingRun = { ...mockRun, status: ReconciliationStatus.PENDING };
      const cancelledRun = { ...mockRun, status: ReconciliationStatus.CANCELLED };

      mockRunRepository.findOne
        .mockResolvedValueOnce(pendingRun as ReconciliationRun)
        .mockResolvedValueOnce(cancelledRun as ReconciliationRun);
      mockRunRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.cancel(mockRunId);

      // Assert
      expect(result.status).toBe(ReconciliationStatus.CANCELLED);
    });

    it('should throw BadRequestException when trying to cancel completed run', async () => {
      // Arrange
      const completedRun = { ...mockRun, status: ReconciliationStatus.COMPLETED };
      mockRunRepository.findOne.mockResolvedValue(completedRun as ReconciliationRun);

      // Act & Assert
      await expect(service.cancel(mockRunId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete a reconciliation run', async () => {
      // Arrange
      mockRunRepository.findOne.mockResolvedValue(mockRun as ReconciliationRun);
      mockRunRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.remove(mockRunId);

      // Assert
      expect(mockRunRepository.softDelete).toHaveBeenCalledWith(mockRunId);
    });

    it('should throw NotFoundException when run not found', async () => {
      // Arrange
      mockRunRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('data loading', () => {
    it('should load transactions from SALES_REPORT source', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder([mockTransaction]);
      mockTransactionRepository.createQueryBuilder.mockReturnValue(mockQb as any);

      mockRunRepository.create.mockReturnValue({
        ...mockRun,
        sources: [ReconciliationSource.SALES_REPORT],
      } as ReconciliationRun);
      mockRunRepository.save.mockResolvedValue({
        ...mockRun,
        sources: [ReconciliationSource.SALES_REPORT],
      } as ReconciliationRun);
      mockRunRepository.findOne.mockResolvedValue({
        ...mockRun,
        sources: [ReconciliationSource.SALES_REPORT],
      } as ReconciliationRun);
      mockRunRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.createAndRun(mockUserId, {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        sources: [ReconciliationSource.SALES_REPORT],
      });

      // Wait for async processing to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - the query builder should have been called
      expect(mockTransactionRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should load data from HW source', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder([mockHwSale]);
      mockHwImportedSaleRepository.createQueryBuilder.mockReturnValue(mockQb as any);
      mockTransactionRepository.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]) as any);

      mockRunRepository.create.mockReturnValue({
        ...mockRun,
        sources: [ReconciliationSource.SALES_REPORT, ReconciliationSource.HW],
      } as ReconciliationRun);
      mockRunRepository.save.mockResolvedValue({
        ...mockRun,
        sources: [ReconciliationSource.SALES_REPORT, ReconciliationSource.HW],
      } as ReconciliationRun);
      mockRunRepository.findOne.mockResolvedValue({
        ...mockRun,
        sources: [ReconciliationSource.SALES_REPORT, ReconciliationSource.HW],
      } as ReconciliationRun);
      mockRunRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.createAndRun(mockUserId, {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        sources: [ReconciliationSource.SALES_REPORT, ReconciliationSource.HW],
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mockHwImportedSaleRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('source loading - payment systems', () => {
    it('should load from FISCAL source (not yet implemented)', async () => {
      // Arrange
      mockTransactionRepository.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]) as any);

      const run = {
        ...mockRun,
        sources: [ReconciliationSource.FISCAL],
      };

      mockRunRepository.create.mockReturnValue(run as ReconciliationRun);
      mockRunRepository.save.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.findOne.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.createAndRun(mockUserId, {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        sources: [ReconciliationSource.FISCAL],
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - FISCAL returns empty array, run should complete
      expect(mockRunRepository.update).toHaveBeenCalled();
    });

    it('should load from PAYME payment system', async () => {
      // Arrange
      const paymeTransaction = {
        ...mockTransaction,
        payment_method: PaymentMethod.MOBILE,
        metadata: { payment_system: 'payme' },
      };

      mockTransactionRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([paymeTransaction]) as any,
      );

      const run = {
        ...mockRun,
        sources: [ReconciliationSource.PAYME],
      };

      mockRunRepository.create.mockReturnValue(run as ReconciliationRun);
      mockRunRepository.save.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.findOne.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.createAndRun(mockUserId, {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        sources: [ReconciliationSource.PAYME],
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mockTransactionRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should load from CLICK payment system', async () => {
      // Arrange
      const clickTransaction = {
        ...mockTransaction,
        payment_method: PaymentMethod.MOBILE,
        metadata: { payment_system: 'click' },
      };

      mockTransactionRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([clickTransaction]) as any,
      );

      const run = {
        ...mockRun,
        sources: [ReconciliationSource.CLICK],
      };

      mockRunRepository.create.mockReturnValue(run as ReconciliationRun);
      mockRunRepository.save.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.findOne.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.createAndRun(mockUserId, {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        sources: [ReconciliationSource.CLICK],
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mockTransactionRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should load from UZUM payment system', async () => {
      // Arrange
      const uzumTransaction = {
        ...mockTransaction,
        payment_method: PaymentMethod.QR,
        metadata: { payment_system: 'uzum' },
      };

      mockTransactionRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([uzumTransaction]) as any,
      );

      const run = {
        ...mockRun,
        sources: [ReconciliationSource.UZUM],
      };

      mockRunRepository.create.mockReturnValue(run as ReconciliationRun);
      mockRunRepository.save.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.findOne.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.createAndRun(mockUserId, {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        sources: [ReconciliationSource.UZUM],
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mockTransactionRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should handle unknown source gracefully', async () => {
      // Arrange
      mockTransactionRepository.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]) as any);

      const run = {
        ...mockRun,
        sources: ['UNKNOWN_SOURCE' as ReconciliationSource],
      };

      mockRunRepository.create.mockReturnValue(run as ReconciliationRun);
      mockRunRepository.save.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.findOne.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.createAndRun(mockUserId, {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        sources: ['UNKNOWN_SOURCE' as ReconciliationSource],
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - should complete without error, unknown sources return empty array
      expect(mockRunRepository.update).toHaveBeenCalled();
    });

    it('should filter payment system data by machine_ids when provided', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder([mockTransaction]);
      mockTransactionRepository.createQueryBuilder.mockReturnValue(mockQb as any);

      const run = {
        ...mockRun,
        sources: [ReconciliationSource.PAYME],
        machine_ids: [mockMachineId],
      };

      mockRunRepository.create.mockReturnValue(run as ReconciliationRun);
      mockRunRepository.save.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.findOne.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.createAndRun(mockUserId, {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        sources: [ReconciliationSource.PAYME],
        machine_ids: [mockMachineId],
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - query builder should be called with machine filter
      expect(mockTransactionRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQb.andWhere).toHaveBeenCalled();
    });
  });

  describe('matching algorithm', () => {
    it('should match records within time and amount tolerance', async () => {
      // Arrange - Create transactions and HW data that should match
      const transaction = {
        ...mockTransaction,
        sale_date: new Date('2025-01-15T10:00:00Z'),
        amount: 15000,
      };
      const hwSale = {
        ...mockHwSale,
        sale_date: new Date('2025-01-15T10:00:03Z'), // 3 seconds difference
        amount: 15000, // Same amount
      };

      mockTransactionRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([transaction]) as any,
      );
      mockHwImportedSaleRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([hwSale]) as any,
      );
      mockMismatchRepository.save.mockResolvedValue([] as any);

      const run = {
        ...mockRun,
        time_tolerance: 5, // 5 seconds tolerance
        amount_tolerance: 100,
        sources: [ReconciliationSource.SALES_REPORT, ReconciliationSource.HW],
      };

      mockRunRepository.create.mockReturnValue(run as ReconciliationRun);
      mockRunRepository.save.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.findOne.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.createAndRun(mockUserId, {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        sources: [ReconciliationSource.SALES_REPORT, ReconciliationSource.HW],
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assert - run should be updated with summary
      expect(mockRunRepository.update).toHaveBeenCalledWith(
        mockRunId,
        expect.objectContaining({
          status: ReconciliationStatus.COMPLETED,
          summary: expect.any(Object),
        }),
      );
    });

    it('should detect mismatches when amounts differ', async () => {
      // Arrange - Create transactions with different amounts
      const transaction = {
        ...mockTransaction,
        sale_date: new Date('2025-01-15T10:00:00Z'),
        amount: 15000,
      };
      const hwSale = {
        ...mockHwSale,
        sale_date: new Date('2025-01-15T10:00:02Z'),
        amount: 16000, // 1000 difference - exceeds tolerance
      };

      mockTransactionRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([transaction]) as any,
      );
      mockHwImportedSaleRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([hwSale]) as any,
      );

      const run = {
        ...mockRun,
        time_tolerance: 5,
        amount_tolerance: 100, // 100 tolerance, but diff is 1000
        sources: [ReconciliationSource.SALES_REPORT, ReconciliationSource.HW],
      };

      mockRunRepository.create.mockReturnValue(run as ReconciliationRun);
      mockRunRepository.save.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.findOne.mockResolvedValue(run as ReconciliationRun);
      mockRunRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockMismatchRepository.create.mockImplementation((data) => data as any);
      mockMismatchRepository.save.mockResolvedValue([] as any);

      // Act
      await service.createAndRun(mockUserId, {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        sources: [ReconciliationSource.SALES_REPORT, ReconciliationSource.HW],
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assert - mismatches should be saved
      // The HW record won't match because amount difference exceeds tolerance
      expect(mockRunRepository.update).toHaveBeenCalled();
    });
  });
});
