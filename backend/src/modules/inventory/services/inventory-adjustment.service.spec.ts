import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryAdjustmentService } from './inventory-adjustment.service';
import {
  InventoryAdjustment,
  AdjustmentStatus,
  AdjustmentReason,
} from '../entities/inventory-adjustment.entity';
import { WarehouseInventory } from '../entities/warehouse-inventory.entity';
import { OperatorInventory } from '../entities/operator-inventory.entity';
import { MachineInventory } from '../entities/machine-inventory.entity';
import { InventoryLevelType } from '../entities/inventory-actual-count.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { createMockRepository } from '@/test/helpers';
import { ApproveAdjustmentDto } from '../dto/inventory-adjustment.dto';

/**
 * Unit Tests for InventoryAdjustmentService
 *
 * Tests the workflow for inventory adjustments including:
 * - Creating adjustments (with/without approval)
 * - Approving/Rejecting adjustments
 * - Applying adjustments to inventory
 * - Canceling adjustments
 */
describe('InventoryAdjustmentService', () => {
  let service: InventoryAdjustmentService;
  let adjustmentRepo: any;
  let warehouseInventoryRepo: any;
  let operatorInventoryRepo: any;
  let machineInventoryRepo: any;
  let notificationsService: any;

  // Test fixtures
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testNomenclatureId = '22222222-2222-2222-2222-222222222222';
  const testOperatorId = '33333333-3333-3333-3333-333333333333';
  const testMachineId = '44444444-4444-4444-4444-444444444444';

  beforeEach(async () => {
    adjustmentRepo = createMockRepository<InventoryAdjustment>();
    warehouseInventoryRepo = createMockRepository<WarehouseInventory>();
    operatorInventoryRepo = createMockRepository<OperatorInventory>();
    machineInventoryRepo = createMockRepository<MachineInventory>();

    notificationsService = {
      create: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryAdjustmentService,
        {
          provide: getRepositoryToken(InventoryAdjustment),
          useValue: adjustmentRepo,
        },
        {
          provide: getRepositoryToken(WarehouseInventory),
          useValue: warehouseInventoryRepo,
        },
        {
          provide: getRepositoryToken(OperatorInventory),
          useValue: operatorInventoryRepo,
        },
        {
          provide: getRepositoryToken(MachineInventory),
          useValue: machineInventoryRepo,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    }).compile();

    service = module.get<InventoryAdjustmentService>(InventoryAdjustmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAdjustment', () => {
    it('should create adjustment with PENDING status when approval required', async () => {
      // Arrange
      const dto = {
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        old_quantity: 100,
        new_quantity: 95,
        reason: AdjustmentReason.INVENTORY_DIFFERENCE,
        comment: 'Discrepancy found during count',
        requires_approval: true,
      };

      const createdAdjustment = {
        id: 'adj-1',
        ...dto,
        adjustment_quantity: -5,
        status: AdjustmentStatus.PENDING,
        created_by_user_id: testUserId,
      };

      adjustmentRepo.create.mockReturnValue(createdAdjustment);
      adjustmentRepo.save.mockResolvedValue(createdAdjustment);
      adjustmentRepo.findOne.mockResolvedValue(createdAdjustment);

      // Act
      const result = await service.createAdjustment(dto, testUserId);

      // Assert
      expect(result.status).toBe(AdjustmentStatus.PENDING);
      expect(result.adjustment_quantity).toBe(-5);
      expect(adjustmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          adjustment_quantity: -5,
          requires_approval: true,
          status: AdjustmentStatus.PENDING,
        }),
      );
    });

    it('should auto-approve and apply adjustment when approval not required', async () => {
      // Arrange
      const dto = {
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        old_quantity: 100,
        new_quantity: 110,
        reason: AdjustmentReason.CORRECTION,
        requires_approval: false,
      };

      const createdAdjustment = {
        id: 'adj-1',
        ...dto,
        adjustment_quantity: 10,
        status: AdjustmentStatus.APPROVED,
        created_by_user_id: testUserId,
      };

      const machineInventory = {
        id: 'inv-1',
        machine_id: testMachineId,
        nomenclature_id: testNomenclatureId,
        current_quantity: 100,
      };

      adjustmentRepo.create.mockReturnValue(createdAdjustment);
      adjustmentRepo.save
        .mockResolvedValueOnce(createdAdjustment) // First save from createAdjustment
        .mockResolvedValueOnce({ ...createdAdjustment, status: AdjustmentStatus.APPLIED }); // Save from applyAdjustment
      adjustmentRepo.findOne
        .mockResolvedValueOnce(createdAdjustment) // 1. findOne in applyAdjustment (line 215)
        .mockResolvedValueOnce({ ...createdAdjustment, status: AdjustmentStatus.APPLIED }) // 2. findOne in applyAdjustment return (line 255)
        .mockResolvedValueOnce({ ...createdAdjustment, status: AdjustmentStatus.APPLIED }); // 3. Final findOne in createAdjustment (line 87)
      machineInventoryRepo.findOne.mockResolvedValue(machineInventory);
      machineInventoryRepo.save.mockResolvedValue({ ...machineInventory, current_quantity: 110 });

      // Act
      const result = await service.createAdjustment(dto, testUserId);

      // Assert
      expect(adjustmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AdjustmentStatus.APPROVED,
        }),
      );
    });

    it('should send approval notification when approval required', async () => {
      // Arrange
      const dto = {
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.WAREHOUSE,
        level_ref_id: 'warehouse-1',
        old_quantity: 500,
        new_quantity: 450,
        reason: AdjustmentReason.DAMAGE,
        requires_approval: true,
      };

      const createdAdjustment = {
        id: 'adj-1',
        ...dto,
        adjustment_quantity: -50,
        status: AdjustmentStatus.PENDING,
        created_by_user_id: testUserId,
      };

      adjustmentRepo.create.mockReturnValue(createdAdjustment);
      adjustmentRepo.save.mockResolvedValue(createdAdjustment);
      adjustmentRepo.findOne.mockResolvedValue(createdAdjustment);

      // Act
      await service.createAdjustment(dto, testUserId);

      // Assert
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('согласование'),
        }),
      );
    });

    it('should calculate positive adjustment_quantity for increase', async () => {
      // Arrange
      const dto = {
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.WAREHOUSE,
        level_ref_id: 'warehouse-1',
        old_quantity: 100,
        new_quantity: 150, // Increase
        reason: AdjustmentReason.RETURN,
        requires_approval: true,
      };

      const createdAdjustment = {
        id: 'adj-1',
        ...dto,
        adjustment_quantity: 50,
        status: AdjustmentStatus.PENDING,
      };

      adjustmentRepo.create.mockReturnValue(createdAdjustment);
      adjustmentRepo.save.mockResolvedValue(createdAdjustment);
      adjustmentRepo.findOne.mockResolvedValue(createdAdjustment);

      // Act
      const result = await service.createAdjustment(dto, testUserId);

      // Assert
      expect(result.adjustment_quantity).toBe(50);
    });
  });

  describe('findAll', () => {
    it('should return adjustments with pagination', async () => {
      // Arrange
      const adjustments = [
        { id: 'adj-1', status: AdjustmentStatus.PENDING },
        { id: 'adj-2', status: AdjustmentStatus.APPROVED },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(adjustments),
      };

      adjustmentRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const filters = { limit: 10, offset: 0 };

      // Act
      const result = await service.findAll(filters);

      // Assert
      expect(result.data).toEqual(adjustments);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      // Arrange
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      adjustmentRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const filters = { status: AdjustmentStatus.PENDING };

      // Act
      await service.findAll(filters);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('adjustment.status = :status', {
        status: AdjustmentStatus.PENDING,
      });
    });

    it('should filter by level_type', async () => {
      // Arrange
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      adjustmentRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const filters = { level_type: InventoryLevelType.MACHINE };

      // Act
      await service.findAll(filters);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('adjustment.level_type = :level_type', {
        level_type: InventoryLevelType.MACHINE,
      });
    });

    it('should filter by nomenclature_id', async () => {
      // Arrange
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      adjustmentRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const filters = { nomenclature_id: testNomenclatureId };

      // Act
      await service.findAll(filters);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'adjustment.nomenclature_id = :nomenclature_id',
        { nomenclature_id: testNomenclatureId },
      );
    });
  });

  describe('findOne', () => {
    it('should return adjustment by ID', async () => {
      // Arrange
      const adjustment = {
        id: 'adj-1',
        nomenclature_id: testNomenclatureId,
        status: AdjustmentStatus.PENDING,
      };

      adjustmentRepo.findOne.mockResolvedValue(adjustment);

      // Act
      const result = await service.findOne('adj-1');

      // Assert
      expect(result).toEqual(adjustment);
      expect(adjustmentRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'adj-1' },
        relations: ['nomenclature', 'created_by', 'approved_by', 'actual_count'],
      });
    });

    it('should throw NotFoundException if adjustment not found', async () => {
      // Arrange
      adjustmentRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveOrReject', () => {
    it('should approve pending adjustment and apply it', async () => {
      // Arrange
      const pendingAdjustment = {
        id: 'adj-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        old_quantity: 100,
        new_quantity: 95,
        adjustment_quantity: -5,
        status: AdjustmentStatus.PENDING,
        created_by_user_id: 'creator-user',
      };

      const machineInventory = {
        id: 'inv-1',
        machine_id: testMachineId,
        nomenclature_id: testNomenclatureId,
        current_quantity: 100,
      };

      adjustmentRepo.findOne
        .mockResolvedValueOnce(pendingAdjustment) // 1. findOne in approveOrReject (line 176)
        .mockResolvedValueOnce({ ...pendingAdjustment, status: AdjustmentStatus.APPROVED }) // 2. findOne in applyAdjustment (line 215)
        .mockResolvedValueOnce({ ...pendingAdjustment, status: AdjustmentStatus.APPLIED }) // 3. findOne in applyAdjustment return (line 255)
        .mockResolvedValueOnce({ ...pendingAdjustment, status: AdjustmentStatus.APPLIED }); // 4. Final findOne in approveOrReject (line 208)

      adjustmentRepo.save.mockResolvedValue({});
      machineInventoryRepo.findOne.mockResolvedValue(machineInventory);
      machineInventoryRepo.save.mockResolvedValue({ ...machineInventory, current_quantity: 95 });

      const dto: ApproveAdjustmentDto = {
        status: AdjustmentStatus.APPROVED as AdjustmentStatus.APPROVED,
        comment: 'Approved after review',
      };

      // Act
      const result = await service.approveOrReject('adj-1', dto, testUserId);

      // Assert
      expect(adjustmentRepo.save).toHaveBeenCalled();
      expect(machineInventoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          current_quantity: 95,
        }),
      );
    });

    it('should reject pending adjustment without applying', async () => {
      // Arrange
      const pendingAdjustment = {
        id: 'adj-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        status: AdjustmentStatus.PENDING,
        created_by_user_id: 'creator-user',
      };

      adjustmentRepo.findOne
        .mockResolvedValueOnce(pendingAdjustment)
        .mockResolvedValueOnce({ ...pendingAdjustment, status: AdjustmentStatus.REJECTED });

      adjustmentRepo.save.mockResolvedValue({});

      const dto: ApproveAdjustmentDto = {
        status: AdjustmentStatus.REJECTED as AdjustmentStatus.REJECTED,
        comment: 'Rejected - insufficient evidence',
      };

      // Act
      const result = await service.approveOrReject('adj-1', dto, testUserId);

      // Assert
      expect(machineInventoryRepo.save).not.toHaveBeenCalled();
      expect(notificationsService.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when approving non-PENDING adjustment', async () => {
      // Arrange
      const appliedAdjustment = {
        id: 'adj-1',
        status: AdjustmentStatus.APPLIED,
      };

      adjustmentRepo.findOne.mockResolvedValue(appliedAdjustment);

      const dto: ApproveAdjustmentDto = {
        status: AdjustmentStatus.APPROVED as AdjustmentStatus.APPROVED,
      };

      // Act & Assert
      await expect(service.approveOrReject('adj-1', dto, testUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should store approval comment in metadata', async () => {
      // Arrange
      const pendingAdjustment = {
        id: 'adj-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.WAREHOUSE,
        level_ref_id: 'warehouse-1',
        status: AdjustmentStatus.PENDING,
        created_by_user_id: 'creator-user',
        metadata: null,
      };

      const warehouseInventory = {
        id: 'inv-1',
        nomenclature_id: testNomenclatureId,
        current_quantity: 100,
      };

      adjustmentRepo.findOne
        .mockResolvedValueOnce(pendingAdjustment) // 1. findOne in approveOrReject
        .mockResolvedValueOnce({ ...pendingAdjustment, status: AdjustmentStatus.APPROVED }) // 2. findOne in applyAdjustment
        .mockResolvedValueOnce({ ...pendingAdjustment, status: AdjustmentStatus.APPLIED }) // 3. findOne in applyAdjustment return
        .mockResolvedValueOnce({ ...pendingAdjustment, status: AdjustmentStatus.APPLIED }); // 4. Final findOne in approveOrReject

      adjustmentRepo.save.mockImplementation((adj: any) => Promise.resolve(adj));
      warehouseInventoryRepo.findOne.mockResolvedValue(warehouseInventory);
      warehouseInventoryRepo.save.mockResolvedValue(warehouseInventory);

      const dto: ApproveAdjustmentDto = {
        status: AdjustmentStatus.APPROVED as AdjustmentStatus.APPROVED,
        comment: 'Approved with comment',
      };

      // Act
      await service.approveOrReject('adj-1', dto, testUserId);

      // Assert
      expect(adjustmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            approval_comment: 'Approved with comment',
          }),
        }),
      );
    });
  });

  describe('applyAdjustment', () => {
    it('should apply adjustment to warehouse inventory', async () => {
      // Arrange
      const adjustment = {
        id: 'adj-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.WAREHOUSE,
        level_ref_id: 'warehouse-1',
        new_quantity: 450,
        status: AdjustmentStatus.APPROVED,
      };

      const warehouseInventory = {
        id: 'inv-1',
        nomenclature_id: testNomenclatureId,
        current_quantity: 500,
      };

      adjustmentRepo.findOne
        .mockResolvedValueOnce(adjustment)
        .mockResolvedValueOnce({ ...adjustment, status: AdjustmentStatus.APPLIED });

      warehouseInventoryRepo.findOne.mockResolvedValue(warehouseInventory);
      warehouseInventoryRepo.save.mockResolvedValue({
        ...warehouseInventory,
        current_quantity: 450,
      });
      adjustmentRepo.save.mockResolvedValue({});

      // Act
      const result = await service.applyAdjustment('adj-1', testUserId);

      // Assert
      expect(warehouseInventoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          current_quantity: 450,
        }),
      );
    });

    it('should apply adjustment to operator inventory', async () => {
      // Arrange
      const adjustment = {
        id: 'adj-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.OPERATOR,
        level_ref_id: testOperatorId,
        new_quantity: 75,
        status: AdjustmentStatus.APPROVED,
      };

      const operatorInventory = {
        id: 'inv-1',
        operator_id: testOperatorId,
        nomenclature_id: testNomenclatureId,
        current_quantity: 80,
      };

      adjustmentRepo.findOne
        .mockResolvedValueOnce(adjustment)
        .mockResolvedValueOnce({ ...adjustment, status: AdjustmentStatus.APPLIED });

      operatorInventoryRepo.findOne.mockResolvedValue(operatorInventory);
      operatorInventoryRepo.save.mockResolvedValue({ ...operatorInventory, current_quantity: 75 });
      adjustmentRepo.save.mockResolvedValue({});

      // Act
      const result = await service.applyAdjustment('adj-1', testUserId);

      // Assert
      expect(operatorInventoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          current_quantity: 75,
        }),
      );
    });

    it('should apply adjustment to machine inventory', async () => {
      // Arrange
      const adjustment = {
        id: 'adj-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        new_quantity: 30,
        status: AdjustmentStatus.APPROVED,
      };

      const machineInventory = {
        id: 'inv-1',
        machine_id: testMachineId,
        nomenclature_id: testNomenclatureId,
        current_quantity: 25,
      };

      adjustmentRepo.findOne
        .mockResolvedValueOnce(adjustment)
        .mockResolvedValueOnce({ ...adjustment, status: AdjustmentStatus.APPLIED });

      machineInventoryRepo.findOne.mockResolvedValue(machineInventory);
      machineInventoryRepo.save.mockResolvedValue({ ...machineInventory, current_quantity: 30 });
      adjustmentRepo.save.mockResolvedValue({});

      // Act
      const result = await service.applyAdjustment('adj-1', testUserId);

      // Assert
      expect(machineInventoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          current_quantity: 30,
        }),
      );
    });

    it('should throw BadRequestException when adjustment already applied', async () => {
      // Arrange
      const appliedAdjustment = {
        id: 'adj-1',
        status: AdjustmentStatus.APPLIED,
      };

      adjustmentRepo.findOne.mockResolvedValue(appliedAdjustment);

      // Act & Assert
      await expect(service.applyAdjustment('adj-1', testUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.applyAdjustment('adj-1', testUserId)).rejects.toThrow(
        'Adjustment already applied',
      );
    });

    it('should throw BadRequestException when adjustment is REJECTED or CANCELLED', async () => {
      // Arrange
      const rejectedAdjustment = {
        id: 'adj-1',
        status: AdjustmentStatus.REJECTED,
      };

      adjustmentRepo.findOne.mockResolvedValue(rejectedAdjustment);

      // Act & Assert
      await expect(service.applyAdjustment('adj-1', testUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when inventory not found', async () => {
      // Arrange
      const adjustment = {
        id: 'adj-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.WAREHOUSE,
        level_ref_id: 'warehouse-1',
        new_quantity: 100,
        status: AdjustmentStatus.APPROVED,
      };

      adjustmentRepo.findOne.mockResolvedValue(adjustment);
      warehouseInventoryRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.applyAdjustment('adj-1', testUserId)).rejects.toThrow(NotFoundException);
    });

    it('should update applied_at timestamp', async () => {
      // Arrange
      const adjustment = {
        id: 'adj-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        new_quantity: 50,
        status: AdjustmentStatus.APPROVED,
      };

      const machineInventory = {
        id: 'inv-1',
        machine_id: testMachineId,
        nomenclature_id: testNomenclatureId,
        current_quantity: 45,
      };

      adjustmentRepo.findOne
        .mockResolvedValueOnce(adjustment)
        .mockResolvedValueOnce({ ...adjustment, status: AdjustmentStatus.APPLIED });

      machineInventoryRepo.findOne.mockResolvedValue(machineInventory);
      machineInventoryRepo.save.mockResolvedValue({ ...machineInventory, current_quantity: 50 });
      adjustmentRepo.save.mockImplementation((adj: any) => Promise.resolve(adj));

      // Act
      await service.applyAdjustment('adj-1', testUserId);

      // Assert
      expect(adjustmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AdjustmentStatus.APPLIED,
          applied_at: expect.any(Date),
        }),
      );
    });
  });

  describe('cancelAdjustment', () => {
    it('should cancel pending adjustment', async () => {
      // Arrange
      const pendingAdjustment = {
        id: 'adj-1',
        status: AdjustmentStatus.PENDING,
        metadata: null,
      };

      adjustmentRepo.findOne
        .mockResolvedValueOnce(pendingAdjustment)
        .mockResolvedValueOnce({ ...pendingAdjustment, status: AdjustmentStatus.CANCELLED });

      adjustmentRepo.save.mockImplementation((adj: any) => Promise.resolve(adj));

      // Act
      const result = await service.cancelAdjustment('adj-1', testUserId);

      // Assert
      expect(adjustmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AdjustmentStatus.CANCELLED,
          metadata: expect.objectContaining({
            cancelled_by_user_id: testUserId,
            cancelled_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should cancel approved but not applied adjustment', async () => {
      // Arrange
      const approvedAdjustment = {
        id: 'adj-1',
        status: AdjustmentStatus.APPROVED,
        metadata: null,
      };

      adjustmentRepo.findOne
        .mockResolvedValueOnce(approvedAdjustment)
        .mockResolvedValueOnce({ ...approvedAdjustment, status: AdjustmentStatus.CANCELLED });

      adjustmentRepo.save.mockImplementation((adj: any) => Promise.resolve(adj));

      // Act
      const result = await service.cancelAdjustment('adj-1', testUserId);

      // Assert
      expect(adjustmentRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when canceling applied adjustment', async () => {
      // Arrange
      const appliedAdjustment = {
        id: 'adj-1',
        status: AdjustmentStatus.APPLIED,
      };

      adjustmentRepo.findOne.mockResolvedValue(appliedAdjustment);

      // Act & Assert
      await expect(service.cancelAdjustment('adj-1', testUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancelAdjustment('adj-1', testUserId)).rejects.toThrow(
        'Cannot cancel applied adjustment',
      );
    });

    it('should preserve existing metadata when canceling', async () => {
      // Arrange
      const pendingAdjustment = {
        id: 'adj-1',
        status: AdjustmentStatus.PENDING,
        metadata: { original_data: 'some value' },
      };

      adjustmentRepo.findOne
        .mockResolvedValueOnce(pendingAdjustment)
        .mockResolvedValueOnce({ ...pendingAdjustment, status: AdjustmentStatus.CANCELLED });

      adjustmentRepo.save.mockImplementation((adj: any) => Promise.resolve(adj));

      // Act
      await service.cancelAdjustment('adj-1', testUserId);

      // Assert
      expect(adjustmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            original_data: 'some value',
            cancelled_by_user_id: testUserId,
          }),
        }),
      );
    });
  });

  describe('Notification tests', () => {
    it('should send status notification when adjustment approved', async () => {
      // Arrange
      const pendingAdjustment = {
        id: 'adj-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        status: AdjustmentStatus.PENDING,
        created_by_user_id: 'creator-user',
        adjustment_quantity: 10,
        nomenclature: { name: 'Coffee Beans' },
        approved_by: { full_name: 'Manager' },
      };

      const machineInventory = {
        id: 'inv-1',
        current_quantity: 100,
      };

      adjustmentRepo.findOne
        .mockResolvedValueOnce(pendingAdjustment) // 1. findOne in approveOrReject
        .mockResolvedValueOnce({ ...pendingAdjustment, status: AdjustmentStatus.APPROVED }) // 2. findOne in applyAdjustment
        .mockResolvedValueOnce({ ...pendingAdjustment, status: AdjustmentStatus.APPLIED }) // 3. findOne in applyAdjustment return
        .mockResolvedValueOnce({ ...pendingAdjustment, status: AdjustmentStatus.APPLIED }); // 4. Final findOne in approveOrReject

      adjustmentRepo.save.mockResolvedValue({});
      machineInventoryRepo.findOne.mockResolvedValue(machineInventory);
      machineInventoryRepo.save.mockResolvedValue(machineInventory);

      const dto: ApproveAdjustmentDto = {
        status: AdjustmentStatus.APPROVED as AdjustmentStatus.APPROVED,
      };

      // Act
      await service.approveOrReject('adj-1', dto, testUserId);

      // Assert - Should send notification to creator
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: 'creator-user',
          title: expect.stringContaining('одобрена'),
        }),
      );
    });

    it('should send status notification when adjustment rejected', async () => {
      // Arrange
      const pendingAdjustment = {
        id: 'adj-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        status: AdjustmentStatus.PENDING,
        created_by_user_id: 'creator-user',
        adjustment_quantity: 10,
        nomenclature: { name: 'Coffee Beans' },
        approved_by: { full_name: 'Manager' },
      };

      adjustmentRepo.findOne
        .mockResolvedValueOnce(pendingAdjustment)
        .mockResolvedValueOnce({ ...pendingAdjustment, status: AdjustmentStatus.REJECTED });

      adjustmentRepo.save.mockResolvedValue({});

      const dto: ApproveAdjustmentDto = {
        status: AdjustmentStatus.REJECTED as AdjustmentStatus.REJECTED,
      };

      // Act
      await service.approveOrReject('adj-1', dto, testUserId);

      // Assert
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: 'creator-user',
          title: expect.stringContaining('отклонена'),
        }),
      );
    });
  });

  describe('Reason translation', () => {
    it('should include translated reason in approval notification', async () => {
      // Arrange
      const dto = {
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.WAREHOUSE,
        level_ref_id: 'warehouse-1',
        old_quantity: 100,
        new_quantity: 90,
        reason: AdjustmentReason.DAMAGE,
        requires_approval: true,
      };

      const createdAdjustment = {
        id: 'adj-1',
        ...dto,
        adjustment_quantity: -10,
        status: AdjustmentStatus.PENDING,
        created_by_user_id: testUserId,
        nomenclature: { name: 'Coffee Beans' },
      };

      adjustmentRepo.create.mockReturnValue(createdAdjustment);
      adjustmentRepo.save.mockResolvedValue(createdAdjustment);
      adjustmentRepo.findOne.mockResolvedValue(createdAdjustment);

      // Act
      await service.createAdjustment(dto, testUserId);

      // Assert
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Повреждение товара'),
        }),
      );
    });
  });
});
