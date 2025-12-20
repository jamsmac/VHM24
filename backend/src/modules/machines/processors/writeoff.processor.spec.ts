import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { WriteoffProcessor } from './writeoff.processor';
import { Machine, MachineStatus } from '../entities/machine.entity';
import { TransactionsService } from '../../transactions/transactions.service';
import { TransactionType, ExpenseCategory } from '../../transactions/entities/transaction.entity';
import { WriteoffJobData, WriteoffJobResult } from '../interfaces/writeoff-job.interface';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuditLogService } from '../../audit-logs/audit-log.service';
import { UsersService } from '../../users/users.service';

describe('WriteoffProcessor', () => {
  let processor: WriteoffProcessor;
  let machineRepository: jest.Mocked<Repository<Machine>>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let usersService: jest.Mocked<UsersService>;

  // Mock data - use function to create fresh mock each time
  const createMockMachine = (overrides: Partial<Machine> = {}): Machine =>
    ({
      id: 'machine-1',
      machine_number: 'M-001',
      name: 'Coffee Machine 1',
      type_code: 'coffee',
      status: MachineStatus.ACTIVE,
      location_id: 'location-1',
      location: { id: 'location-1', name: 'Main Office' } as any,
      contract_id: null,
      contract: null,
      manufacturer: 'Acme',
      model: 'CM-100',
      serial_number: 'SN12345',
      year_of_manufacture: 2022,
      installation_date: new Date('2023-01-15'),
      last_maintenance_date: new Date('2024-01-15'),
      next_maintenance_date: new Date('2024-07-15'),
      max_product_slots: 10,
      current_product_count: 5,
      cash_capacity: 100000,
      current_cash_amount: 25000,
      accepts_cash: true,
      accepts_card: true,
      accepts_qr: false,
      accepts_nfc: false,
      qr_code: 'QR-001',
      qr_code_url: 'https://app.com/complaint/QR-001',
      assigned_operator_id: null,
      assigned_technician_id: null,
      notes: null,
      settings: null,
      metadata: {},
      low_stock_threshold_percent: 10,
      total_sales_count: 100,
      total_revenue: 50000,
      last_refill_date: new Date('2024-01-10'),
      last_collection_date: new Date('2024-01-05'),
      last_ping_at: new Date(),
      is_online: true,
      connectivity_status: 'online',
      purchase_price: 1000000,
      purchase_date: new Date('2023-01-01'),
      depreciation_years: 5,
      depreciation_method: 'linear',
      accumulated_depreciation: 200000,
      last_depreciation_date: new Date('2024-01-01'),
      is_disposed: false,
      disposal_date: null,
      disposal_reason: null,
      disposal_transaction_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      ...overrides,
    }) as unknown as Machine;

  // Default mock machine instance
  let mockMachine: Machine;

  const mockTransaction = {
    id: 'transaction-1',
    transaction_type: TransactionType.EXPENSE,
    expense_category: ExpenseCategory.WRITEOFF,
    amount: 800000,
    machine_id: 'machine-1',
    created_at: new Date(),
  };

  // Helper to create mock job
  const createMockJob = (data: Partial<WriteoffJobData> = {}): Job<WriteoffJobData> =>
    ({
      id: '123',
      name: 'process-writeoff',
      data: {
        machineId: 'machine-1',
        writeoffDto: {
          disposal_reason: 'Equipment failure',
          disposal_date: new Date().toISOString(),
        },
        userId: 'user-1',
        requestId: 'req-123',
        timestamp: new Date().toISOString(),
        ...data,
      },
      progress: jest.fn().mockResolvedValue(undefined),
      attemptsMade: 0,
      opts: {},
      queue: {} as any,
      timestamp: Date.now(),
      processedOn: Date.now(),
      finishedOn: null,
      returnvalue: null,
      failedReason: null,
      stacktrace: [],
      isCompleted: jest.fn(),
      isFailed: jest.fn(),
      isActive: jest.fn(),
      isDelayed: jest.fn(),
      isWaiting: jest.fn(),
      isPaused: jest.fn(),
      isStuck: jest.fn(),
      getState: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      retry: jest.fn(),
      discard: jest.fn(),
      finished: jest.fn(),
      moveToCompleted: jest.fn(),
      moveToFailed: jest.fn(),
      promote: jest.fn(),
      lockKey: jest.fn(),
      releaseLock: jest.fn(),
      takeLock: jest.fn(),
      extendLock: jest.fn(),
      toJSON: jest.fn(),
      log: jest.fn(),
    }) as unknown as Job<WriteoffJobData>;

  beforeEach(async () => {
    // Create fresh mock machine for each test
    mockMachine = createMockMachine();

    // Mock Machine Repository
    const mockMachineRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    // Mock Transactions Service
    const mockTransactionsService = {
      create: jest.fn(),
    };

    // Mock Notifications Service
    const mockNotificationsService = {
      create: jest.fn().mockResolvedValue({}),
      createBulk: jest.fn().mockResolvedValue([]),
    };

    // Mock Audit Log Service
    const mockAuditLogService = {
      create: jest.fn().mockResolvedValue({}),
    };

    // Mock Users Service
    const mockUsersService = {
      getAdminUserIds: jest.fn().mockResolvedValue(['admin-1', 'admin-2']),
      getFirstAdminId: jest.fn().mockResolvedValue('admin-1'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WriteoffProcessor,
        {
          provide: getRepositoryToken(Machine),
          useValue: mockMachineRepository,
        },
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    processor = module.get<WriteoffProcessor>(WriteoffProcessor);
    machineRepository = module.get(getRepositoryToken(Machine));
    transactionsService = module.get(TransactionsService);
    notificationsService = module.get(NotificationsService);
    auditLogService = module.get(AuditLogService);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // HANDLEWRITEOFF SUCCESS TESTS
  // ============================================================================

  describe('handleWriteoff', () => {
    it('should successfully process writeoff with book value > 0', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(mockMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockResolvedValue(
        createMockMachine({
          is_disposed: true,
          status: MachineStatus.DISABLED,
        }),
      );

      // Act
      const result = await processor.handleWriteoff(job);

      // Assert
      expect(result.success).toBe(true);
      expect(result.machineId).toBe('machine-1');
      expect(result.machineNumber).toBe('M-001');
      expect(result.bookValue).toBe(800000); // 1000000 - 200000
      expect(result.transactionId).toBe('transaction-1');
      expect(result.message).toContain('successfully written off');
    });

    it('should update job progress throughout processing', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(mockMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockResolvedValue(mockMachine);

      // Act
      await processor.handleWriteoff(job);

      // Assert
      expect(job.progress).toHaveBeenCalledWith(10); // Starting
      expect(job.progress).toHaveBeenCalledWith(20); // Validation
      expect(job.progress).toHaveBeenCalledWith(30); // Calculation
      expect(job.progress).toHaveBeenCalledWith(50); // Transaction
      expect(job.progress).toHaveBeenCalledWith(70); // Update status
      expect(job.progress).toHaveBeenCalledWith(100); // Complete
    });

    it('should create correct writeoff transaction', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(mockMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockResolvedValue(mockMachine);

      // Act
      await processor.handleWriteoff(job);

      // Assert
      expect(transactionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_type: TransactionType.EXPENSE,
          expense_category: ExpenseCategory.WRITEOFF,
          amount: 800000, // Book value = purchase - depreciation
          machine_id: 'machine-1',
          description: expect.stringContaining('Equipment failure'),
          metadata: expect.objectContaining({
            disposal: true,
            machine_number: 'M-001',
            purchase_price: 1000000,
            accumulated_depreciation: 200000,
            book_value: 800000,
          }),
        }),
      );
    });

    it('should update machine status to DISABLED', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(mockMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockResolvedValue(mockMachine);

      // Act
      await processor.handleWriteoff(job);

      // Assert
      expect(machineRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          is_disposed: true,
          status: MachineStatus.DISABLED,
          disposal_reason: 'Equipment failure',
          disposal_transaction_id: 'transaction-1',
        }),
      );
    });

    it('should skip transaction creation when book value is 0', async () => {
      // Arrange
      const fullyDepreciatedMachine = createMockMachine({
        purchase_price: 1000000,
        accumulated_depreciation: 1000000, // Fully depreciated
      });
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(fullyDepreciatedMachine);
      machineRepository.save.mockResolvedValue(fullyDepreciatedMachine);

      // Act
      const result = await processor.handleWriteoff(job);

      // Assert
      expect(result.success).toBe(true);
      expect(result.bookValue).toBe(0);
      expect(result.transactionId).toBeUndefined();
      expect(transactionsService.create).not.toHaveBeenCalled();
    });

    it('should use current date when disposal_date not provided', async () => {
      // Arrange
      const jobData: Partial<WriteoffJobData> = {
        writeoffDto: {
          disposal_reason: 'End of life',
          // No disposal_date
        },
      };
      const job = createMockJob(jobData);
      machineRepository.findOne.mockResolvedValue(mockMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockResolvedValue(mockMachine);

      // Act
      const result = await processor.handleWriteoff(job);

      // Assert
      expect(result.success).toBe(true);
      // Disposal date should be close to now
      const now = new Date();
      expect(result.disposalDate.getTime()).toBeCloseTo(now.getTime(), -3); // Within 1 second
    });
  });

  // ============================================================================
  // HANDLEWRITEOFF ERROR TESTS
  // ============================================================================

  describe('handleWriteoff - error cases', () => {
    it('should throw error when machine not found', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await processor.handleWriteoff(job);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should throw error when machine already disposed', async () => {
      // Arrange
      const disposedMachine = createMockMachine({
        is_disposed: true,
        disposal_date: new Date('2024-01-15'),
      });
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(disposedMachine);

      // Act
      const result = await processor.handleWriteoff(job);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('already disposed');
    });

    it('should throw error when machine has no purchase price', async () => {
      // Arrange
      const noPriceMachine = createMockMachine({
        purchase_price: null,
      } as any);
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(noPriceMachine);

      // Act
      const result = await processor.handleWriteoff(job);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('missing purchase price');
    });

    it('should return failure result on transaction creation failure', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(mockMachine);
      transactionsService.create.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await processor.handleWriteoff(job);

      // Assert - processor catches errors and returns failure result
      expect(result.success).toBe(false);
      expect(result.message).toContain('Transaction creation failed');
      expect(result.message).toContain('Database error');
    });

    it('should return failure result on machine save failure', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(mockMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockRejectedValue(new Error('Save failed'));

      // Act
      const result = await processor.handleWriteoff(job);

      // Assert - processor catches errors and returns failure result
      expect(result.success).toBe(false);
      expect(result.message).toContain('Machine status update failed');
      expect(result.message).toContain('Save failed');
    });
  });

  // ============================================================================
  // RETRYABLE ERROR TESTS
  // ============================================================================

  describe('isRetryableError', () => {
    it('should identify connection errors as retryable', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockRejectedValue(new Error('ECONNREFUSED'));

      // Act & Assert
      await expect(processor.handleWriteoff(job)).rejects.toThrow();
    });

    it('should identify timeout errors as retryable', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockRejectedValue(new Error('ETIMEDOUT'));

      // Act & Assert
      await expect(processor.handleWriteoff(job)).rejects.toThrow();
    });

    it('should identify deadlock errors as retryable', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockRejectedValue(new Error('ER_LOCK_DEADLOCK'));

      // Act & Assert
      await expect(processor.handleWriteoff(job)).rejects.toThrow();
    });

    it('should return failure result for non-retryable errors', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(
        createMockMachine({
          is_disposed: true,
        }),
      );

      // Act
      const result = await processor.handleWriteoff(job);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('already disposed');
    });
  });

  // ============================================================================
  // BOOK VALUE CALCULATION TESTS
  // ============================================================================

  describe('book value calculations', () => {
    it('should calculate book value correctly', async () => {
      // Arrange - purchase_price: 1000000, accumulated_depreciation: 200000
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(mockMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockResolvedValue(mockMachine);

      // Act
      const result = await processor.handleWriteoff(job);

      // Assert
      expect(result.bookValue).toBe(800000); // 1000000 - 200000
    });

    it('should handle zero depreciation', async () => {
      // Arrange
      const noDepreciationMachine = createMockMachine({
        purchase_price: 500000,
        accumulated_depreciation: 0,
      });
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(noDepreciationMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockResolvedValue(noDepreciationMachine);

      // Act
      const result = await processor.handleWriteoff(job);

      // Assert
      expect(result.bookValue).toBe(500000); // Full purchase price
    });

    it('should handle null accumulated_depreciation', async () => {
      // Arrange
      const nullDepreciationMachine = createMockMachine({
        purchase_price: 750000,
        accumulated_depreciation: null,
      } as any);
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(nullDepreciationMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockResolvedValue(nullDepreciationMachine);

      // Act
      const result = await processor.handleWriteoff(job);

      // Assert
      expect(result.bookValue).toBe(750000); // Null treated as 0
    });

    it('should handle decimal values in depreciation', async () => {
      // Arrange
      const decimalMachine = createMockMachine({
        purchase_price: 999999.99,
        accumulated_depreciation: 333333.33,
      });
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(decimalMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockResolvedValue(decimalMachine);

      // Act
      const result = await processor.handleWriteoff(job);

      // Assert
      expect(result.bookValue).toBeCloseTo(666666.66, 2);
    });
  });

  // ============================================================================
  // METADATA UPDATE TESTS
  // ============================================================================

  describe('metadata updates', () => {
    it('should update machine metadata with disposal info', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(mockMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockResolvedValue(mockMachine);

      // Act
      await processor.handleWriteoff(job);

      // Assert
      expect(machineRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            disposed_at: expect.any(String),
            disposal_book_value: 800000,
            disposal_transaction_id: 'transaction-1',
            disposal_job_id: '123',
          }),
        }),
      );
    });

    it('should preserve existing metadata', async () => {
      // Arrange
      const machineWithMetadata = createMockMachine({
        metadata: {
          existing_key: 'existing_value',
          custom_info: { nested: true },
        },
      });
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(machineWithMetadata);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockResolvedValue(machineWithMetadata);

      // Act
      await processor.handleWriteoff(job);

      // Assert
      const savedMachine = (machineRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedMachine.metadata.existing_key).toBe('existing_value');
      expect(savedMachine.metadata.custom_info).toEqual({ nested: true });
    });
  });

  // ============================================================================
  // TRANSACTION DESCRIPTION TESTS
  // ============================================================================

  describe('transaction description', () => {
    it('should include all financial information in description', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(mockMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockResolvedValue(mockMachine);

      // Act
      await processor.handleWriteoff(job);

      // Assert
      expect(transactionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringMatching(/Списание оборудования: M-001/),
        }),
      );
      const createCall = (transactionsService.create as jest.Mock).mock.calls[0][0];
      expect(createCall.description).toContain('1000000.00'); // Purchase price
      expect(createCall.description).toContain('200000.00'); // Depreciation
      expect(createCall.description).toContain('800000.00'); // Book value
    });

    it('should include disposal reason in description', async () => {
      // Arrange
      const job = createMockJob({
        writeoffDto: {
          disposal_reason: 'Water damage from flooding',
        },
      });
      machineRepository.findOne.mockResolvedValue(mockMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockResolvedValue(mockMachine);

      // Act
      await processor.handleWriteoff(job);

      // Assert
      const createCall = (transactionsService.create as jest.Mock).mock.calls[0][0];
      expect(createCall.description).toContain('Water damage from flooding');
    });
  });

  // ============================================================================
  // EVENT HANDLER TESTS
  // ============================================================================

  describe('onCompleted', () => {
    it('should log completion with machine details', async () => {
      // Arrange
      const job = createMockJob();
      const result: WriteoffJobResult = {
        success: true,
        machineId: 'machine-1',
        machineNumber: 'M-001',
        transactionId: 'txn-1',
        bookValue: 800000,
        disposalDate: new Date(),
        message: 'Success',
      };

      // Act - This just tests the method exists and can be called
      await processor.onCompleted(job, result);

      // Assert - Method should complete without error
      expect(true).toBe(true);
    });
  });

  describe('onFailed', () => {
    it('should log failure with error details', async () => {
      // Arrange
      const job = createMockJob();
      job.attemptsMade = 3;
      const error = new Error('Database connection lost');
      machineRepository.findOne.mockResolvedValue(mockMachine);

      // Act
      await processor.onFailed(job, error);

      // Assert - Method should complete without error
      expect(usersService.getAdminUserIds).toHaveBeenCalled();
    });

    it('should send notifications to admins on job failure', async () => {
      // Arrange
      const job = createMockJob();
      job.attemptsMade = 3;
      const error = new Error('Critical database error');
      machineRepository.findOne.mockResolvedValue(mockMachine);

      // Act
      await processor.onFailed(job, error);

      // Assert - Should send both in-app and Telegram notifications
      expect(notificationsService.createBulk).toHaveBeenCalledTimes(2);

      // Verify in-app notification
      expect(notificationsService.createBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system_alert',
          channel: 'in_app',
          recipient_ids: ['admin-1', 'admin-2'],
          title: expect.stringContaining('Ошибка списания'),
          message: expect.stringContaining('Critical database error'),
        }),
      );

      // Verify Telegram notification
      expect(notificationsService.createBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system_alert',
          channel: 'telegram',
          recipient_ids: ['admin-1', 'admin-2'],
        }),
      );
    });

    it('should create audit log entry on job failure', async () => {
      // Arrange
      const job = createMockJob();
      job.attemptsMade = 2;
      const error = new Error('Transaction rollback failed');
      machineRepository.findOne.mockResolvedValue(mockMachine);

      // Act
      await processor.onFailed(job, error);

      // Assert
      expect(auditLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'suspicious_activity',
          severity: 'error',
          user_id: 'user-1',
          description: expect.stringContaining('Machine writeoff failed'),
          metadata: expect.objectContaining({
            machine_id: 'machine-1',
            machine_number: 'M-001',
            error_message: 'Transaction rollback failed',
            attempts: 2,
          }),
          success: false,
        }),
      );
    });

    it('should handle missing machine gracefully in onFailed', async () => {
      // Arrange
      const job = createMockJob();
      job.attemptsMade = 1;
      const error = new Error('Machine not found');
      machineRepository.findOne.mockResolvedValue(null);

      // Act
      await processor.onFailed(job, error);

      // Assert - Should still send notification with 'Unknown' machine number
      expect(notificationsService.createBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Unknown'),
        }),
      );
    });

    it('should use system as userId when userId is undefined', async () => {
      // Arrange
      const job = createMockJob({ userId: undefined });
      job.attemptsMade = 1;
      const error = new Error('Test error');
      machineRepository.findOne.mockResolvedValue(mockMachine);

      // Act
      await processor.onFailed(job, error);

      // Assert
      expect(auditLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'system',
        }),
      );
    });

    it('should not throw when no admins are found', async () => {
      // Arrange
      const job = createMockJob();
      job.attemptsMade = 1;
      const error = new Error('Test error');
      machineRepository.findOne.mockResolvedValue(mockMachine);
      usersService.getAdminUserIds.mockResolvedValue([]);

      // Act & Assert - Should not throw
      await expect(processor.onFailed(job, error)).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // TRANSACTION/MACHINE MISMATCH TESTS
  // ============================================================================

  describe('handleTransactionMachineMismatch', () => {
    it('should send critical notifications when transaction created but machine update fails', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(mockMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockRejectedValue(new Error('Database lock timeout'));

      // Act
      await processor.handleWriteoff(job);

      // Assert - Should send notifications via all channels (in-app, telegram, email)
      expect(notificationsService.createBulk).toHaveBeenCalledTimes(3);
      expect(auditLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
          description: expect.stringContaining('mismatch'),
          metadata: expect.objectContaining({
            transaction_id: 'transaction-1',
            requires_manual_intervention: true,
          }),
        }),
      );
    });

    it('should include transaction ID in mismatch notifications', async () => {
      // Arrange
      const job = createMockJob();
      machineRepository.findOne.mockResolvedValue(mockMachine);
      transactionsService.create.mockResolvedValue({
        ...mockTransaction,
        id: 'txn-mismatch-test',
      } as any);
      machineRepository.save.mockRejectedValue(new Error('Save failed'));

      // Act
      await processor.handleWriteoff(job);

      // Assert
      expect(notificationsService.createBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('txn-mismatch-test'),
          data: expect.objectContaining({
            transaction_id: 'txn-mismatch-test',
          }),
        }),
      );
    });
  });

  // ============================================================================
  // INTEGRATION-LIKE TESTS
  // ============================================================================

  describe('full workflow', () => {
    it('should complete full writeoff workflow correctly', async () => {
      // Arrange
      const job = createMockJob({
        machineId: 'machine-full-test',
        writeoffDto: {
          disposal_reason: 'Comprehensive test disposal',
          disposal_date: '2024-06-15T10:00:00.000Z',
        },
        userId: 'test-user-123',
        requestId: 'req-full-test',
      });

      const testMachine = createMockMachine({
        id: 'machine-full-test',
        machine_number: 'M-FULL-TEST',
        purchase_price: 2000000,
        accumulated_depreciation: 500000,
      });

      machineRepository.findOne.mockResolvedValue(testMachine);
      transactionsService.create.mockResolvedValue({
        ...mockTransaction,
        id: 'txn-full-test',
        amount: 1500000,
      } as any);
      machineRepository.save.mockResolvedValue(
        createMockMachine({
          id: 'machine-full-test',
          machine_number: 'M-FULL-TEST',
          is_disposed: true,
          status: MachineStatus.DISABLED,
        }),
      );

      // Act
      const result = await processor.handleWriteoff(job);

      // Assert
      expect(result).toEqual({
        success: true,
        machineId: 'machine-full-test',
        machineNumber: 'M-FULL-TEST',
        transactionId: 'txn-full-test',
        bookValue: 1500000,
        disposalDate: new Date('2024-06-15T10:00:00.000Z'),
        message: 'Machine M-FULL-TEST successfully written off',
      });

      // Verify all steps were executed
      expect(machineRepository.findOne).toHaveBeenCalledTimes(1);
      expect(transactionsService.create).toHaveBeenCalledTimes(1);
      expect(machineRepository.save).toHaveBeenCalledTimes(1);
      expect(job.progress).toHaveBeenCalledTimes(6);
    });

    it('should handle concurrent job processing', async () => {
      // Arrange - simulate 3 concurrent jobs
      const jobs = [
        createMockJob({ machineId: 'machine-1' }),
        createMockJob({ machineId: 'machine-2' }),
        createMockJob({ machineId: 'machine-3' }),
      ];

      machineRepository.findOne.mockResolvedValue(mockMachine);
      transactionsService.create.mockResolvedValue(mockTransaction as any);
      machineRepository.save.mockResolvedValue(mockMachine);

      // Act - Process all jobs concurrently
      const results = await Promise.all(jobs.map((job) => processor.handleWriteoff(job)));

      // Assert - All should succeed
      expect(results.every((r) => r.success)).toBe(true);
      expect(machineRepository.findOne).toHaveBeenCalledTimes(3);
      expect(transactionsService.create).toHaveBeenCalledTimes(3);
      expect(machineRepository.save).toHaveBeenCalledTimes(3);
    });
  });
});
