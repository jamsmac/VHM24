import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { ComponentMaintenance, MaintenanceType } from '../entities/component-maintenance.entity';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let mockRepository: any;

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(10),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({}),
    };

    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        {
          provide: getRepositoryToken(ComponentMaintenance),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a maintenance record with calculated total cost', async () => {
      const dto = {
        component_id: 'comp-123',
        maintenance_type: MaintenanceType.PREVENTIVE,
        labor_cost: 50,
        parts_cost: 100,
        description: 'Regular maintenance',
        performed_by_id: 'user-123',
      };

      const mockMaintenance = {
        id: 'maint-123',
        ...dto,
        performed_at: expect.any(Date),
        total_cost: 150,
      };

      mockRepository.create.mockReturnValue(mockMaintenance);
      mockRepository.save.mockResolvedValue(mockMaintenance);

      const result = await service.create(dto as any);

      expect(result.total_cost).toBe(150);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...dto,
          performed_at: expect.any(Date),
        }),
      );
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should handle missing cost fields with default of 0', async () => {
      const dto = {
        component_id: 'comp-123',
        maintenance_type: MaintenanceType.REPAIR,
        description: 'Emergency repair',
      };

      const mockMaintenance = {
        id: 'maint-456',
        ...dto,
        total_cost: 0,
      };

      mockRepository.create.mockReturnValue(mockMaintenance);
      mockRepository.save.mockResolvedValue(mockMaintenance);

      const result = await service.create(dto as any);

      expect(result.total_cost).toBe(0);
    });

    it('should set performed_at to current date', async () => {
      const beforeCreate = new Date();
      const dto = {
        component_id: 'comp-123',
        maintenance_type: MaintenanceType.INSPECTION,
      };

      mockRepository.create.mockImplementation((data: any) => ({ ...data, id: 'maint-789' }));
      mockRepository.save.mockImplementation((data: any) => Promise.resolve(data));

      await service.create(dto as any);

      const createCall = mockRepository.create.mock.calls[0][0];
      expect(createCall.performed_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    });
  });

  describe('findAll', () => {
    it('should return all maintenance records without filters', async () => {
      const mockMaintenances = [
        { id: 'maint-1', maintenance_type: MaintenanceType.PREVENTIVE },
        { id: 'maint-2', maintenance_type: MaintenanceType.REPAIR },
      ];

      const qb = mockRepository.createQueryBuilder();
      qb.getMany.mockResolvedValue(mockMaintenances);

      const result = await service.findAll({});

      expect(result).toEqual(mockMaintenances);
      expect(qb.leftJoinAndSelect).toHaveBeenCalledTimes(3);
    });

    it('should filter by component_id', async () => {
      const qb = mockRepository.createQueryBuilder();

      await service.findAll({ component_id: 'comp-123' });

      expect(qb.andWhere).toHaveBeenCalledWith('maintenance.component_id = :componentId', {
        componentId: 'comp-123',
      });
    });

    it('should filter by maintenance_type', async () => {
      const qb = mockRepository.createQueryBuilder();

      await service.findAll({ maintenance_type: MaintenanceType.PREVENTIVE });

      expect(qb.andWhere).toHaveBeenCalledWith('maintenance.maintenance_type = :type', {
        type: MaintenanceType.PREVENTIVE,
      });
    });

    it('should filter by date range when both dates provided', async () => {
      const qb = mockRepository.createQueryBuilder();

      await service.findAll({
        from_date: '2025-01-01',
        to_date: '2025-12-31',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'maintenance.performed_at BETWEEN :from AND :to',
        expect.any(Object),
      );
    });

    it('should filter by from_date only', async () => {
      const qb = mockRepository.createQueryBuilder();

      await service.findAll({ from_date: '2025-01-01' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'maintenance.performed_at >= :from',
        expect.any(Object),
      );
    });

    it('should filter by to_date only', async () => {
      const qb = mockRepository.createQueryBuilder();

      await service.findAll({ to_date: '2025-12-31' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'maintenance.performed_at <= :to',
        expect.any(Object),
      );
    });
  });

  describe('findOne', () => {
    it('should return a maintenance record by id', async () => {
      const mockMaintenance = {
        id: 'maint-123',
        maintenance_type: MaintenanceType.PREVENTIVE,
        component: { id: 'comp-123', machine: { id: 'machine-123' } },
        performed_by: { id: 'user-123' },
      };

      mockRepository.findOne.mockResolvedValue(mockMaintenance);

      const result = await service.findOne('maint-123');

      expect(result).toEqual(mockMaintenance);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'maint-123' },
        relations: ['component', 'component.machine', 'performed_by'],
      });
    });

    it('should throw NotFoundException when maintenance not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Maintenance record nonexistent not found',
      );
    });
  });

  describe('getComponentHistory', () => {
    it('should return maintenance history for a component', async () => {
      const mockHistory = [
        { id: 'maint-1', performed_at: new Date('2025-01-15') },
        { id: 'maint-2', performed_at: new Date('2025-01-01') },
      ];

      mockRepository.find.mockResolvedValue(mockHistory);

      const result = await service.getComponentHistory('comp-123');

      expect(result).toEqual(mockHistory);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { component_id: 'comp-123' },
        relations: ['performed_by'],
        order: { performed_at: 'DESC' },
      });
    });

    it('should return empty array when no history exists', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getComponentHistory('comp-456');

      expect(result).toEqual([]);
    });
  });

  describe('getMachineMaintenanceHistory', () => {
    it('should return all maintenance history for a machine', async () => {
      const mockHistory = [
        { id: 'maint-1', component: { machine_id: 'machine-123' } },
        { id: 'maint-2', component: { machine_id: 'machine-123' } },
      ];

      const qb = mockRepository.createQueryBuilder();
      qb.getMany.mockResolvedValue(mockHistory);

      const result = await service.getMachineMaintenanceHistory('machine-123');

      expect(result).toEqual(mockHistory);
      expect(qb.where).toHaveBeenCalledWith('component.machine_id = :machineId', {
        machineId: 'machine-123',
      });
    });

    it('should filter by maintenance type when provided', async () => {
      const qb = mockRepository.createQueryBuilder();
      qb.getMany.mockResolvedValue([]);

      await service.getMachineMaintenanceHistory('machine-123', MaintenanceType.PREVENTIVE);

      expect(qb.andWhere).toHaveBeenCalledWith('maintenance.maintenance_type = :type', {
        type: MaintenanceType.PREVENTIVE,
      });
    });
  });

  describe('getStats', () => {
    it('should return comprehensive statistics', async () => {
      const qb = mockRepository.createQueryBuilder();
      qb.getCount.mockResolvedValue(50);
      qb.getRawMany.mockResolvedValue([
        { type: MaintenanceType.PREVENTIVE, count: '30' },
        { type: MaintenanceType.REPAIR, count: '20' },
      ]);
      qb.getRawOne
        .mockResolvedValueOnce({
          total_cost: '5000',
          total_labor_cost: '2000',
          total_parts_cost: '3000',
        })
        .mockResolvedValueOnce({ avg_duration: '45' })
        .mockResolvedValueOnce({ success_rate: '95.5' });

      const result = await service.getStats();

      expect(result).toEqual({
        total: 50,
        by_type: [
          { type: MaintenanceType.PREVENTIVE, count: 30 },
          { type: MaintenanceType.REPAIR, count: 20 },
        ],
        total_cost: 5000,
        total_labor_cost: 2000,
        total_parts_cost: 3000,
        avg_duration_minutes: 45,
        success_rate: 95.5,
      });
    });

    it('should filter stats by componentId', async () => {
      const qb = mockRepository.createQueryBuilder();

      await service.getStats('comp-123');

      expect(qb.where).toHaveBeenCalledWith('maintenance.component_id = :componentId', {
        componentId: 'comp-123',
      });
    });

    it('should filter stats by date range', async () => {
      const qb = mockRepository.createQueryBuilder();

      await service.getStats(undefined, '2025-01-01', '2025-12-31');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'maintenance.performed_at BETWEEN :from AND :to',
        expect.any(Object),
      );
    });

    it('should handle null values in stats', async () => {
      const qb = mockRepository.createQueryBuilder();
      qb.getCount.mockResolvedValue(0);
      qb.getRawMany.mockResolvedValue([]);
      qb.getRawOne
        .mockResolvedValueOnce({ total_cost: null, total_labor_cost: null, total_parts_cost: null })
        .mockResolvedValueOnce({ avg_duration: null })
        .mockResolvedValueOnce({ success_rate: null });

      const result = await service.getStats();

      expect(result).toEqual({
        total: 0,
        by_type: [],
        total_cost: 0,
        total_labor_cost: 0,
        total_parts_cost: 0,
        avg_duration_minutes: 0,
        success_rate: 0,
      });
    });
  });
});
