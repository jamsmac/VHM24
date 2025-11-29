import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ComponentsService } from './components.service';
import {
  EquipmentComponent,
  ComponentType,
  ComponentStatus,
} from '../entities/equipment-component.entity';

describe('ComponentsService', () => {
  let service: ComponentsService;
  let mockRepository: any;
  let mockQueryBuilder: any;

  const mockComponent: Partial<EquipmentComponent> = {
    id: 'component-1',
    machine_id: 'machine-1',
    component_type: ComponentType.HOPPER,
    name: 'Coffee Hopper',
    status: ComponentStatus.ACTIVE,
    installation_date: new Date(),
    maintenance_interval_days: 30,
    next_maintenance_date: new Date(),
    last_maintenance_date: null,
    working_hours: 100,
    expected_lifetime_hours: 1000,
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      softRemove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComponentsService,
        {
          provide: getRepositoryToken(EquipmentComponent),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ComponentsService>(ComponentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a component', async () => {
      const dto = {
        machine_id: 'machine-1',
        component_type: ComponentType.HOPPER,
        name: 'Coffee Hopper',
      };
      mockRepository.create.mockReturnValue(mockComponent);
      mockRepository.save.mockResolvedValue(mockComponent);

      const result = await service.create(dto as any);

      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockComponent);
    });

    it('should calculate next maintenance date if interval provided', async () => {
      const installDate = new Date('2025-01-01');
      const dto = {
        machine_id: 'machine-1',
        component_type: ComponentType.HOPPER,
        name: 'Coffee Hopper',
        maintenance_interval_days: 30,
        installation_date: installDate,
      };

      const createdComponent = { ...mockComponent, next_maintenance_date: null };
      mockRepository.create.mockReturnValue(createdComponent);
      mockRepository.save.mockImplementation((c: any) => Promise.resolve(c));

      const result = await service.create(dto as any);

      expect(result.next_maintenance_date).toBeDefined();
      // Should be 30 days after installation
      const expectedDate = new Date('2025-01-31');
      expect(result.next_maintenance_date!.toDateString()).toBe(expectedDate.toDateString());
    });
  });

  describe('findAll', () => {
    it('should return all components without filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockComponent]);

      const result = await service.findAll();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('component');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'component.machine',
        'machine',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('component.installation_date', 'DESC');
      expect(result).toEqual([mockComponent]);
    });

    it('should filter by machineId', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockComponent]);

      await service.findAll('machine-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('component.machine_id = :machineId', {
        machineId: 'machine-1',
      });
    });

    it('should filter by componentType', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockComponent]);

      await service.findAll(undefined, ComponentType.HOPPER);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'component.component_type = :componentType',
        { componentType: ComponentType.HOPPER },
      );
    });

    it('should filter by status', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockComponent]);

      await service.findAll(undefined, undefined, ComponentStatus.ACTIVE);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('component.status = :status', {
        status: ComponentStatus.ACTIVE,
      });
    });

    it('should apply all filters when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockComponent]);

      await service.findAll('machine-1', ComponentType.HOPPER, ComponentStatus.ACTIVE);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });
  });

  describe('findOne', () => {
    it('should return component when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockComponent);

      const result = await service.findOne('component-1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'component-1' },
        relations: ['machine'],
      });
      expect(result).toEqual(mockComponent);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and save component', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockComponent });
      mockRepository.save.mockResolvedValue({ ...mockComponent, name: 'Updated Name' });

      const result = await service.update('component-1', { name: 'Updated Name' } as any);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Name');
    });

    it('should recalculate next maintenance date when interval changes', async () => {
      const lastMaintenanceDate = new Date('2025-01-15');
      const existingComponent = {
        ...mockComponent,
        last_maintenance_date: lastMaintenanceDate,
      };
      mockRepository.findOne.mockResolvedValue(existingComponent);
      mockRepository.save.mockImplementation((c: any) => Promise.resolve(c));

      const dto = { maintenance_interval_days: 14 };
      const result = await service.update('component-1', dto as any);

      expect(result.next_maintenance_date).toBeDefined();
      // Should be 14 days after last maintenance
      const expectedDate = new Date('2025-01-29');
      expect(result.next_maintenance_date!.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should use dto.last_maintenance_date when provided', async () => {
      const existingComponent = { ...mockComponent };
      mockRepository.findOne.mockResolvedValue(existingComponent);
      mockRepository.save.mockImplementation((c: any) => Promise.resolve(c));

      const dto = {
        maintenance_interval_days: 7,
        last_maintenance_date: new Date('2025-02-01'),
      };
      const result = await service.update('component-1', dto as any);

      expect(result.next_maintenance_date).toBeDefined();
      const expectedDate = new Date('2025-02-08');
      expect(result.next_maintenance_date!.toDateString()).toBe(expectedDate.toDateString());
    });
  });

  describe('remove', () => {
    it('should soft remove component', async () => {
      mockRepository.findOne.mockResolvedValue(mockComponent);
      mockRepository.softRemove.mockResolvedValue(undefined);

      await service.remove('component-1');

      expect(mockRepository.softRemove).toHaveBeenCalledWith(mockComponent);
    });
  });

  describe('replaceComponent', () => {
    it('should replace old component with new one', async () => {
      const oldComponent = { ...mockComponent, id: 'old-component' };
      const newComponent = {
        ...mockComponent,
        id: 'new-component',
        status: ComponentStatus.ACTIVE,
      };

      mockRepository.findOne
        .mockResolvedValueOnce(oldComponent)
        .mockResolvedValueOnce(newComponent);
      mockRepository.save.mockImplementation((c: any) => Promise.resolve(c));

      const dto = {
        new_component_id: 'new-component',
        reason: 'Worn out',
        performed_by_user_id: 'user-1',
      };

      const result = await service.replaceComponent('old-component', dto);

      expect(mockRepository.save).toHaveBeenCalledTimes(2);
      expect(result.replaces_component_id).toBe('old-component');
    });

    it('should mark old component as replaced', async () => {
      const oldComponent = { ...mockComponent, id: 'old-component', notes: 'Existing notes' };
      const newComponent = { ...mockComponent, id: 'new-component' };

      mockRepository.findOne
        .mockResolvedValueOnce(oldComponent)
        .mockResolvedValueOnce(newComponent);

      let savedOldComponent: any;
      mockRepository.save.mockImplementation((c: any) => {
        if (c.id === 'old-component') {
          savedOldComponent = c;
        }
        return Promise.resolve(c);
      });

      await service.replaceComponent('old-component', {
        new_component_id: 'new-component',
        reason: 'Worn out',
        performed_by_user_id: 'user-1',
      });

      expect(savedOldComponent.status).toBe(ComponentStatus.REPLACED);
      expect(savedOldComponent.replaced_by_component_id).toBe('new-component');
      expect(savedOldComponent.notes).toContain('Replaced: Worn out');
    });
  });

  describe('getComponentsNeedingMaintenance', () => {
    it('should return components with overdue maintenance', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockComponent]);

      const result = await service.getComponentsNeedingMaintenance();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'component.next_maintenance_date <= :today',
        { today: expect.any(Date) },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('component.status != :replaced', {
        replaced: ComponentStatus.REPLACED,
      });
      expect(result).toEqual([mockComponent]);
    });
  });

  describe('getComponentsNearingLifetime', () => {
    it('should return components nearing end of lifetime', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockComponent]);

      const result = await service.getComponentsNearingLifetime();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'component.expected_lifetime_hours IS NOT NULL',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'component.working_hours >= component.expected_lifetime_hours * 0.9',
      );
      expect(result).toEqual([mockComponent]);
    });
  });

  describe('getComponentStats', () => {
    it('should return stats without machineId filter', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(10);
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([{ type: ComponentType.HOPPER, count: '5' }])
        .mockResolvedValueOnce([{ status: ComponentStatus.ACTIVE, count: '8' }]);
      mockRepository.count.mockResolvedValue(2);

      const result = await service.getComponentStats();

      expect(result.total).toBe(10);
      expect(result.by_type).toHaveLength(1);
      expect(result.by_status).toHaveLength(1);
      expect(result.needing_maintenance).toBe(2);
    });

    it('should filter by machineId when provided', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(5);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockRepository.count.mockResolvedValue(1);

      await service.getComponentStats('machine-1');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('component.machine_id = :machineId', {
        machineId: 'machine-1',
      });
    });
  });
});
