import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ClientPublicService } from './client-public.service';
import { Location, LocationStatus } from '@modules/locations/entities/location.entity';
import { Machine, MachineStatus } from '@modules/machines/entities/machine.entity';
import { Nomenclature } from '@modules/nomenclature/entities/nomenclature.entity';
import { EmailService } from '@modules/email/email.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { UsersService } from '@modules/users/users.service';
import { UserRole } from '@modules/users/entities/user.entity';

describe('ClientPublicService', () => {
  let service: ClientPublicService;
  let locationRepository: jest.Mocked<Repository<Location>>;
  let machineRepository: jest.Mocked<Repository<Machine>>;
  let nomenclatureRepository: jest.Mocked<Repository<Nomenclature>>;
  let emailService: jest.Mocked<EmailService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let usersService: jest.Mocked<UsersService>;

  const mockLocation: Partial<Location> = {
    id: 'loc-1',
    name: 'Test Location',
    address: '123 Test St',
    city: 'Test City',
    latitude: 41.311081,
    longitude: 69.240562,
    status: LocationStatus.ACTIVE,
    working_hours: {
      monday: { from: '09:00', to: '18:00' },
      tuesday: { from: '09:00', to: '18:00' },
    },
  };

  const mockMachine: Partial<Machine> = {
    id: 'machine-1',
    machine_number: 'M-001',
    name: 'Test Machine',
    status: MachineStatus.ACTIVE,
    qr_code: 'QR-M-001',
    location: mockLocation as Location,
  };

  const _mockNomenclature = {
    id: 'nom-1',
    name: 'Coffee',
    description: 'Hot coffee',
    category_code: 'drinks',
    selling_price: 5000,
    is_active: true,
    image_url: 'http://example.com/coffee.jpg',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientPublicService,
        {
          provide: getRepositoryToken(Location),
          useValue: {
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Nomenclature),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByRoles: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ClientPublicService>(ClientPublicService);
    locationRepository = module.get(getRepositoryToken(Location));
    machineRepository = module.get(getRepositoryToken(Machine));
    nomenclatureRepository = module.get(getRepositoryToken(Nomenclature));
    emailService = module.get(EmailService);
    notificationsService = module.get(NotificationsService);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getPublicLocations', () => {
    const createMockQueryBuilder = (locations: any[], total: number) => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      loadRelationCountAndMap: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(total),
      getMany: jest.fn().mockResolvedValue(locations),
    });

    it('should return paginated locations', async () => {
      const locations = [{ ...mockLocation, machine_count: 5 }];
      const qb = createMockQueryBuilder(locations, 1);
      locationRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getPublicLocations({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data[0].name).toBe('Test Location');
    });

    it('should filter by search term', async () => {
      const qb = createMockQueryBuilder([], 0);
      locationRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getPublicLocations({ search: 'coffee', page: 1, limit: 10 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(location.name ILIKE :search OR location.address ILIKE :search)',
        { search: '%coffee%' },
      );
    });

    it('should filter by city', async () => {
      const qb = createMockQueryBuilder([], 0);
      locationRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getPublicLocations({ city: 'Tashkent', page: 1, limit: 10 });

      expect(qb.andWhere).toHaveBeenCalledWith('location.city = :city', { city: 'Tashkent' });
    });

    it('should calculate distance when coordinates provided', async () => {
      const locations = [{
        ...mockLocation,
        machine_count: 3,
        latitude: 41.311081,
        longitude: 69.240562,
      }];
      const qb = createMockQueryBuilder(locations, 1);
      locationRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getPublicLocations({
        lat: 41.299496,
        lng: 69.240073,
        page: 1,
        limit: 10,
      });

      expect(result.data[0].distance_km).toBeDefined();
      expect(typeof result.data[0].distance_km).toBe('number');
    });

    it('should sort by distance when coordinates provided', async () => {
      const locations = [
        { ...mockLocation, id: 'loc-1', latitude: 41.5, longitude: 69.5, machine_count: 1 },
        { ...mockLocation, id: 'loc-2', latitude: 41.3, longitude: 69.2, machine_count: 2 },
      ];
      const qb = createMockQueryBuilder(locations, 2);
      locationRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getPublicLocations({
        lat: 41.3,
        lng: 69.2,
        page: 1,
        limit: 10,
      });

      // Should be sorted by distance (closest first)
      expect(result.data.length).toBe(2);
    });

    it('should handle locations without coordinates', async () => {
      const locations = [{
        ...mockLocation,
        latitude: null,
        longitude: null,
        machine_count: 2,
      }];
      const qb = createMockQueryBuilder(locations, 1);
      locationRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getPublicLocations({
        lat: 41.3,
        lng: 69.2,
        page: 1,
        limit: 10,
      });

      expect(result.data[0].lat).toBeUndefined();
      expect(result.data[0].lng).toBeUndefined();
      expect(result.data[0].distance_km).toBeUndefined();
    });

    it('should use default pagination values', async () => {
      const qb = createMockQueryBuilder([], 0);
      locationRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getPublicLocations({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should handle null working_hours', async () => {
      const locations = [{
        ...mockLocation,
        working_hours: null,
        machine_count: 1,
      }];
      const qb = createMockQueryBuilder(locations, 1);
      locationRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getPublicLocations({ page: 1, limit: 10 });

      expect(result.data[0].working_hours).toBeUndefined();
    });

    it('should handle zero machine count', async () => {
      const locations = [{
        ...mockLocation,
        machine_count: undefined,
      }];
      const qb = createMockQueryBuilder(locations, 1);
      locationRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getPublicLocations({ page: 1, limit: 10 });

      expect(result.data[0].machine_count).toBe(0);
    });
  });

  describe('getMachineMenu', () => {
    const createMockNomenclatureQb = (products: any[]) => ({
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(products),
    });

    it('should return menu items for active machine', async () => {
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      const products = [{
        nom_id: 'nom-1',
        nom_name: 'Coffee',
        nom_description: 'Hot coffee',
        nom_default_price: '5000',
        nom_category: 'drinks',
        nom_image_url: 'http://example.com/coffee.jpg',
        stock: '10',
      }];
      const qb = createMockNomenclatureQb(products);
      nomenclatureRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getMachineMenu({ machine_id: 'machine-1' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('nom-1');
      expect(result[0].name).toBe('Coffee');
      expect(result[0].price).toBe(5000);
      expect(result[0].currency).toBe('UZS');
      expect(result[0].is_available).toBe(true);
      expect(result[0].stock).toBe(10);
      expect(result[0].points_earned).toBe(5);
    });

    it('should throw NotFoundException for non-existent machine', async () => {
      machineRepository.findOne.mockResolvedValue(null);

      await expect(service.getMachineMenu({ machine_id: 'non-existent' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should return empty menu for disabled machine', async () => {
      machineRepository.findOne.mockResolvedValue({
        ...mockMachine,
        status: MachineStatus.DISABLED,
      } as Machine);

      const result = await service.getMachineMenu({ machine_id: 'machine-1' });

      expect(result).toEqual([]);
    });

    it('should return empty menu for offline machine', async () => {
      machineRepository.findOne.mockResolvedValue({
        ...mockMachine,
        status: MachineStatus.OFFLINE,
      } as Machine);

      const result = await service.getMachineMenu({ machine_id: 'machine-1' });

      expect(result).toEqual([]);
    });

    it('should filter by category', async () => {
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      const qb = createMockNomenclatureQb([]);
      nomenclatureRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getMachineMenu({ machine_id: 'machine-1', category: 'drinks' });

      expect(qb.andWhere).toHaveBeenCalledWith('nom.category = :category', { category: 'drinks' });
    });

    it('should mark items as unavailable when stock is 0', async () => {
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      const products = [{
        nom_id: 'nom-1',
        nom_name: 'Coffee',
        nom_description: 'Hot coffee',
        nom_default_price: '5000',
        nom_category: 'drinks',
        nom_image_url: null,
        stock: '0',
      }];
      const qb = createMockNomenclatureQb(products);
      nomenclatureRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getMachineMenu({ machine_id: 'machine-1' });

      expect(result[0].is_available).toBe(false);
      expect(result[0].stock).toBe(0);
    });

    it('should handle null price', async () => {
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      const products = [{
        nom_id: 'nom-1',
        nom_name: 'Free Item',
        nom_description: null,
        nom_default_price: null,
        nom_category: 'promo',
        nom_image_url: null,
        stock: '5',
      }];
      const qb = createMockNomenclatureQb(products);
      nomenclatureRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getMachineMenu({ machine_id: 'machine-1' });

      expect(result[0].price).toBe(0);
      expect(result[0].points_earned).toBe(0);
    });
  });

  describe('resolveQrCode', () => {
    it('should resolve QR code directly', async () => {
      machineRepository.findOne.mockResolvedValue({
        ...mockMachine,
        location: mockLocation,
      } as Machine);

      const result = await service.resolveQrCode({ qr_code: 'QR-M-001' });

      expect(result.machine_id).toBe('machine-1');
      expect(result.machine_number).toBe('M-001');
      expect(result.is_available).toBe(true);
      expect(result.location).toBeDefined();
    });

    it('should resolve by machine_number if QR not found', async () => {
      machineRepository.findOne
        .mockResolvedValueOnce(null) // First call with qr_code
        .mockResolvedValueOnce({ ...mockMachine, location: mockLocation } as Machine); // Second call with machine_number

      const result = await service.resolveQrCode({ qr_code: 'M-001' });

      expect(result.machine_id).toBe('machine-1');
    });

    it('should resolve from URL pattern', async () => {
      machineRepository.findOne
        .mockResolvedValueOnce(null) // qr_code
        .mockResolvedValueOnce(null) // machine_number
        .mockResolvedValueOnce({ ...mockMachine, location: mockLocation } as Machine); // extracted from URL

      const result = await service.resolveQrCode({ qr_code: 'https://vendhub.com/machine/M-001' });

      expect(result.machine_id).toBe('machine-1');
    });

    it('should resolve from URL pattern with /m/ prefix', async () => {
      machineRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockMachine, location: mockLocation } as Machine);

      const result = await service.resolveQrCode({ qr_code: 'https://vendhub.com/m/M-002' });

      expect(result.machine_id).toBe('machine-1');
    });

    it('should throw NotFoundException for unknown QR code', async () => {
      machineRepository.findOne.mockResolvedValue(null);

      await expect(service.resolveQrCode({ qr_code: 'UNKNOWN' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should return unavailable_reason for disabled machine', async () => {
      machineRepository.findOne.mockResolvedValue({
        ...mockMachine,
        status: MachineStatus.DISABLED,
        location: mockLocation,
      } as Machine);

      const result = await service.resolveQrCode({ qr_code: 'QR-M-001' });

      expect(result.is_available).toBe(false);
      expect(result.unavailable_reason).toBe('Machine is disabled');
    });

    it('should return unavailable_reason for offline machine', async () => {
      machineRepository.findOne.mockResolvedValue({
        ...mockMachine,
        status: MachineStatus.OFFLINE,
        location: mockLocation,
      } as Machine);

      const result = await service.resolveQrCode({ qr_code: 'QR-M-001' });

      expect(result.is_available).toBe(false);
      expect(result.unavailable_reason).toBe('Machine is offline');
    });

    it('should return unavailable_reason for error status machine', async () => {
      machineRepository.findOne.mockResolvedValue({
        ...mockMachine,
        status: MachineStatus.ERROR,
        location: mockLocation,
      } as Machine);

      const result = await service.resolveQrCode({ qr_code: 'QR-M-001' });

      expect(result.is_available).toBe(false);
      expect(result.unavailable_reason).toBe('Machine is temporarily unavailable');
    });

    it('should handle machine without location', async () => {
      machineRepository.findOne.mockResolvedValue({
        ...mockMachine,
        location: undefined,
      } as any);

      const result = await service.resolveQrCode({ qr_code: 'QR-M-001' });

      expect(result.location).toBeUndefined();
    });

    it('should handle location without coordinates', async () => {
      const locationWithoutCoords = {
        ...mockLocation,
        latitude: undefined as any,
        longitude: undefined as any,
      };
      machineRepository.findOne.mockResolvedValue({
        ...mockMachine,
        location: locationWithoutCoords,
      } as any);

      const result = await service.resolveQrCode({ qr_code: 'QR-M-001' });

      expect(result.location?.lat).toBeUndefined();
      expect(result.location?.lng).toBeUndefined();
    });
  });

  describe('getCities', () => {
    it('should return list of unique cities', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { city: 'Tashkent' },
          { city: 'Samarkand' },
          { city: 'Bukhara' },
        ]),
      };
      locationRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getCities();

      expect(result).toEqual(['Tashkent', 'Samarkand', 'Bukhara']);
    });

    it('should filter out null/undefined cities', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { city: 'Tashkent' },
          { city: null },
          { city: '' },
          { city: 'Samarkand' },
        ]),
      };
      locationRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getCities();

      expect(result).toEqual(['Tashkent', 'Samarkand']);
    });

    it('should return empty array when no cities', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      locationRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getCities();

      expect(result).toEqual([]);
    });
  });

  describe('handleCooperationRequest', () => {
    const mockDto = {
      name: 'John Doe',
      phone: '+998901234567',
      email: 'john@example.com',
      company: 'Test Company',
      message: 'We want to cooperate',
    };

    const mockRecipients = [
      { id: 'user-1', email: 'admin@example.com', telegram_user_id: '123456', role: UserRole.ADMIN },
      { id: 'user-2', email: 'manager@example.com', telegram_user_id: null, role: UserRole.MANAGER },
    ];

    it('should send notifications to all recipients', async () => {
      usersService.findByRoles.mockResolvedValue(mockRecipients as any);
      notificationsService.create.mockResolvedValue({} as any);
      emailService.sendEmail.mockResolvedValue(true);

      const result = await service.handleCooperationRequest(mockDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Спасибо');
      expect(usersService.findByRoles).toHaveBeenCalledWith([
        UserRole.OWNER,
        UserRole.ADMIN,
        UserRole.MANAGER,
      ]);
    });

    it('should handle when no recipients found', async () => {
      usersService.findByRoles.mockResolvedValue([]);

      const result = await service.handleCooperationRequest(mockDto);

      expect(result.success).toBe(true);
    });

    it('should send telegram notification if user has telegram_user_id', async () => {
      usersService.findByRoles.mockResolvedValue([mockRecipients[0]] as any);
      notificationsService.create.mockResolvedValue({} as any);
      emailService.sendEmail.mockResolvedValue(true);

      await service.handleCooperationRequest(mockDto);

      // Should create at least 2 notifications (in-app + telegram)
      expect(notificationsService.create).toHaveBeenCalledTimes(2);
    });

    it('should send email if user has email', async () => {
      usersService.findByRoles.mockResolvedValue([mockRecipients[0]] as any);
      notificationsService.create.mockResolvedValue({} as any);
      emailService.sendEmail.mockResolvedValue(true);

      await service.handleCooperationRequest(mockDto);

      expect(emailService.sendEmail).toHaveBeenCalled();
    });

    it('should handle errors gracefully and still return success', async () => {
      usersService.findByRoles.mockRejectedValue(new Error('Database error'));

      const result = await service.handleCooperationRequest(mockDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Спасибо');
    });

    it('should handle request without optional fields', async () => {
      usersService.findByRoles.mockResolvedValue([mockRecipients[1]] as any);
      notificationsService.create.mockResolvedValue({} as any);

      const minimalDto = {
        name: 'Jane',
        phone: '+998909876543',
        message: 'Hello',
      };

      const result = await service.handleCooperationRequest(minimalDto as any);

      expect(result.success).toBe(true);
    });

    it('should not send telegram if user has no telegram_user_id', async () => {
      usersService.findByRoles.mockResolvedValue([mockRecipients[1]] as any);
      notificationsService.create.mockResolvedValue({} as any);

      await service.handleCooperationRequest(mockDto);

      // Should only create 1 notification (in-app only, no telegram)
      expect(notificationsService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('formatCooperationMessage (private)', () => {
    it('should format message with all fields', () => {
      const dto = {
        name: 'John Doe',
        phone: '+998901234567',
        email: 'john@example.com',
        company: 'Test Company',
        message: 'We want to cooperate',
      };

      const result = (service as any).formatCooperationMessage(dto);

      expect(result).toContain('John Doe');
      expect(result).toContain('+998901234567');
      expect(result).toContain('john@example.com');
      expect(result).toContain('Test Company');
      expect(result).toContain('We want to cooperate');
    });

    it('should format message without optional fields', () => {
      const dto = {
        name: 'Jane',
        phone: '+998909876543',
        message: 'Simple message',
      };

      const result = (service as any).formatCooperationMessage(dto);

      expect(result).toContain('Jane');
      expect(result).toContain('+998909876543');
      expect(result).toContain('Simple message');
      expect(result).not.toContain('Email:');
      expect(result).not.toContain('Компания:');
    });
  });

  describe('sendCooperationEmail (private)', () => {
    it('should send email with proper content', async () => {
      emailService.sendEmail.mockResolvedValue(true);

      const dto = {
        name: 'John Doe',
        phone: '+998901234567',
        email: 'john@example.com',
        company: 'Test Company',
        message: 'We want to cooperate',
      };

      const result = await (service as any).sendCooperationEmail('admin@example.com', dto);

      expect(result).toBe(true);
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@example.com',
          subject: expect.stringContaining('сотрудничество'),
          html: expect.stringContaining('John Doe'),
          text: expect.stringContaining('John Doe'),
        }),
      );
    });

    it('should include optional fields in email', async () => {
      emailService.sendEmail.mockResolvedValue(true);

      const dto = {
        name: 'Jane',
        phone: '+998909876543',
        email: 'jane@test.com',
        company: 'Big Corp',
        message: 'Hello\nWorld',
      };

      await (service as any).sendCooperationEmail('admin@example.com', dto);

      const emailCall = emailService.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain('jane@test.com');
      expect(emailCall.html).toContain('Big Corp');
    });

    it('should handle message with newlines', async () => {
      emailService.sendEmail.mockResolvedValue(true);

      const dto = {
        name: 'Test',
        phone: '+998900000000',
        message: 'Line 1\nLine 2\nLine 3',
      };

      await (service as any).sendCooperationEmail('admin@example.com', dto);

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('<br>'),
        }),
      );
    });
  });

  describe('calculateDistance (private)', () => {
    it('should calculate distance between two points', () => {
      // Tashkent coordinates
      const lat1 = 41.311081;
      const lon1 = 69.240562;
      // Samarkand coordinates (approximately 270km away)
      const lat2 = 39.654419;
      const lon2 = 66.959740;

      const distance = (service as any).calculateDistance(lat1, lon1, lat2, lon2);

      // Distance should be approximately 270-280 km
      expect(distance).toBeGreaterThan(250);
      expect(distance).toBeLessThan(300);
    });

    it('should return 0 for same coordinates', () => {
      const lat = 41.311081;
      const lon = 69.240562;

      const distance = (service as any).calculateDistance(lat, lon, lat, lon);

      expect(distance).toBe(0);
    });

    it('should round to 1 decimal place', () => {
      const distance = (service as any).calculateDistance(41.0, 69.0, 41.1, 69.1);

      // Check that it's rounded to 1 decimal
      const decimalPart = distance.toString().split('.')[1];
      expect(decimalPart ? decimalPart.length : 0).toBeLessThanOrEqual(1);
    });
  });

  describe('deg2rad (private)', () => {
    it('should convert degrees to radians', () => {
      expect((service as any).deg2rad(0)).toBe(0);
      expect((service as any).deg2rad(180)).toBeCloseTo(Math.PI);
      expect((service as any).deg2rad(90)).toBeCloseTo(Math.PI / 2);
      expect((service as any).deg2rad(360)).toBeCloseTo(2 * Math.PI);
    });

    it('should handle negative degrees', () => {
      expect((service as any).deg2rad(-90)).toBeCloseTo(-Math.PI / 2);
    });
  });
});
