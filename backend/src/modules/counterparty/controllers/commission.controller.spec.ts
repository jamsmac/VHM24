import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { CommissionController } from './commission.controller';
import { CommissionSchedulerService } from '../services/commission-scheduler.service';
import { RevenueAggregationService } from '../services/revenue-aggregation.service';
import { CommissionCalculation, PaymentStatus } from '../entities/commission-calculation.entity';
import { Contract } from '../entities/contract.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';

describe('CommissionController', () => {
  let controller: CommissionController;
  let mockSchedulerService: any;
  let mockRevenueService: any;
  let mockCalculationRepository: any;
  let mockContractRepository: any;
  let mockCommissionQueue: any;

  const mockCommission = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    contract_id: '123e4567-e89b-12d3-a456-426614174002',
    period_start: new Date('2025-01-01'),
    period_end: new Date('2025-01-31'),
    total_revenue: 1000000,
    transaction_count: 100,
    commission_amount: 50000,
    commission_type: 'percentage',
    payment_status: PaymentStatus.PENDING,
    payment_due_date: new Date('2025-02-15'),
    payment_date: null,
    payment_transaction_id: null,
    notes: null,
    contract: {
      id: '123e4567-e89b-12d3-a456-426614174002',
      contract_number: 'C-001',
      counterparty: { id: 'cp-1', name: 'Test Counterparty' },
    },
  };

  beforeEach(async () => {
    mockSchedulerService = {
      getPendingPayments: jest.fn(),
      getOverduePayments: jest.fn(),
      markAsPaid: jest.fn(),
      checkAndUpdateOverduePayments: jest.fn(),
    };

    mockRevenueService = {};

    mockCalculationRepository = {
      findAndCount: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockContractRepository = {
      findOne: jest.fn(),
    };

    mockCommissionQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommissionController],
      providers: [
        {
          provide: CommissionSchedulerService,
          useValue: mockSchedulerService,
        },
        {
          provide: RevenueAggregationService,
          useValue: mockRevenueService,
        },
        {
          provide: getRepositoryToken(CommissionCalculation),
          useValue: mockCalculationRepository,
        },
        {
          provide: getRepositoryToken(Contract),
          useValue: mockContractRepository,
        },
        {
          provide: getQueueToken('commission-calculations'),
          useValue: mockCommissionQueue,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CommissionController>(CommissionController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated list of commissions', async () => {
      const mockItems = [mockCommission];
      mockCalculationRepository.findAndCount.mockResolvedValue([mockItems, 1]);

      const result = await controller.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({
        items: mockItems,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          total_pages: 1,
        },
      });
      expect(mockCalculationRepository.findAndCount).toHaveBeenCalled();
    });

    it('should filter by payment_status when provided', async () => {
      mockCalculationRepository.findAndCount.mockResolvedValue([[], 0]);

      await controller.findAll({
        page: 1,
        limit: 20,
        payment_status: PaymentStatus.PENDING,
      } as any);

      expect(mockCalculationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            payment_status: PaymentStatus.PENDING,
          }),
        }),
      );
    });

    it('should filter by contract_id when provided', async () => {
      mockCalculationRepository.findAndCount.mockResolvedValue([[], 0]);

      await controller.findAll({
        page: 1,
        limit: 20,
        contract_id: '123e4567-e89b-12d3-a456-426614174002',
      } as any);

      expect(mockCalculationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contract_id: '123e4567-e89b-12d3-a456-426614174002',
          }),
        }),
      );
    });

    it('should use default pagination when not provided', async () => {
      mockCalculationRepository.findAndCount.mockResolvedValue([[], 0]);

      await controller.findAll({});

      expect(mockCalculationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  describe('getPending', () => {
    it('should return pending commissions with summary', async () => {
      const pendingCommissions = [
        { ...mockCommission, payment_status: PaymentStatus.PENDING, commission_amount: 50000 },
        {
          ...mockCommission,
          id: '2',
          payment_status: PaymentStatus.OVERDUE,
          commission_amount: 30000,
        },
      ];
      mockSchedulerService.getPendingPayments.mockResolvedValue(pendingCommissions as any);

      const result = await controller.getPending();

      expect(result).toEqual({
        items: pendingCommissions,
        summary: {
          total_count: 2,
          pending_count: 1,
          overdue_count: 1,
          total_pending_amount: 50000,
          total_overdue_amount: 30000,
          total_amount: 80000,
        },
      });
    });

    it('should return empty summary when no pending commissions', async () => {
      mockSchedulerService.getPendingPayments.mockResolvedValue([]);

      const result = await controller.getPending();

      expect(result.summary.total_count).toBe(0);
      expect(result.summary.total_amount).toBe(0);
    });
  });

  describe('getOverdue', () => {
    it('should return overdue commissions with summary', async () => {
      const overdueCommissions = [
        { ...mockCommission, payment_status: PaymentStatus.OVERDUE, commission_amount: 50000 },
      ];
      mockSchedulerService.getOverduePayments.mockResolvedValue(overdueCommissions as any);

      const result = await controller.getOverdue();

      expect(result).toEqual({
        items: overdueCommissions,
        summary: {
          total_count: 1,
          total_amount: 50000,
        },
      });
    });
  });

  describe('getStats', () => {
    it('should return commission statistics', async () => {
      const pendingCommissions = [
        { ...mockCommission, payment_status: PaymentStatus.PENDING, commission_amount: 50000 },
        {
          ...mockCommission,
          id: '2',
          payment_status: PaymentStatus.OVERDUE,
          commission_amount: 30000,
        },
      ];

      const paidCommissions = [
        {
          ...mockCommission,
          payment_status: PaymentStatus.PAID,
          commission_amount: 100000,
          payment_date: new Date(),
          payment_due_date: new Date(),
        },
      ];

      mockCalculationRepository.find.mockResolvedValue(pendingCommissions);

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(paidCommissions),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            contract_id: 'c1',
            contract_number: 'C-001',
            pending_count: '2',
            pending_amount: '80000',
          },
        ]),
      };
      mockCalculationRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await controller.getStats();

      expect(result).toHaveProperty('total_pending');
      expect(result).toHaveProperty('total_pending_amount');
      expect(result).toHaveProperty('total_overdue');
      expect(result).toHaveProperty('total_overdue_amount');
      expect(result).toHaveProperty('total_paid_this_month');
      expect(result).toHaveProperty('by_contract');
    });
  });

  describe('findOne', () => {
    it('should return commission calculation by id', async () => {
      mockCalculationRepository.findOne.mockResolvedValue(mockCommission);

      const result = await controller.findOne('123e4567-e89b-12d3-a456-426614174001');

      expect(result).toEqual(mockCommission);
      expect(mockCalculationRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174001' },
        relations: ['contract', 'contract.counterparty'],
      });
    });

    it('should throw error when commission not found', async () => {
      mockCalculationRepository.findOne.mockResolvedValue(null);

      await expect(controller.findOne('nonexistent-id')).rejects.toThrow(
        'Commission calculation not found',
      );
    });
  });

  describe('findByContract', () => {
    it('should return commissions for a contract with summary', async () => {
      const commissions = [
        { ...mockCommission, commission_amount: 50000, total_revenue: 1000000 },
        {
          ...mockCommission,
          id: '2',
          commission_amount: 30000,
          total_revenue: 600000,
          payment_status: PaymentStatus.PAID,
        },
      ];
      mockCalculationRepository.find.mockResolvedValue(commissions);

      const result = await controller.findByContract('123e4567-e89b-12d3-a456-426614174002');

      expect(result).toEqual({
        items: commissions,
        summary: {
          total_count: 2,
          total_commission: 80000,
          total_revenue: 1600000,
          pending_count: 1,
          paid_count: 1,
        },
      });
    });
  });

  describe('markAsPaid', () => {
    it('should mark commission as paid', async () => {
      const updatedCommission = { ...mockCommission, payment_status: PaymentStatus.PAID };
      mockSchedulerService.markAsPaid.mockResolvedValue(updatedCommission as any);

      const result = await controller.markAsPaid('123e4567-e89b-12d3-a456-426614174001', {
        payment_date: '2025-02-10',
        payment_transaction_id: 'txn-123',
      });

      expect(result).toEqual({
        message: 'Commission marked as paid successfully',
        commission: updatedCommission,
      });
    });

    it('should use current date when payment_date not provided', async () => {
      mockSchedulerService.markAsPaid.mockResolvedValue(mockCommission as any);

      await controller.markAsPaid('123e4567-e89b-12d3-a456-426614174001', {});

      expect(mockSchedulerService.markAsPaid).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        null,
        expect.any(Date),
      );
    });
  });

  describe('updatePayment', () => {
    it('should update payment details', async () => {
      mockCalculationRepository.findOne.mockResolvedValue({ ...mockCommission });
      mockCalculationRepository.save.mockResolvedValue({
        ...mockCommission,
        payment_status: PaymentStatus.PAID,
        notes: 'Updated notes',
      });

      const result = await controller.updatePayment('123e4567-e89b-12d3-a456-426614174001', {
        payment_status: PaymentStatus.PAID,
        notes: 'Updated notes',
      });

      expect(result.message).toBe('Payment details updated successfully');
      expect(mockCalculationRepository.save).toHaveBeenCalled();
    });

    it('should throw error when commission not found', async () => {
      mockCalculationRepository.findOne.mockResolvedValue(null);

      await expect(controller.updatePayment('nonexistent-id', { notes: 'test' })).rejects.toThrow(
        'Commission calculation not found',
      );
    });

    it('should update payment_due_date when provided', async () => {
      mockCalculationRepository.findOne.mockResolvedValue({ ...mockCommission });
      mockCalculationRepository.save.mockResolvedValue(mockCommission);

      await controller.updatePayment('123e4567-e89b-12d3-a456-426614174001', {
        payment_due_date: '2025-03-01',
      });

      expect(mockCalculationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_due_date: expect.any(Date),
        }),
      );
    });
  });

  describe('calculateNow', () => {
    it('should queue commission calculation job', async () => {
      mockCommissionQueue.add.mockResolvedValue({ id: 'job-123' });

      const result = await controller.calculateNow('monthly');

      expect(result).toEqual({
        message: 'Commission calculation job queued',
        job_id: 'job-123',
        period: 'monthly',
        status: 'queued',
        note: 'Use GET /commissions/jobs/:jobId to check status',
      });
      expect(mockCommissionQueue.add).toHaveBeenCalledWith('calculate-manual', {
        period: 'monthly',
      });
    });

    it('should default to "all" period when not provided', async () => {
      mockCommissionQueue.add.mockResolvedValue({ id: 'job-123' });

      const result = await controller.calculateNow();

      expect(result.period).toBe('all');
      expect(mockCommissionQueue.add).toHaveBeenCalledWith('calculate-manual', {
        period: 'all',
      });
    });
  });

  describe('getJobStatus', () => {
    it('should return job status when job found', async () => {
      const mockJob = {
        id: 'job-123',
        getState: jest.fn().mockResolvedValue('completed'),
        progress: jest.fn().mockReturnValue(100),
        returnvalue: { processed: 5 },
        failedReason: null,
        timestamp: Date.now(),
        processedOn: Date.now() - 1000,
        finishedOn: Date.now(),
      };
      mockCommissionQueue.getJob.mockResolvedValue(mockJob);

      const result = await controller.getJobStatus('job-123');

      expect(result).toEqual({
        job_id: 'job-123',
        state: 'completed',
        progress: 100,
        result: { processed: 5 },
        failed_reason: null,
        created_at: expect.any(Date),
        processed_on: expect.any(Date),
        finished_on: expect.any(Date),
      });
    });

    it('should return error when job not found', async () => {
      mockCommissionQueue.getJob.mockResolvedValue(null);

      const result = await controller.getJobStatus('nonexistent-job');

      expect(result).toEqual({
        error: 'Job not found',
        job_id: 'nonexistent-job',
      });
    });
  });

  describe('checkOverdue', () => {
    it('should check and update overdue payments', async () => {
      mockSchedulerService.checkAndUpdateOverduePayments.mockResolvedValue(5);

      const result = await controller.checkOverdue();

      expect(result).toEqual({
        message: 'Overdue check completed',
        updated_count: 5,
      });
    });
  });
});
