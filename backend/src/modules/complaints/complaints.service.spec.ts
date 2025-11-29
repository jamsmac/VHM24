import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { Complaint, ComplaintStatus, ComplaintType } from './entities/complaint.entity';
import {
  CreateComplaintDto,
  CreatePublicComplaintDto,
  HandleComplaintDto,
} from './dto/create-complaint.dto';
import { MachinesService } from '../machines/machines.service';
import { Machine } from '../machines/entities/machine.entity';

describe('ComplaintsService', () => {
  let service: ComplaintsService;
  let mockComplaintRepository: jest.Mocked<Repository<Complaint>>;
  let mockMachinesService: jest.Mocked<MachinesService>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Complaint>>;

  // Test fixtures
  const mockMachineId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '223e4567-e89b-12d3-a456-426614174001';
  const mockComplaintId = '323e4567-e89b-12d3-a456-426614174002';
  const mockQrCode = 'QR-MACHINE-001';

  const mockMachine: Partial<Machine> = {
    id: mockMachineId,
    machine_number: 'M-001',
    name: 'Coffee Machine Lobby',
    qr_code: mockQrCode,
  };

  const mockComplaint: Partial<Complaint> = {
    id: mockComplaintId,
    complaint_type: ComplaintType.PRODUCT_QUALITY,
    status: ComplaintStatus.NEW,
    machine_id: mockMachineId,
    description: 'Coffee was cold',
    customer_name: 'John Doe',
    customer_phone: '+998901234567',
    customer_email: 'john@example.com',
    submitted_at: new Date('2025-01-15T10:00:00Z'),
    handled_by_user_id: null,
    resolved_at: null,
    response: null,
    refund_amount: null,
    refund_transaction_id: null,
    metadata: { ip_address: '192.168.1.100' },
    rating: 2,
    machine: mockMachine as Machine,
    created_at: new Date('2025-01-15T10:00:00Z'),
    updated_at: new Date('2025-01-15T10:00:00Z'),
  };

  const createComplaintDto: CreateComplaintDto = {
    complaint_type: ComplaintType.PRODUCT_QUALITY,
    machine_id: mockMachineId,
    description: 'Coffee was cold',
    customer_name: 'John Doe',
    customer_phone: '+998901234567',
    customer_email: 'john@example.com',
    rating: 2,
    metadata: { ip_address: '192.168.1.100' },
  };

  const createPublicComplaintDto: CreatePublicComplaintDto = {
    qr_code: mockQrCode,
    complaint_type: ComplaintType.PRODUCT_QUALITY,
    description: 'Coffee was cold',
    customer_name: 'John Doe',
    customer_phone: '+998901234567',
    customer_email: 'john@example.com',
    rating: 2,
    metadata: { ip_address: '192.168.1.100' },
  };

  beforeEach(async () => {
    // Create mock query builder
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue(null),
    } as any;

    // Create mock repository
    mockComplaintRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    // Create mock machines service
    mockMachinesService = {
      findByQrCodePublic: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintsService,
        {
          provide: getRepositoryToken(Complaint),
          useValue: mockComplaintRepository,
        },
        {
          provide: MachinesService,
          useValue: mockMachinesService,
        },
      ],
    }).compile();

    service = module.get<ComplaintsService>(ComplaintsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a complaint with NEW status', async () => {
      // Arrange
      const createdComplaint = {
        ...mockComplaint,
        status: ComplaintStatus.NEW,
        submitted_at: expect.any(Date),
      };
      mockComplaintRepository.create.mockReturnValue(createdComplaint as Complaint);
      mockComplaintRepository.save.mockResolvedValue(createdComplaint as Complaint);

      // Act
      const result = await service.create(createComplaintDto);

      // Assert
      expect(mockComplaintRepository.create).toHaveBeenCalledWith({
        ...createComplaintDto,
        status: ComplaintStatus.NEW,
        submitted_at: expect.any(Date),
      });
      expect(mockComplaintRepository.save).toHaveBeenCalledWith(createdComplaint);
      expect(result.status).toBe(ComplaintStatus.NEW);
    });

    it('should create a complaint without optional fields', async () => {
      // Arrange
      const minimalDto: CreateComplaintDto = {
        complaint_type: ComplaintType.PRODUCT_NOT_DISPENSED,
        machine_id: mockMachineId,
        description: 'Product not dispensed',
      };
      const createdComplaint = {
        ...minimalDto,
        id: mockComplaintId,
        status: ComplaintStatus.NEW,
        submitted_at: expect.any(Date),
      };
      mockComplaintRepository.create.mockReturnValue(createdComplaint as Complaint);
      mockComplaintRepository.save.mockResolvedValue(createdComplaint as Complaint);

      // Act
      const result = await service.create(minimalDto);

      // Assert
      expect(result.status).toBe(ComplaintStatus.NEW);
      expect(mockComplaintRepository.create).toHaveBeenCalledWith({
        ...minimalDto,
        status: ComplaintStatus.NEW,
        submitted_at: expect.any(Date),
      });
    });

    it('should create a complaint with all complaint types', async () => {
      const complaintTypes = [
        ComplaintType.PRODUCT_QUALITY,
        ComplaintType.NO_CHANGE,
        ComplaintType.PRODUCT_NOT_DISPENSED,
        ComplaintType.MACHINE_DIRTY,
        ComplaintType.OTHER,
      ];

      for (const type of complaintTypes) {
        // Arrange
        const dto: CreateComplaintDto = {
          ...createComplaintDto,
          complaint_type: type,
        };
        const createdComplaint = { ...mockComplaint, complaint_type: type };
        mockComplaintRepository.create.mockReturnValue(createdComplaint as Complaint);
        mockComplaintRepository.save.mockResolvedValue(createdComplaint as Complaint);

        // Act
        const result = await service.create(dto);

        // Assert
        expect(result.complaint_type).toBe(type);
      }
    });
  });

  describe('createFromQrCode', () => {
    it('should create a complaint from QR code', async () => {
      // Arrange
      mockMachinesService.findByQrCodePublic.mockResolvedValue(mockMachine as Machine);

      const createdComplaint = {
        ...mockComplaint,
        status: ComplaintStatus.NEW,
        submitted_at: expect.any(Date),
      };
      mockComplaintRepository.create.mockReturnValue(createdComplaint as Complaint);
      mockComplaintRepository.save.mockResolvedValue(createdComplaint as Complaint);

      // Act
      const result = await service.createFromQrCode(createPublicComplaintDto);

      // Assert
      expect(mockMachinesService.findByQrCodePublic).toHaveBeenCalledWith(mockQrCode);
      expect(mockComplaintRepository.create).toHaveBeenCalledWith({
        machine_id: mockMachineId,
        complaint_type: createPublicComplaintDto.complaint_type,
        description: createPublicComplaintDto.description,
        customer_name: createPublicComplaintDto.customer_name,
        customer_phone: createPublicComplaintDto.customer_phone,
        customer_email: createPublicComplaintDto.customer_email,
        rating: createPublicComplaintDto.rating,
        metadata: createPublicComplaintDto.metadata,
        status: ComplaintStatus.NEW,
        submitted_at: expect.any(Date),
      });
      expect(result.status).toBe(ComplaintStatus.NEW);
      expect(result.machine_id).toBe(mockMachineId);
    });

    it('should throw NotFoundException when QR code not found', async () => {
      // Arrange
      mockMachinesService.findByQrCodePublic.mockRejectedValue(
        new NotFoundException('Machine not found'),
      );

      // Act & Assert
      await expect(service.createFromQrCode(createPublicComplaintDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create complaint without optional customer info', async () => {
      // Arrange
      const minimalPublicDto: CreatePublicComplaintDto = {
        qr_code: mockQrCode,
        complaint_type: ComplaintType.PRODUCT_QUALITY,
        description: 'Product issue',
      };

      mockMachinesService.findByQrCodePublic.mockResolvedValue(mockMachine as Machine);

      const createdComplaint = {
        ...mockComplaint,
        customer_name: null,
        customer_phone: null,
        customer_email: null,
        rating: null,
        metadata: null,
        status: ComplaintStatus.NEW,
      };
      mockComplaintRepository.create.mockReturnValue(createdComplaint as Complaint);
      mockComplaintRepository.save.mockResolvedValue(createdComplaint as Complaint);

      // Act
      await service.createFromQrCode(minimalPublicDto);

      // Assert
      expect(mockComplaintRepository.create).toHaveBeenCalledWith({
        machine_id: mockMachineId,
        complaint_type: minimalPublicDto.complaint_type,
        description: minimalPublicDto.description,
        customer_name: undefined,
        customer_phone: undefined,
        customer_email: undefined,
        rating: undefined,
        metadata: undefined,
        status: ComplaintStatus.NEW,
        submitted_at: expect.any(Date),
      });
    });
  });

  describe('findAll', () => {
    it('should return all complaints without filters', async () => {
      // Arrange
      const complaints = [mockComplaint, { ...mockComplaint, id: 'another-id' }];
      mockQueryBuilder.getMany.mockResolvedValue(complaints as Complaint[]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockComplaintRepository.createQueryBuilder).toHaveBeenCalledWith('complaint');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'complaint.machine',
        'machine',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'complaint.handled_by',
        'handled_by',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('complaint.submitted_at', 'DESC');
      expect(result).toEqual(complaints);
    });

    it('should filter by status when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockComplaint as Complaint]);

      // Act
      await service.findAll(ComplaintStatus.NEW);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('complaint.status = :status', {
        status: ComplaintStatus.NEW,
      });
    });

    it('should filter by complaint type when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockComplaint as Complaint]);

      // Act
      await service.findAll(undefined, ComplaintType.PRODUCT_QUALITY);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('complaint.complaint_type = :type', {
        type: ComplaintType.PRODUCT_QUALITY,
      });
    });

    it('should filter by machine ID when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockComplaint as Complaint]);

      // Act
      await service.findAll(undefined, undefined, mockMachineId);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('complaint.machine_id = :machineId', {
        machineId: mockMachineId,
      });
    });

    it('should apply multiple filters when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockComplaint as Complaint]);

      // Act
      await service.findAll(ComplaintStatus.NEW, ComplaintType.PRODUCT_QUALITY, mockMachineId);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });
  });

  describe('findOne', () => {
    it('should return a complaint when found', async () => {
      // Arrange
      mockComplaintRepository.findOne.mockResolvedValue(mockComplaint as Complaint);

      // Act
      const result = await service.findOne(mockComplaintId);

      // Assert
      expect(mockComplaintRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockComplaintId },
        relations: ['machine', 'machine.location', 'handled_by'],
      });
      expect(result).toEqual(mockComplaint);
    });

    it('should throw NotFoundException when complaint not found', async () => {
      // Arrange
      mockComplaintRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Жалоба с ID non-existent-id не найдена',
      );
    });
  });

  describe('takeInReview', () => {
    it('should take a NEW complaint in review', async () => {
      // Arrange
      const newComplaint = { ...mockComplaint, status: ComplaintStatus.NEW };
      const inReviewComplaint = {
        ...newComplaint,
        status: ComplaintStatus.IN_REVIEW,
        handled_by_user_id: mockUserId,
      };

      mockComplaintRepository.findOne.mockResolvedValue(newComplaint as Complaint);
      mockComplaintRepository.save.mockResolvedValue(inReviewComplaint as Complaint);

      // Act
      const result = await service.takeInReview(mockComplaintId, mockUserId);

      // Assert
      expect(result.status).toBe(ComplaintStatus.IN_REVIEW);
      expect(result.handled_by_user_id).toBe(mockUserId);
    });

    it('should throw BadRequestException when complaint is not NEW', async () => {
      // Arrange
      const inReviewComplaint = { ...mockComplaint, status: ComplaintStatus.IN_REVIEW };
      mockComplaintRepository.findOne.mockResolvedValue(inReviewComplaint as Complaint);

      // Act & Assert
      await expect(service.takeInReview(mockComplaintId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.takeInReview(mockComplaintId, mockUserId)).rejects.toThrow(
        'Можно взять в обработку только новые жалобы',
      );
    });

    it('should throw BadRequestException when complaint is already RESOLVED', async () => {
      // Arrange
      const resolvedComplaint = { ...mockComplaint, status: ComplaintStatus.RESOLVED };
      mockComplaintRepository.findOne.mockResolvedValue(resolvedComplaint as Complaint);

      // Act & Assert
      await expect(service.takeInReview(mockComplaintId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when complaint is REJECTED', async () => {
      // Arrange
      const rejectedComplaint = { ...mockComplaint, status: ComplaintStatus.REJECTED };
      mockComplaintRepository.findOne.mockResolvedValue(rejectedComplaint as Complaint);

      // Act & Assert
      await expect(service.takeInReview(mockComplaintId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when complaint does not exist', async () => {
      // Arrange
      mockComplaintRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.takeInReview('non-existent-id', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resolve', () => {
    it('should resolve a NEW complaint with refund', async () => {
      // Arrange
      const newComplaint = { ...mockComplaint, status: ComplaintStatus.NEW };
      const handleDto: HandleComplaintDto = {
        response: 'We apologize. Refund processed.',
        refund_amount: 15000,
        refund_transaction_id: '523e4567-e89b-12d3-a456-426614174003',
      };
      const resolvedComplaint = {
        ...newComplaint,
        status: ComplaintStatus.RESOLVED,
        handled_by_user_id: mockUserId,
        resolved_at: expect.any(Date),
        response: handleDto.response,
        refund_amount: handleDto.refund_amount,
        refund_transaction_id: handleDto.refund_transaction_id,
      };

      mockComplaintRepository.findOne.mockResolvedValue(newComplaint as Complaint);
      mockComplaintRepository.save.mockResolvedValue(resolvedComplaint as Complaint);

      // Act
      const result = await service.resolve(mockComplaintId, mockUserId, handleDto);

      // Assert
      expect(result.status).toBe(ComplaintStatus.RESOLVED);
      expect(result.response).toBe(handleDto.response);
      expect(result.refund_amount).toBe(handleDto.refund_amount);
      expect(result.refund_transaction_id).toBe(handleDto.refund_transaction_id);
      expect(result.resolved_at).toEqual(expect.any(Date));
    });

    it('should resolve an IN_REVIEW complaint', async () => {
      // Arrange
      const inReviewComplaint = { ...mockComplaint, status: ComplaintStatus.IN_REVIEW };
      const handleDto: HandleComplaintDto = {
        response: 'Issue resolved',
      };
      const resolvedComplaint = {
        ...inReviewComplaint,
        status: ComplaintStatus.RESOLVED,
        handled_by_user_id: mockUserId,
        resolved_at: expect.any(Date),
        response: handleDto.response,
        refund_amount: null,
        refund_transaction_id: null,
      };

      mockComplaintRepository.findOne.mockResolvedValue(inReviewComplaint as Complaint);
      mockComplaintRepository.save.mockResolvedValue(resolvedComplaint as Complaint);

      // Act
      const result = await service.resolve(mockComplaintId, mockUserId, handleDto);

      // Assert
      expect(result.status).toBe(ComplaintStatus.RESOLVED);
    });

    it('should throw BadRequestException when complaint is already RESOLVED', async () => {
      // Arrange
      const resolvedComplaint = { ...mockComplaint, status: ComplaintStatus.RESOLVED };
      mockComplaintRepository.findOne.mockResolvedValue(resolvedComplaint as Complaint);

      // Act & Assert
      await expect(
        service.resolve(mockComplaintId, mockUserId, { response: 'test' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resolve(mockComplaintId, mockUserId, { response: 'test' }),
      ).rejects.toThrow('Жалоба уже обработана');
    });

    it('should throw BadRequestException when complaint is REJECTED', async () => {
      // Arrange
      const rejectedComplaint = { ...mockComplaint, status: ComplaintStatus.REJECTED };
      mockComplaintRepository.findOne.mockResolvedValue(rejectedComplaint as Complaint);

      // Act & Assert
      await expect(
        service.resolve(mockComplaintId, mockUserId, { response: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should resolve with null refund when not provided', async () => {
      // Arrange
      const newComplaint = { ...mockComplaint, status: ComplaintStatus.NEW };
      const handleDto: HandleComplaintDto = {
        response: 'Issue resolved without refund',
      };
      const resolvedComplaint = {
        ...newComplaint,
        status: ComplaintStatus.RESOLVED,
        handled_by_user_id: mockUserId,
        resolved_at: new Date(),
        response: handleDto.response,
        refund_amount: null,
        refund_transaction_id: null,
      };

      mockComplaintRepository.findOne.mockResolvedValue(newComplaint as Complaint);
      mockComplaintRepository.save.mockResolvedValue(resolvedComplaint as Complaint);

      // Act
      const result = await service.resolve(mockComplaintId, mockUserId, handleDto);

      // Assert
      expect(result.refund_amount).toBeNull();
      expect(result.refund_transaction_id).toBeNull();
    });

    it('should throw NotFoundException when resolving non-existent complaint', async () => {
      // Arrange
      mockComplaintRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.resolve('non-existent-id', mockUserId, { response: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('should reject a NEW complaint', async () => {
      // Arrange
      const newComplaint = { ...mockComplaint, status: ComplaintStatus.NEW };
      const reason = 'Invalid complaint - user error';
      const rejectedComplaint = {
        ...newComplaint,
        status: ComplaintStatus.REJECTED,
        handled_by_user_id: mockUserId,
        resolved_at: expect.any(Date),
        response: reason,
      };

      mockComplaintRepository.findOne.mockResolvedValue(newComplaint as Complaint);
      mockComplaintRepository.save.mockResolvedValue(rejectedComplaint as Complaint);

      // Act
      const result = await service.reject(mockComplaintId, mockUserId, reason);

      // Assert
      expect(result.status).toBe(ComplaintStatus.REJECTED);
      expect(result.response).toBe(reason);
      expect(result.resolved_at).toEqual(expect.any(Date));
    });

    it('should reject an IN_REVIEW complaint', async () => {
      // Arrange
      const inReviewComplaint = { ...mockComplaint, status: ComplaintStatus.IN_REVIEW };
      const reason = 'Complaint is not valid';
      const rejectedComplaint = {
        ...inReviewComplaint,
        status: ComplaintStatus.REJECTED,
        handled_by_user_id: mockUserId,
        resolved_at: expect.any(Date),
        response: reason,
      };

      mockComplaintRepository.findOne.mockResolvedValue(inReviewComplaint as Complaint);
      mockComplaintRepository.save.mockResolvedValue(rejectedComplaint as Complaint);

      // Act
      const result = await service.reject(mockComplaintId, mockUserId, reason);

      // Assert
      expect(result.status).toBe(ComplaintStatus.REJECTED);
    });

    it('should throw BadRequestException when rejecting already RESOLVED complaint', async () => {
      // Arrange
      const resolvedComplaint = { ...mockComplaint, status: ComplaintStatus.RESOLVED };
      mockComplaintRepository.findOne.mockResolvedValue(resolvedComplaint as Complaint);

      // Act & Assert
      await expect(service.reject(mockComplaintId, mockUserId, 'reason')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reject(mockComplaintId, mockUserId, 'reason')).rejects.toThrow(
        'Жалоба уже обработана',
      );
    });

    it('should throw BadRequestException when rejecting already REJECTED complaint', async () => {
      // Arrange
      const rejectedComplaint = { ...mockComplaint, status: ComplaintStatus.REJECTED };
      mockComplaintRepository.findOne.mockResolvedValue(rejectedComplaint as Complaint);

      // Act & Assert
      await expect(service.reject(mockComplaintId, mockUserId, 'reason')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when rejecting non-existent complaint', async () => {
      // Arrange
      mockComplaintRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.reject('non-existent-id', mockUserId, 'reason')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a complaint', async () => {
      // Arrange
      mockComplaintRepository.findOne.mockResolvedValue(mockComplaint as Complaint);
      mockComplaintRepository.softRemove.mockResolvedValue(mockComplaint as Complaint);

      // Act
      await service.remove(mockComplaintId);

      // Assert
      expect(mockComplaintRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockComplaintId },
        relations: ['machine', 'machine.location', 'handled_by'],
      });
      expect(mockComplaintRepository.softRemove).toHaveBeenCalledWith(mockComplaint);
    });

    it('should throw NotFoundException when removing non-existent complaint', async () => {
      // Arrange
      mockComplaintRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return complaint statistics', async () => {
      // Arrange
      mockComplaintRepository.count.mockResolvedValue(20);

      const byStatus = [
        { status: ComplaintStatus.NEW, count: '10' },
        { status: ComplaintStatus.IN_REVIEW, count: '5' },
        { status: ComplaintStatus.RESOLVED, count: '4' },
        { status: ComplaintStatus.REJECTED, count: '1' },
      ];
      const byType = [
        { type: ComplaintType.PRODUCT_QUALITY, count: '8' },
        { type: ComplaintType.NO_CHANGE, count: '6' },
        { type: ComplaintType.PRODUCT_NOT_DISPENSED, count: '4' },
        { type: ComplaintType.MACHINE_DIRTY, count: '2' },
      ];

      let queryBuilderCallCount = 0;
      mockComplaintRepository.createQueryBuilder.mockImplementation(() => {
        queryBuilderCallCount++;
        const qb = {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawMany: jest.fn(),
          getRawOne: jest.fn(),
        } as any;

        if (queryBuilderCallCount === 1) {
          qb.getRawMany.mockResolvedValue(byStatus);
        } else if (queryBuilderCallCount === 2) {
          qb.getRawMany.mockResolvedValue(byType);
        } else if (queryBuilderCallCount === 3) {
          qb.getRawOne.mockResolvedValue({ avg_seconds: '3600' }); // 1 hour
        } else if (queryBuilderCallCount === 4) {
          qb.getRawOne.mockResolvedValue({ total: '150000.00' }); // Total refunds
        } else if (queryBuilderCallCount === 5) {
          qb.getRawOne.mockResolvedValue({ avg: '3.5' }); // Average rating
        }

        return qb;
      });

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 20,
        by_status: [
          { status: ComplaintStatus.NEW, count: 10 },
          { status: ComplaintStatus.IN_REVIEW, count: 5 },
          { status: ComplaintStatus.RESOLVED, count: 4 },
          { status: ComplaintStatus.REJECTED, count: 1 },
        ],
        by_type: [
          { type: ComplaintType.PRODUCT_QUALITY, count: 8 },
          { type: ComplaintType.NO_CHANGE, count: 6 },
          { type: ComplaintType.PRODUCT_NOT_DISPENSED, count: 4 },
          { type: ComplaintType.MACHINE_DIRTY, count: 2 },
        ],
        avg_resolution_time_hours: 1,
        total_refunds: 150000.0,
        avg_rating: 3.5,
      });
    });

    it('should return zero values when no data exists', async () => {
      // Arrange
      mockComplaintRepository.count.mockResolvedValue(0);
      mockComplaintRepository.createQueryBuilder.mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([]),
          getRawOne: jest.fn().mockResolvedValue(null),
        } as any;
      });

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.total).toBe(0);
      expect(result.by_status).toEqual([]);
      expect(result.by_type).toEqual([]);
      expect(result.avg_resolution_time_hours).toBe(0);
      expect(result.total_refunds).toBe(0);
      expect(result.avg_rating).toBe(0);
    });
  });

  describe('getNewComplaints', () => {
    it('should return all NEW complaints ordered by submitted_at', async () => {
      // Arrange
      const newComplaints = [
        { ...mockComplaint, status: ComplaintStatus.NEW },
        {
          ...mockComplaint,
          id: 'another-id',
          status: ComplaintStatus.NEW,
          submitted_at: new Date('2025-01-14T10:00:00Z'),
        },
      ];
      mockComplaintRepository.find.mockResolvedValue(newComplaints as Complaint[]);

      // Act
      const result = await service.getNewComplaints();

      // Assert
      expect(mockComplaintRepository.find).toHaveBeenCalledWith({
        where: {
          status: ComplaintStatus.NEW,
        },
        relations: ['machine', 'machine.location'],
        order: {
          submitted_at: 'ASC',
        },
      });
      expect(result).toEqual(newComplaints);
    });

    it('should return empty array when no new complaints exist', async () => {
      // Arrange
      mockComplaintRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getNewComplaints();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('status transition workflow', () => {
    it('should follow correct workflow: NEW -> IN_REVIEW -> RESOLVED', async () => {
      // Step 1: Create complaint (NEW)
      const newComplaint = { ...mockComplaint, status: ComplaintStatus.NEW };
      mockComplaintRepository.create.mockReturnValue(newComplaint as Complaint);
      mockComplaintRepository.save.mockResolvedValue(newComplaint as Complaint);

      const created = await service.create(createComplaintDto);
      expect(created.status).toBe(ComplaintStatus.NEW);

      // Step 2: Take in review (NEW -> IN_REVIEW)
      mockComplaintRepository.findOne.mockResolvedValue(newComplaint as Complaint);
      const inReviewComplaint = { ...newComplaint, status: ComplaintStatus.IN_REVIEW };
      mockComplaintRepository.save.mockResolvedValue(inReviewComplaint as Complaint);

      const inReview = await service.takeInReview(mockComplaintId, mockUserId);
      expect(inReview.status).toBe(ComplaintStatus.IN_REVIEW);

      // Step 3: Resolve (IN_REVIEW -> RESOLVED)
      mockComplaintRepository.findOne.mockResolvedValue(inReviewComplaint as Complaint);
      const resolvedComplaint = { ...inReviewComplaint, status: ComplaintStatus.RESOLVED };
      mockComplaintRepository.save.mockResolvedValue(resolvedComplaint as Complaint);

      const resolved = await service.resolve(mockComplaintId, mockUserId, {
        response: 'Resolved',
      });
      expect(resolved.status).toBe(ComplaintStatus.RESOLVED);
    });

    it('should allow direct resolution from NEW status', async () => {
      // Arrange
      const newComplaint = { ...mockComplaint, status: ComplaintStatus.NEW };
      mockComplaintRepository.findOne.mockResolvedValue(newComplaint as Complaint);

      const resolvedComplaint = { ...newComplaint, status: ComplaintStatus.RESOLVED };
      mockComplaintRepository.save.mockResolvedValue(resolvedComplaint as Complaint);

      // Act
      const result = await service.resolve(mockComplaintId, mockUserId, { response: 'Quick fix' });

      // Assert
      expect(result.status).toBe(ComplaintStatus.RESOLVED);
    });

    it('should allow direct rejection from NEW status', async () => {
      // Arrange
      const newComplaint = { ...mockComplaint, status: ComplaintStatus.NEW };
      mockComplaintRepository.findOne.mockResolvedValue(newComplaint as Complaint);

      const rejectedComplaint = { ...newComplaint, status: ComplaintStatus.REJECTED };
      mockComplaintRepository.save.mockResolvedValue(rejectedComplaint as Complaint);

      // Act
      const result = await service.reject(mockComplaintId, mockUserId, 'Invalid complaint');

      // Assert
      expect(result.status).toBe(ComplaintStatus.REJECTED);
    });
  });
});
