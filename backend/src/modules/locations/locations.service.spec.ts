import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Location, LocationStatus } from './entities/location.entity';
import { Machine } from '@modules/machines/entities/machine.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

describe('LocationsService', () => {
  let service: LocationsService;
  let mockLocationRepository: jest.Mocked<Repository<Location>>;
  let mockMachineRepository: jest.Mocked<Repository<Machine>>;

  // Test data
  const mockLocationId = 'location-id-1';
  const mockCity = 'Tashkent';
  const mockName = 'Office Plaza';

  const mockLocation: Partial<Location> = {
    id: mockLocationId,
    name: mockName,
    type_code: 'office',
    status: LocationStatus.ACTIVE,
    description: 'Large office building',
    city: mockCity,
    address: 'Amir Temur St. 15',
    postal_code: '100000',
    latitude: 41.3111,
    longitude: 69.2797,
    contact_person: 'Ivan Ivanov',
    contact_phone: '+998901234567',
    contact_email: 'contact@example.com',
    monthly_rent: 500000,
    estimated_traffic: 1000,
    working_hours: {
      monday: { from: '09:00', to: '18:00' },
      tuesday: { from: '09:00', to: '18:00' },
    },
    contract_start_date: new Date('2024-01-01'),
    contract_end_date: new Date('2025-01-01'),
    contract_notes: 'Contract #123',
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockLocation2: Partial<Location> = {
    id: 'location-id-2',
    name: 'Shopping Center',
    type_code: 'mall',
    status: LocationStatus.ACTIVE,
    city: mockCity,
    address: 'Another St. 20',
  };

  const _mockInactiveLocation: Partial<Location> = {
    ...mockLocation,
    id: 'location-id-3',
    status: LocationStatus.INACTIVE,
  };

  // Helper to create mock query builder
  const createMockQueryBuilder = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  });

  beforeEach(async () => {
    mockLocationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    } as any;

    mockMachineRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        {
          provide: getRepositoryToken(Location),
          useValue: mockLocationRepository,
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: mockMachineRepository,
        },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateLocationDto = {
      name: mockName,
      type_code: 'office',
      city: mockCity,
      address: 'Amir Temur St. 15',
      status: LocationStatus.ACTIVE,
    };

    it('should create location successfully', async () => {
      // Arrange
      mockLocationRepository.findOne.mockResolvedValue(null);
      mockLocationRepository.create.mockReturnValue(mockLocation as Location);
      mockLocationRepository.save.mockResolvedValue(mockLocation as Location);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockLocation);
      expect(mockLocationRepository.findOne).toHaveBeenCalledWith({
        where: {
          city: mockCity,
          name: mockName,
        },
      });
      expect(mockLocationRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockLocationRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when location with same name exists in city', async () => {
      // Arrange
      mockLocationRepository.findOne.mockResolvedValue(mockLocation as Location);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Локация с названием "${mockName}" уже существует в городе ${mockCity}`,
      );
      expect(mockLocationRepository.create).not.toHaveBeenCalled();
    });

    it('should create location with minimal required fields', async () => {
      // Arrange
      const minimalDto: CreateLocationDto = {
        name: 'New Location',
        type_code: 'office',
        city: 'Samarkand',
        address: 'Some Address',
      };

      const minimalLocation = {
        ...mockLocation,
        ...minimalDto,
        id: 'new-id',
      };

      mockLocationRepository.findOne.mockResolvedValue(null);
      mockLocationRepository.create.mockReturnValue(minimalLocation as Location);
      mockLocationRepository.save.mockResolvedValue(minimalLocation as Location);

      // Act
      const result = await service.create(minimalDto);

      // Assert
      expect(result).toBeDefined();
      expect(mockLocationRepository.create).toHaveBeenCalledWith(minimalDto);
    });
  });

  describe('findAll', () => {
    it('should return all locations ordered by city and name', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockLocation, mockLocation2] as Location[]);
      mockLocationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([mockLocation, mockLocation2]);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('location.city', 'ASC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('location.name', 'ASC');
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockLocation] as Location[]);
      mockLocationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findAll(LocationStatus.ACTIVE);

      // Assert
      expect(result).toEqual([mockLocation]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('location.status = :status', {
        status: LocationStatus.ACTIVE,
      });
    });

    it('should return empty array when no locations exist', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockLocationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return location by ID', async () => {
      // Arrange
      mockLocationRepository.findOne.mockResolvedValue(mockLocation as Location);

      // Act
      const result = await service.findOne(mockLocationId);

      // Assert
      expect(result).toEqual(mockLocation);
      expect(mockLocationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockLocationId },
      });
    });

    it('should throw NotFoundException when location not found', async () => {
      // Arrange
      mockLocationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Локация с ID non-existent-id не найдена',
      );
    });
  });

  describe('findByCity', () => {
    it('should return locations for a specific city', async () => {
      // Arrange
      mockLocationRepository.find.mockResolvedValue([mockLocation, mockLocation2] as Location[]);

      // Act
      const result = await service.findByCity(mockCity);

      // Assert
      expect(result).toEqual([mockLocation, mockLocation2]);
      expect(mockLocationRepository.find).toHaveBeenCalledWith({
        where: { city: mockCity },
        order: { name: 'ASC' },
      });
    });

    it('should return empty array when no locations in city', async () => {
      // Arrange
      mockLocationRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findByCity('NonExistentCity');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    const updateDto: UpdateLocationDto = {
      name: 'Updated Name',
      description: 'Updated description',
    };

    it('should update location successfully', async () => {
      // Arrange
      const updatedLocation = { ...mockLocation, ...updateDto };
      mockLocationRepository.findOne
        .mockResolvedValueOnce(mockLocation as Location) // First call in findOne
        .mockResolvedValueOnce(null); // Second call for uniqueness check
      mockLocationRepository.save.mockResolvedValue(updatedLocation as Location);

      // Act
      const result = await service.update(mockLocationId, updateDto);

      // Assert
      expect(result).toEqual(updatedLocation);
      expect(mockLocationRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when location not found', async () => {
      // Arrange
      mockLocationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating to existing name in city', async () => {
      // Arrange
      const updateWithNameChange: UpdateLocationDto = {
        name: 'Shopping Center', // Name of mockLocation2
      };

      mockLocationRepository.findOne
        .mockResolvedValueOnce(mockLocation as Location) // First call - find location to update
        .mockResolvedValueOnce(mockLocation2 as Location); // Second call - find existing with same name

      // Act & Assert
      await expect(service.update(mockLocationId, updateWithNameChange)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating same location without conflict', async () => {
      // Arrange
      const updateWithSameName: UpdateLocationDto = {
        name: mockName, // Same name as current
        description: 'Updated description',
      };

      mockLocationRepository.findOne
        .mockResolvedValueOnce(mockLocation as Location) // First call
        .mockResolvedValueOnce(mockLocation as Location); // Second call returns same location

      const updatedLocation = { ...mockLocation, ...updateWithSameName };
      mockLocationRepository.save.mockResolvedValue(updatedLocation as Location);

      // Act
      const result = await service.update(mockLocationId, updateWithSameName);

      // Assert - should not throw, same location is OK
      expect(result).toBeDefined();
    });

    it('should check uniqueness when changing city', async () => {
      // Arrange
      const updateWithCityChange: UpdateLocationDto = {
        city: 'Samarkand',
        name: mockName,
      };

      mockLocationRepository.findOne
        .mockResolvedValueOnce(mockLocation as Location)
        .mockResolvedValueOnce(null); // No conflict in new city

      const updatedLocation = { ...mockLocation, ...updateWithCityChange };
      mockLocationRepository.save.mockResolvedValue(updatedLocation as Location);

      // Act
      const result = await service.update(mockLocationId, updateWithCityChange);

      // Assert
      expect(result).toBeDefined();
      expect(mockLocationRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: {
          city: 'Samarkand',
          name: mockName,
        },
      });
    });

    it('should skip uniqueness check when name is not changed', async () => {
      // Arrange
      const updateWithoutNameChange: UpdateLocationDto = {
        description: 'Only description changed',
      };

      mockLocationRepository.findOne.mockResolvedValueOnce(mockLocation as Location);

      const updatedLocation = { ...mockLocation, ...updateWithoutNameChange };
      mockLocationRepository.save.mockResolvedValue(updatedLocation as Location);

      // Act
      const result = await service.update(mockLocationId, updateWithoutNameChange);

      // Assert
      expect(result).toBeDefined();
      // Should only be called once (for findOne), not for uniqueness check
      expect(mockLocationRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should soft delete location successfully', async () => {
      // Arrange
      mockLocationRepository.findOne.mockResolvedValue(mockLocation as Location);
      mockLocationRepository.softRemove.mockResolvedValue(mockLocation as Location);

      // Act
      await service.remove(mockLocationId);

      // Assert
      expect(mockLocationRepository.softRemove).toHaveBeenCalledWith(mockLocation);
    });

    it('should throw NotFoundException when location not found', async () => {
      // Arrange
      mockLocationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByType', () => {
    it('should return locations by type code', async () => {
      // Arrange
      mockLocationRepository.find.mockResolvedValue([mockLocation] as Location[]);

      // Act
      const result = await service.findByType('office');

      // Assert
      expect(result).toEqual([mockLocation]);
      expect(mockLocationRepository.find).toHaveBeenCalledWith({
        where: { type_code: 'office' },
        order: { city: 'ASC', name: 'ASC' },
      });
    });

    it('should return empty array when no locations of type exist', async () => {
      // Arrange
      mockLocationRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findByType('warehouse');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return location statistics', async () => {
      // Arrange
      mockLocationRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7) // active
        .mockResolvedValueOnce(2); // inactive

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 10,
        active: 7,
        inactive: 2,
        pending: 1, // 10 - 7 - 2 = 1
      });
    });

    it('should return correct counts when all locations are active', async () => {
      // Arrange
      mockLocationRepository.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(5) // active
        .mockResolvedValueOnce(0); // inactive

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 5,
        active: 5,
        inactive: 0,
        pending: 0,
      });
    });

    it('should return zeros when no locations exist', async () => {
      // Arrange
      mockLocationRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        pending: 0,
      });
    });

    it('should call count with correct status filters', async () => {
      // Arrange
      mockLocationRepository.count.mockResolvedValue(0);

      // Act
      await service.getStats();

      // Assert
      expect(mockLocationRepository.count).toHaveBeenNthCalledWith(1); // total
      expect(mockLocationRepository.count).toHaveBeenNthCalledWith(2, {
        where: { status: LocationStatus.ACTIVE },
      });
      expect(mockLocationRepository.count).toHaveBeenNthCalledWith(3, {
        where: { status: LocationStatus.INACTIVE },
      });
    });
  });

  describe('getMapData', () => {
    it('should return empty array when no locations with coordinates', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockLocationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getMapData();

      // Assert
      expect(result).toEqual([]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('location.latitude IS NOT NULL');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('location.longitude IS NOT NULL');
    });

    it('should return locations with machine statistics', async () => {
      // Arrange - use fresh location data to avoid test isolation issues
      const freshLocation1 = {
        id: 'loc-fresh-1',
        name: 'Fresh Location 1',
        type_code: 'office',
        status: LocationStatus.ACTIVE,
        city: 'TestCity',
        address: 'Test Address 1',
        latitude: 41.3111,
        longitude: 69.2797,
      } as Location;

      const freshLocation2 = {
        id: 'loc-fresh-2',
        name: 'Fresh Location 2',
        type_code: 'mall',
        status: LocationStatus.ACTIVE,
        city: 'TestCity2',
        address: 'Test Address 2',
        latitude: 41.3200,
        longitude: 69.2800,
      } as Location;

      const locationsWithCoords = [freshLocation1, freshLocation2];

      const mockLocationQB = createMockQueryBuilder();
      mockLocationQB.getMany.mockResolvedValue(locationsWithCoords);
      mockLocationRepository.createQueryBuilder.mockReturnValue(mockLocationQB as any);

      const mockMachineQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { location_id: 'loc-fresh-1', total: '5', active: '3', error: '1', low_stock: '1' },
          { location_id: 'loc-fresh-2', total: '3', active: '2', error: '0', low_stock: '1' },
        ]),
      };
      mockMachineRepository.createQueryBuilder.mockReturnValue(mockMachineQB as any);

      // Act
      const result = await service.getMapData();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'loc-fresh-1',
        name: 'Fresh Location 1',
        address: 'Test Address 1',
        city: 'TestCity',
        latitude: 41.3111,
        longitude: 69.2797,
        status: LocationStatus.ACTIVE,
        machine_count: 5,
        machines_active: 3,
        machines_error: 1,
        machines_low_stock: 1,
      });
      expect(result[1]).toEqual({
        id: 'loc-fresh-2',
        name: 'Fresh Location 2',
        address: 'Test Address 2',
        city: 'TestCity2',
        latitude: 41.3200,
        longitude: 69.2800,
        status: LocationStatus.ACTIVE,
        machine_count: 3,
        machines_active: 2,
        machines_error: 0,
        machines_low_stock: 1,
      });
    });

    it('should return locations with zero machine counts when no machines', async () => {
      // Arrange - use fresh data
      const freshLocation = {
        id: 'loc-zero-machines',
        name: 'Zero Machines Location',
        type_code: 'office',
        status: LocationStatus.ACTIVE,
        city: 'TestCity',
        address: 'Test Address',
        latitude: 41.3111,
        longitude: 69.2797,
      } as Location;

      const mockLocationQB = createMockQueryBuilder();
      mockLocationQB.getMany.mockResolvedValue([freshLocation]);
      mockLocationRepository.createQueryBuilder.mockReturnValue(mockLocationQB as any);

      const mockMachineQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]), // No machines
      };
      mockMachineRepository.createQueryBuilder.mockReturnValue(mockMachineQB as any);

      // Act
      const result = await service.getMapData();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].machine_count).toBe(0);
      expect(result[0].machines_active).toBe(0);
      expect(result[0].machines_error).toBe(0);
      expect(result[0].machines_low_stock).toBe(0);
    });

    it('should handle locations without machine stats in map', async () => {
      // Arrange - Location exists but has no entries in machineStats
      const freshLocation = {
        id: 'loc-no-stats',
        name: 'No Stats Location',
        type_code: 'office',
        status: LocationStatus.ACTIVE,
        city: 'TestCity',
        address: 'Test Address',
        latitude: 41.3111,
        longitude: 69.2797,
      } as Location;

      const mockLocationQB = createMockQueryBuilder();
      mockLocationQB.getMany.mockResolvedValue([freshLocation]);
      mockLocationRepository.createQueryBuilder.mockReturnValue(mockLocationQB as any);

      const mockMachineQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          // Different location_id - stats for a different location
          { location_id: 'other-location', total: '5', active: '3', error: '1', low_stock: '1' },
        ]),
      };
      mockMachineRepository.createQueryBuilder.mockReturnValue(mockMachineQB as any);

      // Act
      const result = await service.getMapData();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].machine_count).toBe(0);
    });

    it('should handle null/undefined values in machine stats', async () => {
      // Arrange - use fresh data
      const freshLocation = {
        id: 'loc-null-stats',
        name: 'Null Stats Location',
        type_code: 'office',
        status: LocationStatus.ACTIVE,
        city: 'TestCity',
        address: 'Test Address',
        latitude: 41.3111,
        longitude: 69.2797,
      } as Location;

      const mockLocationQB = createMockQueryBuilder();
      mockLocationQB.getMany.mockResolvedValue([freshLocation]);
      mockLocationRepository.createQueryBuilder.mockReturnValue(mockLocationQB as any);

      const mockMachineQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { location_id: 'loc-null-stats', total: null, active: undefined, error: '', low_stock: 'invalid' },
        ]),
      };
      mockMachineRepository.createQueryBuilder.mockReturnValue(mockMachineQB as any);

      // Act
      const result = await service.getMapData();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].machine_count).toBe(0);
      expect(result[0].machines_active).toBe(0);
      expect(result[0].machines_error).toBe(0);
      expect(result[0].machines_low_stock).toBe(0);
    });

    it('should convert latitude and longitude to float', async () => {
      // Arrange - use fresh data with string coordinates
      const freshLocation = {
        id: 'loc-string-coords',
        name: 'String Coords Location',
        type_code: 'office',
        status: LocationStatus.ACTIVE,
        city: 'TestCity',
        address: 'Test Address',
        latitude: '41.3111' as any,
        longitude: '69.2797' as any,
      } as Location;

      const mockLocationQB = createMockQueryBuilder();
      mockLocationQB.getMany.mockResolvedValue([freshLocation]);
      mockLocationRepository.createQueryBuilder.mockReturnValue(mockLocationQB as any);

      const mockMachineQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockMachineRepository.createQueryBuilder.mockReturnValue(mockMachineQB as any);

      // Act
      const result = await service.getMapData();

      // Assert
      expect(result).toHaveLength(1);
      expect(typeof result[0].latitude).toBe('number');
      expect(typeof result[0].longitude).toBe('number');
      expect(result[0].latitude).toBe(41.3111);
      expect(result[0].longitude).toBe(69.2797);
    });

    it('should query machines only for locations with coordinates', async () => {
      // Arrange - use fresh isolated data
      const loc1 = {
        id: 'loc-query-1',
        name: 'Query Test Location 1',
        type_code: 'office',
        status: LocationStatus.ACTIVE,
        city: 'TestCity',
        address: 'Address 1',
        latitude: 41.3111,
        longitude: 69.2797,
      } as Location;
      const loc2 = {
        id: 'loc-query-2',
        name: 'Query Test Location 2',
        type_code: 'mall',
        status: LocationStatus.ACTIVE,
        city: 'TestCity',
        address: 'Address 2',
        latitude: 41.3200,
        longitude: 69.2800,
      } as Location;

      const mockLocationQB = createMockQueryBuilder();
      mockLocationQB.getMany.mockResolvedValue([loc1, loc2]);
      mockLocationRepository.createQueryBuilder.mockReturnValue(mockLocationQB as any);

      const mockMachineQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockMachineRepository.createQueryBuilder.mockReturnValue(mockMachineQB as any);

      // Act
      await service.getMapData();

      // Assert
      expect(mockMachineQB.where).toHaveBeenCalledWith('machine.location_id IN (:...locationIds)', {
        locationIds: ['loc-query-1', 'loc-query-2'],
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in location name', async () => {
      // Arrange
      const dtoWithSpecialChars: CreateLocationDto = {
        name: 'Office "Plaza" & Co.',
        type_code: 'office',
        city: mockCity,
        address: 'Some Address',
      };

      const specialCharsLocation = {
        ...mockLocation,
        ...dtoWithSpecialChars,
        id: 'new-id',
      };

      mockLocationRepository.findOne.mockResolvedValue(null);
      mockLocationRepository.create.mockReturnValue(specialCharsLocation as Location);
      mockLocationRepository.save.mockResolvedValue(specialCharsLocation as Location);

      // Act
      const result = await service.create(dtoWithSpecialChars);

      // Assert
      expect(result.name).toBe('Office "Plaza" & Co.');
    });

    it('should handle unicode characters in city name', async () => {
      // Arrange
      const dtoWithUnicode: CreateLocationDto = {
        name: 'Test Location',
        type_code: 'office',
        city: 'Toshkent',
        address: 'Some Address',
      };

      const unicodeLocation = {
        ...mockLocation,
        ...dtoWithUnicode,
        id: 'new-id',
      };

      mockLocationRepository.findOne.mockResolvedValue(null);
      mockLocationRepository.create.mockReturnValue(unicodeLocation as Location);
      mockLocationRepository.save.mockResolvedValue(unicodeLocation as Location);

      // Act
      const result = await service.create(dtoWithUnicode);

      // Assert
      expect(result.city).toBe('Toshkent');
    });

    it('should handle null optional fields in update', async () => {
      // Arrange
      const updateWithNulls: UpdateLocationDto = {
        description: null as any,
        contact_person: null as any,
      };

      mockLocationRepository.findOne.mockResolvedValue(mockLocation as Location);
      mockLocationRepository.save.mockImplementation(async (entity) => entity as Location);

      // Act
      const result = await service.update(mockLocationId, updateWithNulls);

      // Assert
      expect(result).toBeDefined();
    });
  });
});
