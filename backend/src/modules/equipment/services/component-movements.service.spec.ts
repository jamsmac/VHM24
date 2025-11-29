import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ComponentMovementsService } from './component-movements.service';
import { ComponentMovement, MovementType } from '../entities/component-movement.entity';
import { EquipmentComponent, ComponentLocationType } from '../entities/equipment-component.entity';

describe('ComponentMovementsService', () => {
  let service: ComponentMovementsService;
  let mockMovementRepository: any;
  let mockComponentRepository: any;

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockMovementRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    mockComponentRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComponentMovementsService,
        {
          provide: getRepositoryToken(ComponentMovement),
          useValue: mockMovementRepository,
        },
        {
          provide: getRepositoryToken(EquipmentComponent),
          useValue: mockComponentRepository,
        },
      ],
    }).compile();

    service = module.get<ComponentMovementsService>(ComponentMovementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMovement', () => {
    it('should create a movement and update component location', async () => {
      const existingComponent = {
        id: 'comp-123',
        current_location_type: ComponentLocationType.WAREHOUSE,
        current_location_ref: null,
      };

      const mockMovement = {
        id: 'mov-123',
        component_id: 'comp-123',
        from_location_type: ComponentLocationType.WAREHOUSE,
        to_location_type: ComponentLocationType.MACHINE,
        movement_type: MovementType.INSTALL,
      };

      mockComponentRepository.findOne.mockResolvedValue(existingComponent);
      mockMovementRepository.create.mockReturnValue(mockMovement);
      mockMovementRepository.save.mockResolvedValue(mockMovement);
      mockComponentRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.createMovement({
        componentId: 'comp-123',
        toLocationType: ComponentLocationType.MACHINE,
        toLocationRef: 'machine-456',
        movementType: MovementType.INSTALL,
        relatedMachineId: 'machine-456',
        performedByUserId: 'user-123',
        comment: 'Installed new component',
      });

      expect(result).toEqual(mockMovement);
      expect(mockComponentRepository.update).toHaveBeenCalledWith('comp-123', {
        current_location_type: ComponentLocationType.MACHINE,
        current_location_ref: 'machine-456',
        machine_id: 'machine-456',
      });
    });

    it('should throw BadRequestException when component not found', async () => {
      mockComponentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createMovement({
          componentId: 'nonexistent',
          toLocationType: ComponentLocationType.MACHINE,
          movementType: MovementType.INSTALL,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createMovement({
          componentId: 'nonexistent',
          toLocationType: ComponentLocationType.MACHINE,
          movementType: MovementType.INSTALL,
        }),
      ).rejects.toThrow('Component with ID nonexistent not found');
    });

    it('should throw BadRequestException when moving to same location', async () => {
      const existingComponent = {
        id: 'comp-123',
        current_location_type: ComponentLocationType.WAREHOUSE,
        current_location_ref: null,
      };

      mockComponentRepository.findOne.mockResolvedValue(existingComponent);

      await expect(
        service.createMovement({
          componentId: 'comp-123',
          toLocationType: ComponentLocationType.WAREHOUSE,
          movementType: MovementType.MOVE_TO_WAREHOUSE,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createMovement({
          componentId: 'comp-123',
          toLocationType: ComponentLocationType.WAREHOUSE,
          movementType: MovementType.MOVE_TO_WAREHOUSE,
        }),
      ).rejects.toThrow('Cannot move to the same location');
    });

    it('should validate INSTALL movement can only be from warehouse to machine', async () => {
      const existingComponent = {
        id: 'comp-123',
        current_location_type: ComponentLocationType.MACHINE,
        current_location_ref: 'machine-123',
      };

      mockComponentRepository.findOne.mockResolvedValue(existingComponent);

      await expect(
        service.createMovement({
          componentId: 'comp-123',
          toLocationType: ComponentLocationType.WAREHOUSE,
          movementType: MovementType.INSTALL,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate REMOVE movement can only be from machine', async () => {
      const existingComponent = {
        id: 'comp-123',
        current_location_type: ComponentLocationType.WAREHOUSE,
        current_location_ref: null,
      };

      mockComponentRepository.findOne.mockResolvedValue(existingComponent);

      await expect(
        service.createMovement({
          componentId: 'comp-123',
          toLocationType: ComponentLocationType.MACHINE,
          movementType: MovementType.REMOVE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate SEND_TO_WASH movement destinations', async () => {
      const existingComponent = {
        id: 'comp-123',
        current_location_type: ComponentLocationType.WAREHOUSE,
        current_location_ref: null,
      };

      mockComponentRepository.findOne.mockResolvedValue(existingComponent);

      await expect(
        service.createMovement({
          componentId: 'comp-123',
          toLocationType: ComponentLocationType.REPAIR,
          movementType: MovementType.SEND_TO_WASH,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate RETURN_FROM_WASH movement origins', async () => {
      const existingComponent = {
        id: 'comp-123',
        current_location_type: ComponentLocationType.REPAIR,
        current_location_ref: null,
      };

      mockComponentRepository.findOne.mockResolvedValue(existingComponent);

      await expect(
        service.createMovement({
          componentId: 'comp-123',
          toLocationType: ComponentLocationType.WAREHOUSE,
          movementType: MovementType.RETURN_FROM_WASH,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should clear machine_id when not moving to machine', async () => {
      const existingComponent = {
        id: 'comp-123',
        current_location_type: ComponentLocationType.MACHINE,
        current_location_ref: 'machine-123',
        machine_id: 'machine-123',
      };

      mockComponentRepository.findOne.mockResolvedValue(existingComponent);
      mockMovementRepository.create.mockReturnValue({ id: 'mov-123' });
      mockMovementRepository.save.mockResolvedValue({ id: 'mov-123' });
      mockComponentRepository.update.mockResolvedValue({ affected: 1 });

      await service.createMovement({
        componentId: 'comp-123',
        toLocationType: ComponentLocationType.WAREHOUSE,
        movementType: MovementType.REMOVE,
      });

      expect(mockComponentRepository.update).toHaveBeenCalledWith('comp-123', {
        current_location_type: ComponentLocationType.WAREHOUSE,
        current_location_ref: null,
        machine_id: null,
      });
    });

    it('should handle optional fields', async () => {
      const existingComponent = {
        id: 'comp-123',
        current_location_type: ComponentLocationType.WAREHOUSE,
        current_location_ref: null,
      };

      mockComponentRepository.findOne.mockResolvedValue(existingComponent);
      mockMovementRepository.create.mockReturnValue({ id: 'mov-123' });
      mockMovementRepository.save.mockResolvedValue({ id: 'mov-123' });
      mockComponentRepository.update.mockResolvedValue({ affected: 1 });

      await service.createMovement({
        componentId: 'comp-123',
        toLocationType: ComponentLocationType.MACHINE,
        movementType: MovementType.INSTALL,
      });

      expect(mockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          to_location_ref: null,
          related_machine_id: null,
          task_id: null,
          performed_by_user_id: null,
          comment: null,
        }),
      );
    });
  });

  describe('getComponentHistory', () => {
    it('should return movement history for a component', async () => {
      const mockHistory = [
        { id: 'mov-1', moved_at: new Date('2025-01-15') },
        { id: 'mov-2', moved_at: new Date('2025-01-01') },
      ];

      mockMovementRepository.find.mockResolvedValue(mockHistory);

      const result = await service.getComponentHistory('comp-123');

      expect(result).toEqual(mockHistory);
      expect(mockMovementRepository.find).toHaveBeenCalledWith({
        where: { component_id: 'comp-123' },
        relations: ['related_machine', 'task', 'performed_by'],
        order: { moved_at: 'DESC' },
      });
    });

    it('should return empty array when no history exists', async () => {
      mockMovementRepository.find.mockResolvedValue([]);

      const result = await service.getComponentHistory('comp-456');

      expect(result).toEqual([]);
    });
  });

  describe('getLastMovement', () => {
    it('should return the most recent movement', async () => {
      const mockMovement = {
        id: 'mov-123',
        moved_at: new Date('2025-01-15'),
      };

      mockMovementRepository.findOne.mockResolvedValue(mockMovement);

      const result = await service.getLastMovement('comp-123');

      expect(result).toEqual(mockMovement);
      expect(mockMovementRepository.findOne).toHaveBeenCalledWith({
        where: { component_id: 'comp-123' },
        relations: ['related_machine', 'task', 'performed_by'],
        order: { moved_at: 'DESC' },
      });
    });

    it('should return null when no movements exist', async () => {
      mockMovementRepository.findOne.mockResolvedValue(null);

      const result = await service.getLastMovement('comp-456');

      expect(result).toBeNull();
    });
  });

  describe('getMovementsByDateRange', () => {
    it('should return movements within date range', async () => {
      const mockMovements = [
        { id: 'mov-1', moved_at: new Date('2025-01-10') },
        { id: 'mov-2', moved_at: new Date('2025-01-05') },
      ];

      const qb = mockMovementRepository.createQueryBuilder();
      qb.getMany.mockResolvedValue(mockMovements);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await service.getMovementsByDateRange(startDate, endDate);

      expect(result).toEqual(mockMovements);
      expect(qb.where).toHaveBeenCalledWith('movement.moved_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    });

    it('should return empty array when no movements in range', async () => {
      const qb = mockMovementRepository.createQueryBuilder();
      qb.getMany.mockResolvedValue([]);

      const result = await service.getMovementsByDateRange(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result).toEqual([]);
    });
  });
});
