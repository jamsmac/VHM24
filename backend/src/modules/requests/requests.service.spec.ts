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

  const mockRequest: Partial<Request> = {
    id: 'req-1',
    request_number: 'REQ-2026-000001',
    status: RequestStatus.NEW,
    priority: RequestPriority.NORMAL,
    total_amount: 1000,
    created_at: new Date(),
  };

  const mockItem: Partial<RequestItem> = {
    id: 'item-1',
    request_id: 'req-1',
    material_id: 'mat-1',
    quantity: 10,
    received_quantity: null,
    is_fulfilled: false,
    request: mockRequest as Request,
  };

  const mockMaterial: Partial<Material> = {
    id: 'mat-1',
    name: 'Test Material',
    unit_price: 100,
    unit: 'kg',
    supplier_id: 'supplier-1',
  };

  let mockManager: any;
  let mockQueryRunner: any;
  let mockDataSource: any;
  let mockQB: any;
  let mockRequestRepo: any;
  let mockItemRepo: any;
  let mockMaterialRepo: any;

  beforeEach(async () => {
    mockManager = {
      create: jest.fn().mockImplementation((_, data) => ({ ...data, id: 'new-id' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: entity.id || 'new-id' })),
      update: jest.fn().mockResolvedValue({}),
    };

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: mockManager,
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    mockQB = {
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

    mockRequestRepo = {
      findOne: jest.fn().mockResolvedValue(mockRequest),
      find: jest.fn().mockResolvedValue([mockRequest]),
      update: jest.fn().mockResolvedValue({}),
      softDelete: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn().mockReturnValue(mockQB),
    };

    mockItemRepo = {
      findOne: jest.fn().mockResolvedValue(mockItem),
      find: jest.fn().mockResolvedValue([mockItem]),
      update: jest.fn().mockResolvedValue({}),
    };

    mockMaterialRepo = {
      findOne: jest.fn().mockResolvedValue(mockMaterial),
    };

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

  describe('create', () => {
    const createDto = {
      items: [
        { material_id: 'mat-1', quantity: 10 },
      ],
      priority: RequestPriority.HIGH,
      comment: 'Test comment',
      desired_delivery_date: '2025-01-15',
    };

    it('should create a new request with items', async () => {
      mockRequestRepo.findOne.mockResolvedValue({ ...mockRequest, items: [mockItem] });

      const result = await service.create('user-1', createDto);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should generate request number', async () => {
      mockRequestRepo.findOne.mockResolvedValue({ ...mockRequest, items: [mockItem] });

      await service.create('user-1', createDto);

      expect(mockManager.create).toHaveBeenCalledWith(
        Request,
        expect.objectContaining({
          request_number: expect.stringMatching(/^REQ-\d{4}-\d{6}$/),
        }),
      );
    });

    it('should increment request number from last request', async () => {
      mockQB.getOne.mockResolvedValueOnce({ request_number: 'REQ-2026-000005' });
      mockRequestRepo.findOne.mockResolvedValue({ ...mockRequest, items: [mockItem] });

      await service.create('user-1', createDto);

      expect(mockManager.create).toHaveBeenCalledWith(
        Request,
        expect.objectContaining({
          request_number: 'REQ-2026-000006',
        }),
      );
    });

    it('should use default priority NORMAL when not provided', async () => {
      mockRequestRepo.findOne.mockResolvedValue({ ...mockRequest, items: [mockItem] });

      await service.create('user-1', { items: [{ material_id: 'mat-1', quantity: 5 }] });

      expect(mockManager.create).toHaveBeenCalledWith(
        Request,
        expect.objectContaining({
          priority: RequestPriority.NORMAL,
        }),
      );
    });

    it('should throw BadRequestException when material not found', async () => {
      mockMaterialRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.create('user-1', createDto)).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should use item unit_price when provided', async () => {
      mockRequestRepo.findOne.mockResolvedValue({ ...mockRequest, items: [mockItem] });

      await service.create('user-1', {
        items: [{ material_id: 'mat-1', quantity: 10, unit_price: 200 }],
      });

      expect(mockManager.create).toHaveBeenCalledWith(
        RequestItem,
        expect.objectContaining({
          unit_price: 200,
          total_price: 2000,
        }),
      );
    });

    it('should use material unit_price when item unit_price not provided', async () => {
      mockRequestRepo.findOne.mockResolvedValue({ ...mockRequest, items: [mockItem] });

      await service.create('user-1', {
        items: [{ material_id: 'mat-1', quantity: 10 }],
      });

      expect(mockManager.create).toHaveBeenCalledWith(
        RequestItem,
        expect.objectContaining({
          unit_price: 100,
          total_price: 1000,
        }),
      );
    });

    it('should use item supplier_id when provided', async () => {
      mockRequestRepo.findOne.mockResolvedValue({ ...mockRequest, items: [mockItem] });

      await service.create('user-1', {
        items: [{ material_id: 'mat-1', quantity: 10, supplier_id: 'custom-supplier' }],
      });

      expect(mockManager.create).toHaveBeenCalledWith(
        RequestItem,
        expect.objectContaining({
          supplier_id: 'custom-supplier',
        }),
      );
    });

    it('should use item unit when provided', async () => {
      mockRequestRepo.findOne.mockResolvedValue({ ...mockRequest, items: [mockItem] });

      await service.create('user-1', {
        items: [{ material_id: 'mat-1', quantity: 10, unit: 'pcs' }],
      });

      expect(mockManager.create).toHaveBeenCalledWith(
        RequestItem,
        expect.objectContaining({
          unit: 'pcs',
        }),
      );
    });

    it('should handle null desired_delivery_date', async () => {
      mockRequestRepo.findOne.mockResolvedValue({ ...mockRequest, items: [mockItem] });

      await service.create('user-1', {
        items: [{ material_id: 'mat-1', quantity: 10 }],
      });

      expect(mockManager.create).toHaveBeenCalledWith(
        Request,
        expect.objectContaining({
          desired_delivery_date: null,
        }),
      );
    });

    it('should rollback transaction on error', async () => {
      mockManager.save.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.create('user-1', createDto)).rejects.toThrow('DB error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should calculate total amount from all items', async () => {
      mockMaterialRepo.findOne
        .mockResolvedValueOnce({ ...mockMaterial, unit_price: 100 })
        .mockResolvedValueOnce({ ...mockMaterial, id: 'mat-2', unit_price: 50 });
      mockRequestRepo.findOne.mockResolvedValue({ ...mockRequest, items: [mockItem] });

      await service.create('user-1', {
        items: [
          { material_id: 'mat-1', quantity: 10 },
          { material_id: 'mat-2', quantity: 20 },
        ],
      });

      // Total: 10*100 + 20*50 = 2000
      expect(mockManager.update).toHaveBeenCalledWith(
        Request,
        'new-id',
        expect.objectContaining({
          total_amount: 2000,
        }),
      );
    });

    it('should handle material with null unit_price', async () => {
      mockMaterialRepo.findOne.mockResolvedValueOnce({ ...mockMaterial, unit_price: null });
      mockRequestRepo.findOne.mockResolvedValue({ ...mockRequest, items: [mockItem] });

      await service.create('user-1', {
        items: [{ material_id: 'mat-1', quantity: 10 }],
      });

      expect(mockManager.create).toHaveBeenCalledWith(
        RequestItem,
        expect.objectContaining({
          unit_price: 0,
          total_price: 0,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return requests without filters', async () => {
      const result = await service.findAll();
      expect(result.items).toEqual([mockRequest]);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      await service.findAll({ status: RequestStatus.APPROVED });
      expect(mockQB.andWhere).toHaveBeenCalledWith('request.status = :status', {
        status: RequestStatus.APPROVED,
      });
    });

    it('should filter by multiple statuses', async () => {
      await service.findAll({ statuses: [RequestStatus.NEW, RequestStatus.APPROVED] });
      expect(mockQB.andWhere).toHaveBeenCalledWith('request.status IN (:...statuses)', {
        statuses: [RequestStatus.NEW, RequestStatus.APPROVED],
      });
    });

    it('should filter by priority', async () => {
      await service.findAll({ priority: RequestPriority.URGENT });
      expect(mockQB.andWhere).toHaveBeenCalledWith('request.priority = :priority', {
        priority: RequestPriority.URGENT,
      });
    });

    it('should filter by created_by_user_id', async () => {
      await service.findAll({ created_by_user_id: 'user-123' });
      expect(mockQB.andWhere).toHaveBeenCalledWith('request.created_by_user_id = :userId', {
        userId: 'user-123',
      });
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date('2025-01-01');
      const dateTo = new Date('2025-01-31');
      await service.findAll({ date_from: dateFrom, date_to: dateTo });
      expect(mockQB.andWhere).toHaveBeenCalledWith('request.created_at BETWEEN :from AND :to', {
        from: dateFrom,
        to: dateTo,
      });
    });

    it('should apply limit', async () => {
      await service.findAll({ limit: 10 });
      expect(mockQB.limit).toHaveBeenCalledWith(10);
    });

    it('should apply offset', async () => {
      await service.findAll({ offset: 20 });
      expect(mockQB.offset).toHaveBeenCalledWith(20);
    });

    it('should apply all filters together', async () => {
      await service.findAll({
        status: RequestStatus.NEW,
        priority: RequestPriority.HIGH,
        created_by_user_id: 'user-1',
        date_from: new Date('2025-01-01'),
        date_to: new Date('2025-01-31'),
        limit: 10,
        offset: 5,
      });

      expect(mockQB.andWhere).toHaveBeenCalledTimes(4);
      expect(mockQB.limit).toHaveBeenCalledWith(10);
      expect(mockQB.offset).toHaveBeenCalledWith(5);
    });

    it('should not filter by date when only date_from provided', async () => {
      await service.findAll({ date_from: new Date('2025-01-01') });
      expect(mockQB.andWhere).not.toHaveBeenCalledWith(
        'request.created_at BETWEEN :from AND :to',
        expect.any(Object),
      );
    });

    it('should not apply limit when not provided', async () => {
      await service.findAll({});
      expect(mockQB.limit).not.toHaveBeenCalled();
    });

    it('should not apply offset when not provided', async () => {
      await service.findAll({});
      expect(mockQB.offset).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return request by id', async () => {
      const result = await service.findOne('req-1');
      expect(result).toBeDefined();
      expect(mockRequestRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        relations: expect.arrayContaining(['items', 'created_by']),
      });
    });

    it('should throw NotFoundException when request not found', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByNumber', () => {
    it('should return request by number', async () => {
      const result = await service.findByNumber('REQ-2026-000001');
      expect(result).toBeDefined();
      expect(mockRequestRepo.findOne).toHaveBeenCalledWith({
        where: { request_number: 'REQ-2026-000001' },
        relations: expect.arrayContaining(['items']),
      });
    });

    it('should throw NotFoundException when request not found', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findByNumber('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update request', async () => {
      const result = await service.update('req-1', { priority: RequestPriority.HIGH });
      expect(mockRequestRepo.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should update with desired_delivery_date', async () => {
      await service.update('req-1', { desired_delivery_date: '2025-02-01' });
      expect(mockRequestRepo.update).toHaveBeenCalledWith('req-1', {
        desired_delivery_date: expect.any(Date),
      });
    });

    it('should throw BadRequestException for non-NEW request', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.APPROVED });
      await expect(service.update('req-1', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('should approve request', async () => {
      const result = await service.approve('req-1', 'user-1');
      expect(mockRequestRepo.update).toHaveBeenCalledWith('req-1', {
        status: RequestStatus.APPROVED,
        approved_by_user_id: 'user-1',
        approved_at: expect.any(Date),
        admin_notes: undefined,
      });
      expect(result).toBeDefined();
    });

    it('should approve with admin notes', async () => {
      await service.approve('req-1', 'user-1', { admin_notes: 'Approved with conditions' });
      expect(mockRequestRepo.update).toHaveBeenCalledWith('req-1', {
        status: RequestStatus.APPROVED,
        approved_by_user_id: 'user-1',
        approved_at: expect.any(Date),
        admin_notes: 'Approved with conditions',
      });
    });

    it('should throw BadRequestException for non-NEW request', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.APPROVED });
      await expect(service.approve('req-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject request', async () => {
      const result = await service.reject('req-1', 'user-1', { rejection_reason: 'Test' });
      expect(mockRequestRepo.update).toHaveBeenCalledWith('req-1', {
        status: RequestStatus.REJECTED,
        rejected_by_user_id: 'user-1',
        rejected_at: expect.any(Date),
        rejection_reason: 'Test',
      });
      expect(result).toBeDefined();
    });

    it('should reject without reason', async () => {
      await service.reject('req-1', 'user-1');
      expect(mockRequestRepo.update).toHaveBeenCalledWith('req-1', {
        status: RequestStatus.REJECTED,
        rejected_by_user_id: 'user-1',
        rejected_at: expect.any(Date),
        rejection_reason: undefined,
      });
    });

    it('should throw BadRequestException for non-NEW request', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.APPROVED });
      await expect(service.reject('req-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('markAsSent', () => {
    it('should mark request as sent', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.APPROVED });
      const result = await service.markAsSent('req-1');
      expect(mockRequestRepo.update).toHaveBeenCalledWith('req-1', {
        status: RequestStatus.SENT,
        sent_at: expect.any(Date),
        sent_message_id: undefined,
      });
      expect(result).toBeDefined();
    });

    it('should mark as sent with message id', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.APPROVED });
      await service.markAsSent('req-1', { sent_message_id: 'msg-123' });
      expect(mockRequestRepo.update).toHaveBeenCalledWith('req-1', {
        status: RequestStatus.SENT,
        sent_at: expect.any(Date),
        sent_message_id: 'msg-123',
      });
    });

    it('should throw BadRequestException for non-APPROVED request', async () => {
      await expect(service.markAsSent('req-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateReceivedQuantity', () => {
    it('should update received quantity', async () => {
      mockItemRepo.findOne
        .mockResolvedValueOnce({
          ...mockItem,
          request: { ...mockRequest, status: RequestStatus.SENT },
        })
        .mockResolvedValueOnce({ ...mockItem, received_quantity: 5 });

      const result = await service.updateReceivedQuantity('item-1', { received_quantity: 5 });

      expect(mockItemRepo.update).toHaveBeenCalledWith('item-1', {
        received_quantity: 5,
        is_fulfilled: false,
      });
      expect(result).toBeDefined();
    });

    it('should mark as fulfilled when received_quantity >= quantity', async () => {
      mockItemRepo.findOne
        .mockResolvedValueOnce({
          ...mockItem,
          quantity: 10,
          request: { ...mockRequest, status: RequestStatus.SENT },
        })
        .mockResolvedValueOnce({ ...mockItem, received_quantity: 10, is_fulfilled: true });

      await service.updateReceivedQuantity('item-1', { received_quantity: 10 });

      expect(mockItemRepo.update).toHaveBeenCalledWith('item-1', {
        received_quantity: 10,
        is_fulfilled: true,
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      mockItemRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.updateReceivedQuantity('x', { received_quantity: 5 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid request status', async () => {
      mockItemRepo.findOne.mockResolvedValueOnce({
        ...mockItem,
        request: { ...mockRequest, status: RequestStatus.NEW },
      });

      await expect(service.updateReceivedQuantity('item-1', { received_quantity: 5 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow update for PARTIAL_DELIVERED status', async () => {
      mockItemRepo.findOne
        .mockResolvedValueOnce({
          ...mockItem,
          request: { ...mockRequest, status: RequestStatus.PARTIAL_DELIVERED },
        })
        .mockResolvedValueOnce({ ...mockItem, received_quantity: 5 });

      const result = await service.updateReceivedQuantity('item-1', { received_quantity: 5 });
      expect(result).toBeDefined();
    });

    it('should update request status to COMPLETED when all items fulfilled', async () => {
      mockItemRepo.findOne
        .mockResolvedValueOnce({
          ...mockItem,
          quantity: 10,
          request: { ...mockRequest, status: RequestStatus.SENT },
        })
        .mockResolvedValueOnce({ ...mockItem, received_quantity: 10, is_fulfilled: true });

      // All items fulfilled
      mockItemRepo.find.mockResolvedValueOnce([
        { id: 'item-1', is_fulfilled: true, received_quantity: 10 },
      ]);

      await service.updateReceivedQuantity('item-1', { received_quantity: 10 });

      expect(mockRequestRepo.update).toHaveBeenCalledWith(mockItem.request_id, {
        status: RequestStatus.COMPLETED,
        completed_at: expect.any(Date),
      });
    });

    it('should update request status to PARTIAL_DELIVERED when some items fulfilled', async () => {
      mockItemRepo.findOne
        .mockResolvedValueOnce({
          ...mockItem,
          quantity: 10,
          request: { ...mockRequest, status: RequestStatus.SENT },
        })
        .mockResolvedValueOnce({ ...mockItem, received_quantity: 5, is_fulfilled: false });

      // Some items partially received
      mockItemRepo.find.mockResolvedValueOnce([
        { id: 'item-1', is_fulfilled: false, received_quantity: 5 },
        { id: 'item-2', is_fulfilled: false, received_quantity: null },
      ]);

      await service.updateReceivedQuantity('item-1', { received_quantity: 5 });

      expect(mockRequestRepo.update).toHaveBeenCalledWith(mockItem.request_id, {
        status: RequestStatus.PARTIAL_DELIVERED,
      });
    });

    it('should not update request status when no items received', async () => {
      mockItemRepo.findOne
        .mockResolvedValueOnce({
          ...mockItem,
          quantity: 10,
          request: { ...mockRequest, status: RequestStatus.SENT },
        })
        .mockResolvedValueOnce({ ...mockItem, received_quantity: null, is_fulfilled: false });

      // No items received
      mockItemRepo.find.mockResolvedValueOnce([
        { id: 'item-1', is_fulfilled: false, received_quantity: null },
        { id: 'item-2', is_fulfilled: false, received_quantity: null },
      ]);

      await service.updateReceivedQuantity('item-1', { received_quantity: null as any });

      // Should not update request status
      expect(mockRequestRepo.update).not.toHaveBeenCalled();
    });

    it('should handle null received_quantity', async () => {
      mockItemRepo.findOne
        .mockResolvedValueOnce({
          ...mockItem,
          request: { ...mockRequest, status: RequestStatus.SENT },
        })
        .mockResolvedValueOnce({ ...mockItem, received_quantity: null });

      mockItemRepo.find.mockResolvedValueOnce([
        { id: 'item-1', is_fulfilled: false, received_quantity: null },
      ]);

      await service.updateReceivedQuantity('item-1', { received_quantity: null as any });

      expect(mockItemRepo.update).toHaveBeenCalledWith('item-1', {
        received_quantity: null,
        is_fulfilled: false,
      });
    });

    it('should throw NotFoundException when updated item not found', async () => {
      mockItemRepo.findOne
        .mockResolvedValueOnce({
          ...mockItem,
          request: { ...mockRequest, status: RequestStatus.SENT },
        })
        .mockResolvedValueOnce(null);

      mockItemRepo.find.mockResolvedValueOnce([]);

      await expect(service.updateReceivedQuantity('item-1', { received_quantity: 5 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('complete', () => {
    it('should complete request', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.SENT });
      const result = await service.complete('req-1', 'user-1');
      expect(mockRequestRepo.update).toHaveBeenCalledWith('req-1', {
        status: RequestStatus.COMPLETED,
        completed_at: expect.any(Date),
        completed_by_user_id: 'user-1',
        actual_delivery_date: expect.any(Date),
        completion_notes: undefined,
      });
      expect(result).toBeDefined();
    });

    it('should complete with actual_delivery_date and notes', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.SENT });
      await service.complete('req-1', 'user-1', {
        actual_delivery_date: '2025-01-20',
        completion_notes: 'Delivered in full',
      });
      expect(mockRequestRepo.update).toHaveBeenCalledWith('req-1', {
        status: RequestStatus.COMPLETED,
        completed_at: expect.any(Date),
        completed_by_user_id: 'user-1',
        actual_delivery_date: expect.any(Date),
        completion_notes: 'Delivered in full',
      });
    });

    it('should allow completion for PARTIAL_DELIVERED status', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({
        ...mockRequest,
        status: RequestStatus.PARTIAL_DELIVERED,
      });
      const result = await service.complete('req-1', 'user-1');
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for invalid status', async () => {
      await expect(service.complete('req-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel request', async () => {
      const result = await service.cancel('req-1', 'user-1');
      expect(mockRequestRepo.update).toHaveBeenCalledWith('req-1', {
        status: RequestStatus.CANCELLED,
      });
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for COMPLETED request', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.COMPLETED });
      await expect(service.cancel('req-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for CANCELLED request', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.CANCELLED });
      await expect(service.cancel('req-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove new request', async () => {
      await expect(service.remove('req-1')).resolves.not.toThrow();
      expect(mockRequestRepo.softDelete).toHaveBeenCalledWith('req-1');
    });

    it('should throw BadRequestException for non-NEW request', async () => {
      mockRequestRepo.findOne.mockResolvedValueOnce({ ...mockRequest, status: RequestStatus.APPROVED });
      await expect(service.remove('req-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics without date filter', async () => {
      mockQB.getMany.mockResolvedValueOnce([
        { ...mockRequest, status: RequestStatus.NEW, priority: RequestPriority.NORMAL, total_amount: 1000 },
        { ...mockRequest, status: RequestStatus.APPROVED, priority: RequestPriority.HIGH, total_amount: 2000 },
      ]);

      const result = await service.getStatistics();

      expect(result.total).toBe(2);
      expect(result.byStatus[RequestStatus.NEW]).toBe(1);
      expect(result.byStatus[RequestStatus.APPROVED]).toBe(1);
      expect(result.byPriority[RequestPriority.NORMAL]).toBe(1);
      expect(result.byPriority[RequestPriority.HIGH]).toBe(1);
      expect(result.totalAmount).toBe(3000);
    });

    it('should return statistics with date filter', async () => {
      const dateFrom = new Date('2025-01-01');
      const dateTo = new Date('2025-01-31');

      mockQB.getMany.mockResolvedValueOnce([mockRequest]);

      await service.getStatistics({ date_from: dateFrom, date_to: dateTo });

      expect(mockQB.where).toHaveBeenCalledWith('request.created_at BETWEEN :from AND :to', {
        from: dateFrom,
        to: dateTo,
      });
    });

    it('should handle requests with null total_amount', async () => {
      mockQB.getMany.mockResolvedValueOnce([
        { ...mockRequest, total_amount: null },
        { ...mockRequest, total_amount: undefined },
        { ...mockRequest, total_amount: 500 },
      ]);

      const result = await service.getStatistics();

      expect(result.totalAmount).toBe(500);
    });

    it('should return zero counts for empty results', async () => {
      mockQB.getMany.mockResolvedValueOnce([]);

      const result = await service.getStatistics();

      expect(result.total).toBe(0);
      expect(result.byStatus[RequestStatus.NEW]).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });
});
