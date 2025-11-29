import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from '../services/maintenance.service';
import { ComponentMaintenance, MaintenanceType } from '../entities/component-maintenance.entity';
import { CreateMaintenanceDto, MaintenanceFiltersDto } from '../dto/maintenance.dto';

describe('MaintenanceController', () => {
  let controller: MaintenanceController;
  let mockMaintenanceService: jest.Mocked<MaintenanceService>;

  const mockMaintenance: Partial<ComponentMaintenance> = {
    id: 'maint-123',
    component_id: 'comp-123',
    maintenance_type: MaintenanceType.PREVENTIVE,
    performed_at: new Date('2025-01-15T10:00:00Z'),
    performed_by_user_id: 'user-123',
    labor_cost: 50,
    parts_cost: 30,
    total_cost: 80,
    duration_minutes: 60,
    description: 'Regular maintenance',
    notes: 'Replaced filters',
    is_successful: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    mockMaintenanceService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getComponentHistory: jest.fn(),
      getMachineMaintenanceHistory: jest.fn(),
      getStats: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceController],
      providers: [
        {
          provide: MaintenanceService,
          useValue: mockMaintenanceService,
        },
      ],
    }).compile();

    controller = module.get<MaintenanceController>(MaintenanceController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new maintenance record', async () => {
      const dto: CreateMaintenanceDto = {
        component_id: 'comp-123',
        maintenance_type: MaintenanceType.PREVENTIVE,
        performed_by_user_id: 'user-123',
        labor_cost: 50,
        parts_cost: 30,
        duration_minutes: 60,
        description: 'Regular maintenance',
      };

      mockMaintenanceService.create.mockResolvedValue(mockMaintenance as ComponentMaintenance);

      const result = await controller.create(dto);

      expect(result).toEqual(mockMaintenance);
      expect(mockMaintenanceService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all maintenance records without filters', async () => {
      const records = [mockMaintenance];
      mockMaintenanceService.findAll.mockResolvedValue(records as ComponentMaintenance[]);

      const result = await controller.findAll();

      expect(result).toEqual(records);
      expect(mockMaintenanceService.findAll).toHaveBeenCalledWith({
        component_id: undefined,
        maintenance_type: undefined,
        from_date: undefined,
        to_date: undefined,
      });
    });

    it('should return maintenance records filtered by component_id', async () => {
      const records = [mockMaintenance];
      mockMaintenanceService.findAll.mockResolvedValue(records as ComponentMaintenance[]);

      const result = await controller.findAll('comp-123');

      expect(result).toEqual(records);
      expect(mockMaintenanceService.findAll).toHaveBeenCalledWith({
        component_id: 'comp-123',
        maintenance_type: undefined,
        from_date: undefined,
        to_date: undefined,
      });
    });

    it('should return maintenance records filtered by maintenance_type', async () => {
      const records = [mockMaintenance];
      mockMaintenanceService.findAll.mockResolvedValue(records as ComponentMaintenance[]);

      const result = await controller.findAll(undefined, MaintenanceType.PREVENTIVE);

      expect(result).toEqual(records);
      expect(mockMaintenanceService.findAll).toHaveBeenCalledWith({
        component_id: undefined,
        maintenance_type: MaintenanceType.PREVENTIVE,
        from_date: undefined,
        to_date: undefined,
      });
    });

    it('should return maintenance records filtered by date range', async () => {
      const records = [mockMaintenance];
      mockMaintenanceService.findAll.mockResolvedValue(records as ComponentMaintenance[]);

      const result = await controller.findAll(undefined, undefined, '2025-01-01', '2025-01-31');

      expect(result).toEqual(records);
      expect(mockMaintenanceService.findAll).toHaveBeenCalledWith({
        component_id: undefined,
        maintenance_type: undefined,
        from_date: '2025-01-01',
        to_date: '2025-01-31',
      });
    });
  });

  describe('getStats', () => {
    it('should return maintenance statistics', async () => {
      const stats = {
        total: 10,
        by_type: [
          { type: MaintenanceType.PREVENTIVE, count: 5 },
          { type: MaintenanceType.REPAIR, count: 5 },
        ],
        total_cost: 800,
        total_labor_cost: 500,
        total_parts_cost: 300,
        avg_duration_minutes: 45,
        success_rate: 90,
      };
      mockMaintenanceService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(result).toEqual(stats);
      expect(mockMaintenanceService.getStats).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    it('should return filtered statistics by componentId', async () => {
      const stats = {
        total: 5,
        by_type: [],
        total_cost: 0,
        total_labor_cost: 0,
        total_parts_cost: 0,
        avg_duration_minutes: 0,
        success_rate: 0,
      };
      mockMaintenanceService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats('comp-123');

      expect(result).toEqual(stats);
      expect(mockMaintenanceService.getStats).toHaveBeenCalledWith(
        'comp-123',
        undefined,
        undefined,
      );
    });

    it('should return filtered statistics by date range', async () => {
      const stats = {
        total: 3,
        by_type: [],
        total_cost: 0,
        total_labor_cost: 0,
        total_parts_cost: 0,
        avg_duration_minutes: 0,
        success_rate: 0,
      };
      mockMaintenanceService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats(undefined, '2025-01-01', '2025-01-31');

      expect(result).toEqual(stats);
      expect(mockMaintenanceService.getStats).toHaveBeenCalledWith(
        undefined,
        '2025-01-01',
        '2025-01-31',
      );
    });
  });

  describe('getComponentHistory', () => {
    it('should return maintenance history for a component', async () => {
      const records = [mockMaintenance, { ...mockMaintenance, id: 'maint-456' }];
      mockMaintenanceService.getComponentHistory.mockResolvedValue(
        records as ComponentMaintenance[],
      );

      const result = await controller.getComponentHistory('comp-123');

      expect(result).toEqual(records);
      expect(mockMaintenanceService.getComponentHistory).toHaveBeenCalledWith('comp-123');
    });
  });

  describe('getMachineHistory', () => {
    it('should return maintenance history for a machine', async () => {
      const records = [mockMaintenance];
      mockMaintenanceService.getMachineMaintenanceHistory.mockResolvedValue(
        records as ComponentMaintenance[],
      );

      const result = await controller.getMachineHistory('machine-123');

      expect(result).toEqual(records);
      expect(mockMaintenanceService.getMachineMaintenanceHistory).toHaveBeenCalledWith(
        'machine-123',
        undefined,
      );
    });

    it('should return maintenance history for a machine filtered by type', async () => {
      const records = [mockMaintenance];
      mockMaintenanceService.getMachineMaintenanceHistory.mockResolvedValue(
        records as ComponentMaintenance[],
      );

      const result = await controller.getMachineHistory('machine-123', MaintenanceType.PREVENTIVE);

      expect(result).toEqual(records);
      expect(mockMaintenanceService.getMachineMaintenanceHistory).toHaveBeenCalledWith(
        'machine-123',
        MaintenanceType.PREVENTIVE,
      );
    });
  });

  describe('findOne', () => {
    it('should return a maintenance record by id', async () => {
      mockMaintenanceService.findOne.mockResolvedValue(mockMaintenance as ComponentMaintenance);

      const result = await controller.findOne('maint-123');

      expect(result).toEqual(mockMaintenance);
      expect(mockMaintenanceService.findOne).toHaveBeenCalledWith('maint-123');
    });
  });
});
