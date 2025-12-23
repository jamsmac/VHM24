import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { Request, RequestStatus, RequestPriority } from './entities/request.entity';
import { RequestItem } from './entities/request-item.entity';
import { Material } from './entities/material.entity';

describe('RequestsService', () => {
  let service: RequestsService;
  const mockRequest = { id: 'req-1', request_number: 'REQ-2025-000001', status: RequestStatus.NEW, priority: RequestPriority.NORMAL };
  const mockItem = { id: 'item-1', request_id: 'req-1', material_id: 'mat-1', quantity: 10, request: mockRequest };
  const mockMaterial = { id: 'mat-1', name: 'Test Material', unit_price: 100 };
  const mockManager = {
    create: jest.fn().mockImplementation((_, data) => data),
    save: jest.fn().mockImplementation((_, entity) => Promise.resolve({ ...entity, id: 'new-id' })),
    update: jest.fn().mockResolvedValue({}),
  };
  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: mockManager,
  };
  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };
  const mockQB = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
    getMany: jest.fn().mockResolvedValue([mockRequest]),
    getCount: jest.fn().mockResolvedValue(1),
  };
  const mockRequestRepo = {
    findOne: jest.fn().mockResolvedValue(mockRequest),
    find: jest.fn().mockResolvedValue([mockRequest]),
    update: jest.fn().mockResolvedValue({}),
    softDelete: jest.fn().mockResolvedValue({}),
    createQueryBuilder: jest.fn().mockReturnValue(mockQB),
  };
  const mockItemRepo = {
    findOne: jest.fn().mockResolvedValue(mockItem),
    find: jest.fn().mockResolvedValue([mockItem]),
    update: jest.fn().mockResolvedValue({}),
  };
  const mockMaterialRepo = {
    findOne: jest.fn().mockResolvedValue(mockMaterial),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        { provide: getRepositoryToken(Request), useValue: mockRequestRepo },
        { provide: getRepositoryToken(RequestItem), useValue: mockItemRepo },
        { provide: getRepositoryToken(Material), useValue: mockMaterialRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();
    service = module.get<RequestsService>(RequestsService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('findAll', () => {
    it('should return requests', async () => {
      const result = await service.findAll();
      expect(result.items).toEqual([mockRequest]);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return request by id', async () => {
      const result = await service.findOne('req-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByNumber', () => {
    it('should return request by number', async () => {
      const result = await service.findByNumber('REQ-2025-000001');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findByNumber('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update request', async () => {
      const result = await service.update('req-1', { priority: RequestPriority.HIGH });
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for non-NEW request', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.APPROVED });
      await expect(service.update('req-1', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('should approve request', async () => {
      const result = await service.approve('req-1', 'user-1');
      expect(mockRequestRepo.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for non-NEW request', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.APPROVED });
      await expect(service.approve('req-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject request', async () => {
      const result = await service.reject('req-1', 'user-1', { rejection_reason: 'Test' });
      expect(mockRequestRepo.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('markAsSent', () => {
    it('should mark request as sent', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.APPROVED });
      const result = await service.markAsSent('req-1');
      expect(mockRequestRepo.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for non-APPROVED request', async () => {
      await expect(service.markAsSent('req-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete', () => {
    it('should complete request', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.SENT });
      const result = await service.complete('req-1', 'user-1');
      expect(mockRequestRepo.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for invalid status', async () => {
      await expect(service.complete('req-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel request', async () => {
      const result = await service.cancel('req-1', 'user-1');
      expect(mockRequestRepo.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for COMPLETED request', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.COMPLETED });
      await expect(service.cancel('req-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove new request', async () => {
      await expect(service.remove('req-1')).resolves.not.toThrow();
      expect(mockRequestRepo.softDelete).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-NEW request', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.APPROVED });
      await expect(service.remove('req-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      mockQB.getMany.mockResolvedValueOnce([mockRequest]);
      const result = await service.getStatistics();
      expect(result.total).toBe(1);
    });
  });
});
