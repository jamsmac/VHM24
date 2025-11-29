import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LeaveRequestService } from './leave-request.service';
import { LeaveRequest, LeaveStatus, LeaveType } from '../entities/leave-request.entity';

describe('LeaveRequestService', () => {
  let service: LeaveRequestService;
  let repository: jest.Mocked<Repository<LeaveRequest>>;

  const mockLeaveRequest: Partial<LeaveRequest> = {
    id: 'leave-uuid',
    employee_id: 'employee-uuid',
    leave_type: LeaveType.ANNUAL,
    start_date: new Date('2025-02-01'),
    end_date: new Date('2025-02-05'),
    total_days: 5,
    reason: 'Vacation',
    status: LeaveStatus.PENDING,
    approved_by_id: null,
    approved_at: null,
    rejection_reason: null,
    metadata: {},
  };

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveRequestService,
        {
          provide: getRepositoryToken(LeaveRequest),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<LeaveRequestService>(LeaveRequestService);
    repository = module.get(getRepositoryToken(LeaveRequest));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLeaveRequest', () => {
    it('should create a new leave request', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      repository.create.mockReturnValue(mockLeaveRequest as LeaveRequest);
      repository.save.mockResolvedValue(mockLeaveRequest as LeaveRequest);

      const result = await service.createLeaveRequest({
        employee_id: 'employee-uuid',
        leave_type: LeaveType.ANNUAL,
        start_date: new Date('2025-02-01'),
        end_date: new Date('2025-02-05'),
        reason: 'Vacation',
      });

      expect(result).toEqual(mockLeaveRequest);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          total_days: 5,
        }),
      );
    });

    it('should throw BadRequestException for invalid date range', async () => {
      await expect(
        service.createLeaveRequest({
          employee_id: 'employee-uuid',
          leave_type: LeaveType.ANNUAL,
          start_date: new Date('2025-02-05'),
          end_date: new Date('2025-02-01'), // End before start
          reason: 'Invalid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for overlapping leave', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockLeaveRequest), // Overlapping found
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await expect(
        service.createLeaveRequest({
          employee_id: 'employee-uuid',
          leave_type: LeaveType.ANNUAL,
          start_date: new Date('2025-02-03'),
          end_date: new Date('2025-02-07'),
          reason: 'Overlap',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveLeave', () => {
    it('should approve a pending leave request', async () => {
      repository.findOne.mockResolvedValue(mockLeaveRequest as LeaveRequest);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as LeaveRequest));

      const result = await service.approveLeave('leave-uuid', 'manager-uuid');

      expect(result.status).toBe(LeaveStatus.APPROVED);
      expect(result.approved_by_id).toBe('manager-uuid');
      expect(result.approved_at).toBeDefined();
    });

    it('should throw NotFoundException when leave not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.approveLeave('non-existent', 'manager-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when leave is not pending', async () => {
      repository.findOne.mockResolvedValue({
        ...mockLeaveRequest,
        status: LeaveStatus.APPROVED,
      } as LeaveRequest);

      await expect(service.approveLeave('leave-uuid', 'manager-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('rejectLeave', () => {
    it('should reject a pending leave request', async () => {
      const pendingLeaveRequest = { ...mockLeaveRequest, status: LeaveStatus.PENDING };
      repository.findOne.mockResolvedValue(pendingLeaveRequest as LeaveRequest);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as LeaveRequest));

      const result = await service.rejectLeave(
        'leave-uuid',
        'manager-uuid',
        'Team shortage during this period',
      );

      expect(result.status).toBe(LeaveStatus.REJECTED);
      expect(result.approved_by_id).toBe('manager-uuid');
      expect(result.rejection_reason).toBe('Team shortage during this period');
    });

    it('should throw NotFoundException when leave not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.rejectLeave('non-existent', 'manager-uuid', 'reason')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when leave is not pending', async () => {
      repository.findOne.mockResolvedValue({
        ...mockLeaveRequest,
        status: LeaveStatus.REJECTED,
      } as LeaveRequest);

      await expect(service.rejectLeave('leave-uuid', 'manager-uuid', 'reason')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelLeave', () => {
    it('should cancel a leave request', async () => {
      repository.findOne.mockResolvedValue(mockLeaveRequest as LeaveRequest);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as LeaveRequest));

      const result = await service.cancelLeave('leave-uuid');

      expect(result.status).toBe(LeaveStatus.CANCELLED);
    });

    it('should throw NotFoundException when leave not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.cancelLeave('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLeavesByEmployee', () => {
    it('should return all leaves for an employee', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockLeaveRequest]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getLeavesByEmployee('employee-uuid');

      expect(result).toEqual([mockLeaveRequest]);
    });

    it('should filter by year when provided', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockLeaveRequest]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getLeavesByEmployee('employee-uuid', 2025);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'leave.start_date BETWEEN :start AND :end',
        expect.any(Object),
      );
    });
  });

  describe('getPendingLeaves', () => {
    it('should return all pending leave requests', async () => {
      repository.find.mockResolvedValue([mockLeaveRequest] as LeaveRequest[]);

      const result = await service.getPendingLeaves();

      expect(result).toEqual([mockLeaveRequest]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { status: LeaveStatus.PENDING },
        relations: ['employee'],
        order: { created_at: 'ASC' },
      });
    });
  });

  describe('getLeaveBalance', () => {
    it('should calculate leave balance by type', async () => {
      const leaves = [
        {
          ...mockLeaveRequest,
          leave_type: LeaveType.ANNUAL,
          status: LeaveStatus.APPROVED,
          total_days: 5,
        },
        {
          ...mockLeaveRequest,
          leave_type: LeaveType.ANNUAL,
          status: LeaveStatus.PENDING,
          total_days: 3,
        },
        {
          ...mockLeaveRequest,
          leave_type: LeaveType.SICK,
          status: LeaveStatus.APPROVED,
          total_days: 2,
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(leaves),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getLeaveBalance('employee-uuid', 2025);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            leave_type: LeaveType.ANNUAL,
            total_days_taken: 5,
            total_days_pending: 3,
          }),
          expect.objectContaining({
            leave_type: LeaveType.SICK,
            total_days_taken: 2,
            total_days_pending: 0,
          }),
        ]),
      );
    });

    it('should return zero balance when no leaves', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getLeaveBalance('employee-uuid', 2025);

      // Should have entries for all leave types with zero values
      expect(result.length).toBe(Object.values(LeaveType).length);
      result.forEach((balance) => {
        expect(balance.total_days_taken).toBe(0);
        expect(balance.total_days_pending).toBe(0);
      });
    });
  });
});
