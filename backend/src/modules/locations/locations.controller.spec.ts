import { Test, TestingModule } from '@nestjs/testing';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { Location, LocationStatus } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';

describe('LocationsController', () => {
  let controller: LocationsController;
  let mockLocationsService: jest.Mocked<LocationsService>;

  const mockLocationId = 'location-id-1';
  const mockCity = 'Tashkent';
  const mockTypeCode = 'office';

  const mockLocation: Partial<Location> = {
    id: mockLocationId,
    name: 'Office Plaza',
    type_code: mockTypeCode,
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
    },
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockLocation2: Partial<Location> = {
    id: 'location-id-2',
    name: 'Shopping Mall',
    type_code: 'mall',
    status: LocationStatus.ACTIVE,
    city: mockCity,
    address: 'Another St. 20',
  };

  const mockStats = {
    total: 10,
    active: 7,
    inactive: 2,
    pending: 1,
  };

  beforeEach(async () => {
    mockLocationsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByCity: jest.fn(),
      findByType: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getStats: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        {
          provide: LocationsService,
          useValue: mockLocationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LocationsController>(LocationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateLocationDto = {
      name: 'New Office',
      type_code: mockTypeCode,
      city: mockCity,
      address: 'New St. 10',
    };

    it('should create a new location', async () => {
      // Arrange
      const createdLocation = { ...mockLocation, ...createDto };
      mockLocationsService.create.mockResolvedValue(createdLocation as Location);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result).toEqual(createdLocation);
      expect(mockLocationsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw ConflictException when location name already exists in city', async () => {
      // Arrange
      mockLocationsService.create.mockRejectedValue(
        new ConflictException(
          `Локация с названием "${createDto.name}" уже существует в городе ${createDto.city}`,
        ),
      );

      // Act & Assert
      await expect(controller.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should create location with all optional fields', async () => {
      // Arrange
      const fullDto: CreateLocationDto = {
        ...createDto,
        status: LocationStatus.ACTIVE,
        description: 'Full description',
        postal_code: '100000',
        latitude: 41.3111,
        longitude: 69.2797,
        contact_person: 'Test Person',
        contact_phone: '+998901234567',
        contact_email: 'test@example.com',
        monthly_rent: 500000,
        estimated_traffic: 1000,
        working_hours: { monday: { from: '09:00', to: '18:00' } },
        contract_start_date: '2024-01-01',
        contract_end_date: '2025-01-01',
        contract_notes: 'Test contract',
        metadata: { key: 'value' },
      };

      const createdLocation = { ...mockLocation, ...fullDto };
      mockLocationsService.create.mockResolvedValue(createdLocation as Location);

      // Act
      const result = await controller.create(fullDto);

      // Assert
      expect(result).toEqual(createdLocation);
      expect(mockLocationsService.create).toHaveBeenCalledWith(fullDto);
    });
  });

  describe('findAll', () => {
    it('should return all locations without filter', async () => {
      // Arrange
      const locations = [mockLocation, mockLocation2];
      mockLocationsService.findAll.mockResolvedValue(locations as Location[]);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual(locations);
      expect(mockLocationsService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should return filtered locations by status', async () => {
      // Arrange
      mockLocationsService.findAll.mockResolvedValue([mockLocation] as Location[]);

      // Act
      const result = await controller.findAll(LocationStatus.ACTIVE);

      // Assert
      expect(result).toEqual([mockLocation]);
      expect(mockLocationsService.findAll).toHaveBeenCalledWith(LocationStatus.ACTIVE);
    });

    it('should return empty array when no locations exist', async () => {
      // Arrange
      mockLocationsService.findAll.mockResolvedValue([]);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return location statistics', async () => {
      // Arrange
      mockLocationsService.getStats.mockResolvedValue(mockStats);

      // Act
      const result = await controller.getStats();

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockLocationsService.getStats).toHaveBeenCalled();
    });

    it('should return zero stats when no locations exist', async () => {
      // Arrange
      const emptyStats = { total: 0, active: 0, inactive: 0, pending: 0 };
      mockLocationsService.getStats.mockResolvedValue(emptyStats);

      // Act
      const result = await controller.getStats();

      // Assert
      expect(result).toEqual(emptyStats);
    });
  });

  describe('findByCity', () => {
    it('should return locations for specified city', async () => {
      // Arrange
      const cityLocations = [mockLocation, mockLocation2];
      mockLocationsService.findByCity.mockResolvedValue(cityLocations as Location[]);

      // Act
      const result = await controller.findByCity(mockCity);

      // Assert
      expect(result).toEqual(cityLocations);
      expect(mockLocationsService.findByCity).toHaveBeenCalledWith(mockCity);
    });

    it('should return empty array when no locations in city', async () => {
      // Arrange
      mockLocationsService.findByCity.mockResolvedValue([]);

      // Act
      const result = await controller.findByCity('NonExistentCity');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findByType', () => {
    it('should return locations for specified type code', async () => {
      // Arrange
      mockLocationsService.findByType.mockResolvedValue([mockLocation] as Location[]);

      // Act
      const result = await controller.findByType(mockTypeCode);

      // Assert
      expect(result).toEqual([mockLocation]);
      expect(mockLocationsService.findByType).toHaveBeenCalledWith(mockTypeCode);
    });

    it('should return empty array when no locations of type exist', async () => {
      // Arrange
      mockLocationsService.findByType.mockResolvedValue([]);

      // Act
      const result = await controller.findByType('non-existent-type');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return location by ID', async () => {
      // Arrange
      mockLocationsService.findOne.mockResolvedValue(mockLocation as Location);

      // Act
      const result = await controller.findOne(mockLocationId);

      // Assert
      expect(result).toEqual(mockLocation);
      expect(mockLocationsService.findOne).toHaveBeenCalledWith(mockLocationId);
    });

    it('should throw NotFoundException when location not found', async () => {
      // Arrange
      mockLocationsService.findOne.mockRejectedValue(
        new NotFoundException('Локация с ID non-existent-id не найдена'),
      );

      // Act & Assert
      await expect(controller.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateLocationDto = {
      name: 'Updated Office Name',
      description: 'Updated description',
    };

    it('should update location successfully', async () => {
      // Arrange
      const updatedLocation = { ...mockLocation, ...updateDto };
      mockLocationsService.update.mockResolvedValue(updatedLocation as Location);

      // Act
      const result = await controller.update(mockLocationId, updateDto);

      // Assert
      expect(result).toEqual(updatedLocation);
      expect(mockLocationsService.update).toHaveBeenCalledWith(mockLocationId, updateDto);
    });

    it('should throw NotFoundException when location not found', async () => {
      // Arrange
      mockLocationsService.update.mockRejectedValue(
        new NotFoundException('Локация с ID non-existent-id не найдена'),
      );

      // Act & Assert
      await expect(controller.update('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when updating to existing name in city', async () => {
      // Arrange
      mockLocationsService.update.mockRejectedValue(
        new ConflictException(
          'Локация с названием "Existing Name" уже существует в городе Tashkent',
        ),
      );

      // Act & Assert
      await expect(controller.update(mockLocationId, updateDto)).rejects.toThrow(ConflictException);
    });

    it('should update location with partial data', async () => {
      // Arrange
      const partialUpdate: UpdateLocationDto = { description: 'Only description' };
      const updatedLocation = { ...mockLocation, ...partialUpdate };
      mockLocationsService.update.mockResolvedValue(updatedLocation as Location);

      // Act
      const result = await controller.update(mockLocationId, partialUpdate);

      // Assert
      expect(result).toEqual(updatedLocation);
    });
  });

  describe('remove', () => {
    it('should delete location successfully', async () => {
      // Arrange
      mockLocationsService.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove(mockLocationId);

      // Assert
      expect(mockLocationsService.remove).toHaveBeenCalledWith(mockLocationId);
    });

    it('should throw NotFoundException when location not found', async () => {
      // Arrange
      mockLocationsService.remove.mockRejectedValue(
        new NotFoundException('Локация с ID non-existent-id не найдена'),
      );

      // Act & Assert
      await expect(controller.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in city parameter', async () => {
      // Arrange
      const specialCity = "City's Name & Co.";
      mockLocationsService.findByCity.mockResolvedValue([]);

      // Act
      const result = await controller.findByCity(specialCity);

      // Assert
      expect(mockLocationsService.findByCity).toHaveBeenCalledWith(specialCity);
      expect(result).toEqual([]);
    });

    it('should handle special characters in type_code parameter', async () => {
      // Arrange
      const specialType = 'type-code_123';
      mockLocationsService.findByType.mockResolvedValue([]);

      // Act
      const result = await controller.findByType(specialType);

      // Assert
      expect(mockLocationsService.findByType).toHaveBeenCalledWith(specialType);
      expect(result).toEqual([]);
    });

    it('should propagate service errors correctly', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockLocationsService.findAll.mockRejectedValue(dbError);

      // Act & Assert
      await expect(controller.findAll()).rejects.toThrow('Database connection failed');
    });
  });
});
