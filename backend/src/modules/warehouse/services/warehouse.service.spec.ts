import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { Warehouse, WarehouseType } from '../entities/warehouse.entity';
import { WarehouseZone, ZoneType } from '../entities/warehouse-zone.entity';

describe('WarehouseService', () => {
  let service: WarehouseService;
  let warehouseRepository: jest.Mocked<Repository<Warehouse>>;
  let zoneRepository: jest.Mocked<Repository<WarehouseZone>>;

  // Mock fixtures
  const mockWarehouse: Partial<Warehouse> = {
    id: 'warehouse-uuid',
    name: 'Main Warehouse',
    code: 'WH-001',
    warehouse_type: WarehouseType.MAIN,
    location_id: 'location-uuid',
    is_active: true,
    address: '123 Main St',
    total_area_sqm: 1000,
    location: {
      id: 'location-uuid',
      name: 'Main Location',
    } as any,
    zones: [],
    metadata: {},
  };

  const mockZone: Partial<WarehouseZone> = {
    id: 'zone-uuid',
    warehouse_id: 'warehouse-uuid',
    name: 'Storage Zone A',
    code: 'ZONE-A',
    zone_type: ZoneType.STORAGE,
    capacity: 100,
    current_occupancy: 50,
    is_active: true,
    metadata: {},
  };

  const createMockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  });

  beforeEach(async () => {
    const mockWarehouseRepo = createMockRepository();
    const mockZoneRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseService,
        {
          provide: getRepositoryToken(Warehouse),
          useValue: mockWarehouseRepo,
        },
        {
          provide: getRepositoryToken(WarehouseZone),
          useValue: mockZoneRepo,
        },
      ],
    }).compile();

    service = module.get<WarehouseService>(WarehouseService);
    warehouseRepository = module.get(getRepositoryToken(Warehouse));
    zoneRepository = module.get(getRepositoryToken(WarehouseZone));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // FIND ALL TESTS
  // ============================================================================

  describe('findAll', () => {
    it('should return all warehouses with relations', async () => {
      const warehouses = [mockWarehouse, { ...mockWarehouse, id: 'wh-2', name: 'Secondary' }];
      warehouseRepository.find.mockResolvedValue(warehouses as Warehouse[]);

      const result = await service.findAll();

      expect(warehouseRepository.find).toHaveBeenCalledWith({
        relations: ['location', 'zones'],
        order: { name: 'ASC' },
      });
      expect(result).toEqual(warehouses);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no warehouses exist', async () => {
      warehouseRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // FIND ONE TESTS
  // ============================================================================

  describe('findOne', () => {
    it('should return warehouse by ID with relations', async () => {
      warehouseRepository.findOne.mockResolvedValue(mockWarehouse as Warehouse);

      const result = await service.findOne('warehouse-uuid');

      expect(warehouseRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'warehouse-uuid' },
        relations: ['location', 'zones'],
      });
      expect(result).toEqual(mockWarehouse);
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      warehouseRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-uuid')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-uuid')).rejects.toThrow(
        'Warehouse with ID non-existent-uuid not found',
      );
    });
  });

  // ============================================================================
  // FIND BY CODE TESTS
  // ============================================================================

  describe('findByCode', () => {
    it('should return warehouse by code with relations', async () => {
      warehouseRepository.findOne.mockResolvedValue(mockWarehouse as Warehouse);

      const result = await service.findByCode('WH-001');

      expect(warehouseRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'WH-001' },
        relations: ['location', 'zones'],
      });
      expect(result).toEqual(mockWarehouse);
    });

    it('should throw NotFoundException when warehouse with code not found', async () => {
      warehouseRepository.findOne.mockResolvedValue(null);

      await expect(service.findByCode('INVALID-CODE')).rejects.toThrow(NotFoundException);
      await expect(service.findByCode('INVALID-CODE')).rejects.toThrow(
        'Warehouse with code INVALID-CODE not found',
      );
    });
  });

  // ============================================================================
  // GET ACTIVE WAREHOUSES TESTS
  // ============================================================================

  describe('getActiveWarehouses', () => {
    it('should return only active warehouses', async () => {
      const activeWarehouses = [mockWarehouse];
      warehouseRepository.find.mockResolvedValue(activeWarehouses as Warehouse[]);

      const result = await service.getActiveWarehouses();

      expect(warehouseRepository.find).toHaveBeenCalledWith({
        where: { is_active: true },
        relations: ['location'],
        order: { name: 'ASC' },
      });
      expect(result).toEqual(activeWarehouses);
    });

    it('should return empty array when no active warehouses', async () => {
      warehouseRepository.find.mockResolvedValue([]);

      const result = await service.getActiveWarehouses();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // GET WAREHOUSE UTILIZATION TESTS
  // ============================================================================

  describe('getWarehouseUtilization', () => {
    it('should calculate utilization correctly with zones', async () => {
      const warehouseWithZones = {
        ...mockWarehouse,
        zones: [
          { name: 'Zone A', capacity: 100, current_occupancy: 50 },
          { name: 'Zone B', capacity: 200, current_occupancy: 100 },
          { name: 'Zone C', capacity: 100, current_occupancy: 25 },
        ],
      };
      warehouseRepository.findOne.mockResolvedValue(warehouseWithZones as Warehouse);

      const result = await service.getWarehouseUtilization('warehouse-uuid');

      expect(result.total_capacity).toBe(400); // 100 + 200 + 100
      expect(result.current_occupancy).toBe(175); // 50 + 100 + 25
      expect(result.utilization_percentage).toBeCloseTo(43.75); // (175/400) * 100
      expect(result.zones).toHaveLength(3);
      expect(result.zones[0]).toEqual({
        zone_name: 'Zone A',
        capacity: 100,
        occupancy: 50,
        utilization: 50, // (50/100) * 100
      });
    });

    it('should return 0 utilization when no zones', async () => {
      warehouseRepository.findOne.mockResolvedValue(mockWarehouse as Warehouse);

      const result = await service.getWarehouseUtilization('warehouse-uuid');

      expect(result.total_capacity).toBe(0);
      expect(result.current_occupancy).toBe(0);
      expect(result.utilization_percentage).toBe(0);
      expect(result.zones).toHaveLength(0);
    });

    it('should handle zones with null capacity', async () => {
      const warehouseWithNullCapacity = {
        ...mockWarehouse,
        zones: [
          { name: 'Zone A', capacity: null, current_occupancy: 50 },
          { name: 'Zone B', capacity: 200, current_occupancy: 100 },
        ],
      };
      warehouseRepository.findOne.mockResolvedValue(warehouseWithNullCapacity as Warehouse);

      const result = await service.getWarehouseUtilization('warehouse-uuid');

      expect(result.total_capacity).toBe(200); // 0 + 200
      expect(result.current_occupancy).toBe(150); // 50 + 100
      expect(result.zones[0].capacity).toBe(0);
      expect(result.zones[0].utilization).toBe(0); // division by null capacity
    });

    it('should throw NotFoundException if warehouse not found', async () => {
      warehouseRepository.findOne.mockResolvedValue(null);

      await expect(service.getWarehouseUtilization('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // GET ZONES TESTS
  // ============================================================================

  describe('getZones', () => {
    it('should return active zones for warehouse', async () => {
      const zones = [mockZone, { ...mockZone, id: 'zone-2', name: 'Zone B' }];
      zoneRepository.find.mockResolvedValue(zones as WarehouseZone[]);

      const result = await service.getZones('warehouse-uuid');

      expect(zoneRepository.find).toHaveBeenCalledWith({
        where: { warehouse_id: 'warehouse-uuid', is_active: true },
        order: { name: 'ASC' },
      });
      expect(result).toEqual(zones);
    });

    it('should return empty array when no active zones', async () => {
      zoneRepository.find.mockResolvedValue([]);

      const result = await service.getZones('warehouse-uuid');

      expect(result).toEqual([]);
    });
  });
});
