import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { MachinesService } from './machines.service';
import { Machine, MachineStatus } from './entities/machine.entity';
import { MachineLocationHistory } from './entities/machine-location-history.entity';
import { QrCodeService } from './qr-code.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { WriteoffMachineDto } from './dto/writeoff-machine.dto';
import { WriteoffJobStatus } from './dto/writeoff-job-status.dto';

describe('MachinesService', () => {
  let service: MachinesService;
  let machineRepository: jest.Mocked<Repository<Machine>>;
  let locationHistoryRepository: jest.Mocked<Repository<MachineLocationHistory>>;
  let qrCodeService: jest.Mocked<QrCodeService>;
  let _transactionsService: jest.Mocked<TransactionsService>;
  let writeoffQueue: any;

  // Mock data - use Partial and casting to avoid strict type checks on relations
  const mockMachine = {
    id: 'machine-1',
    machine_number: 'M-001',
    name: 'Coffee Machine 1',
    type_code: 'coffee',
    status: MachineStatus.ACTIVE,
    location_id: 'location-1',
    location: null,
    contract_id: null,
    contract: null,
    manufacturer: 'Acme',
    model: 'CM-100',
    serial_number: 'SN12345',
    year_of_manufacture: 2022,
    installation_date: new Date('2023-01-15'),
    last_maintenance_date: new Date('2024-01-15'),
    next_maintenance_date: new Date('2024-07-15'),
    max_product_slots: 10,
    current_product_count: 5,
    cash_capacity: 100000,
    current_cash_amount: 25000,
    accepts_cash: true,
    accepts_card: true,
    accepts_qr: false,
    accepts_nfc: false,
    qr_code: 'QR-001',
    qr_code_url: 'https://app.com/complaint/QR-001',
    assigned_operator_id: null,
    assigned_technician_id: null,
    notes: null,
    settings: null,
    metadata: null,
    low_stock_threshold_percent: 10,
    total_sales_count: 100,
    total_revenue: 50000,
    last_refill_date: new Date('2024-01-10'),
    last_collection_date: new Date('2024-01-05'),
    last_ping_at: new Date(),
    is_online: true,
    connectivity_status: 'online',
    purchase_price: 1000000,
    purchase_date: new Date('2023-01-01'),
    depreciation_years: 5,
    depreciation_method: 'linear',
    accumulated_depreciation: 100000,
    last_depreciation_date: new Date('2024-01-01'),
    is_disposed: false,
    disposal_date: null,
    disposal_reason: null,
    disposal_transaction_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  } as unknown as Machine;

  const mockLocationHistory = {
    id: 'history-1',
    machine_id: 'machine-1',
    machine: null,
    from_location_id: null,
    from_location: null,
    to_location_id: 'location-1',
    to_location: null,
    moved_at: new Date(),
    moved_by_user_id: 'user-1',
    moved_by: null,
    reason: 'Initial placement',
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  } as unknown as MachineLocationHistory;

  let mockQueryBuilder: any;

  beforeEach(async () => {
    // Mock QueryBuilder
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockMachine]),
      getManyAndCount: jest.fn().mockResolvedValue([[mockMachine], 1]),
      getOne: jest.fn().mockResolvedValue(mockMachine),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ total: '50000' }),
    };

    // Mock Machine Repository
    const mockMachineRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    // Mock Location History Repository
    const mockLocationHistoryRepository = {
      create: jest.fn((data) => ({ ...mockLocationHistory, ...data })),
      save: jest.fn().mockResolvedValue(mockLocationHistory),
      find: jest.fn().mockResolvedValue([mockLocationHistory]),
    };

    // Mock QR Code Service
    const mockQrCodeService = {
      generateUniqueQrCode: jest.fn().mockReturnValue('QR-TEST-001'),
      getComplaintUrl: jest.fn().mockReturnValue('https://app.com/complaint/QR-TEST-001'),
      getMachineByQrCode: jest.fn(),
      generateQrCodeImage: jest.fn().mockResolvedValue('data:image/png;base64,...'),
      generateQrCodeBuffer: jest.fn().mockResolvedValue(Buffer.from('test-qr-buffer')),
      regenerateQrCode: jest.fn(),
      assignQrCodeToMachine: jest.fn(),
    };

    // Mock Transactions Service
    const mockTransactionsService = {
      create: jest.fn(),
    };

    // Mock Writeoff Queue
    const mockWriteoffQueue = {
      add: jest.fn().mockResolvedValue({ id: '123' }),
      getJob: jest.fn(),
      getCompleted: jest.fn().mockResolvedValue([]),
      getFailed: jest.fn().mockResolvedValue([]),
      getActive: jest.fn().mockResolvedValue([]),
      getWaiting: jest.fn().mockResolvedValue([]),
      getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, active: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachinesService,
        {
          provide: getRepositoryToken(Machine),
          useValue: mockMachineRepository,
        },
        {
          provide: getRepositoryToken(MachineLocationHistory),
          useValue: mockLocationHistoryRepository,
        },
        {
          provide: QrCodeService,
          useValue: mockQrCodeService,
        },
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
        {
          provide: 'BullQueue_machine-writeoff',
          useValue: mockWriteoffQueue,
        },
      ],
    }).compile();

    service = module.get<MachinesService>(MachinesService);
    machineRepository = module.get(getRepositoryToken(Machine));
    locationHistoryRepository = module.get(getRepositoryToken(MachineLocationHistory));
    qrCodeService = module.get(QrCodeService);
    _transactionsService = module.get(TransactionsService);
    writeoffQueue = module.get('BullQueue_machine-writeoff');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // CREATE MACHINE TESTS
  // ============================================================================

  describe('create', () => {
    it('should create machine with auto-generated QR code', async () => {
      // Arrange
      const createDto: CreateMachineDto = {
        machine_number: 'M-002',
        name: 'New Coffee Machine',
        type_code: 'coffee',
        location_id: 'location-1',
      } as CreateMachineDto;

      const expectedMachine = {
        ...mockMachine,
        ...createDto,
        qr_code: 'QR-TEST-001',
        qr_code_url: 'https://app.com/complaint/QR-TEST-001',
        is_online: false,
        accumulated_depreciation: 0,
      };

      machineRepository.findOne.mockResolvedValue(null); // No duplicate
      machineRepository.create.mockReturnValue(expectedMachine as Machine);
      machineRepository.save.mockResolvedValue(expectedMachine as Machine);

      // Act
      const result = await service.create(createDto, 'user-1');

      // Assert
      expect(machineRepository.findOne).toHaveBeenCalledWith({
        where: { machine_number: createDto.machine_number },
      });
      expect(qrCodeService.generateUniqueQrCode).toHaveBeenCalled();
      expect(qrCodeService.getComplaintUrl).toHaveBeenCalledWith('QR-TEST-001');
      expect(machineRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          machine_number: createDto.machine_number,
          qr_code: 'QR-TEST-001',
          is_online: false,
          accumulated_depreciation: 0,
        }),
      );
      expect(machineRepository.save).toHaveBeenCalled();
      expect(result).toEqual(expectedMachine);
    });

    it('should record initial location history when location_id is provided', async () => {
      // Arrange
      const createDto: CreateMachineDto = {
        machine_number: 'M-003',
        name: 'Machine with Location',
        type_code: 'coffee',
        location_id: 'location-1',
      } as CreateMachineDto;

      const savedMachine = { ...mockMachine, id: 'new-machine-id', ...createDto };
      machineRepository.findOne.mockResolvedValue(null);
      machineRepository.create.mockReturnValue(savedMachine as Machine);
      machineRepository.save.mockResolvedValue(savedMachine as Machine);

      // Act
      await service.create(createDto, 'user-1');

      // Assert
      expect(locationHistoryRepository.create).toHaveBeenCalledWith({
        machine: { id: savedMachine.id },
        from_location_id: null,
        to_location_id: createDto.location_id,
        moved_by_user_id: 'user-1',
        moved_at: expect.any(Date),
      });
      expect(locationHistoryRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if machine number already exists', async () => {
      // Arrange
      const createDto: CreateMachineDto = {
        machine_number: 'M-001', // Existing
        name: 'Duplicate Machine',
        type_code: 'coffee',
        location_id: 'location-1',
      } as CreateMachineDto;

      machineRepository.findOne.mockResolvedValue(mockMachine);

      // Act & Assert
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(ConflictException);
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        /Machine with number M-001 already exists/,
      );
    });

    it('should not record location history when location_id is not provided', async () => {
      // Arrange
      const createDto: CreateMachineDto = {
        machine_number: 'M-004',
        name: 'Machine without Location',
        type_code: 'coffee',
      } as CreateMachineDto;

      const savedMachine = { ...mockMachine, ...createDto, location_id: undefined };
      machineRepository.findOne.mockResolvedValue(null);
      machineRepository.create.mockReturnValue(savedMachine as unknown as Machine);
      machineRepository.save.mockResolvedValue(savedMachine as unknown as Machine);

      // Act
      await service.create(createDto, 'user-1');

      // Assert
      expect(locationHistoryRepository.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // FIND ALL TESTS
  // ============================================================================

  describe('findAll', () => {
    it('should return all machines without filters', async () => {
      // Act
      const result = await service.findAll();

      // Assert
      expect(result.data).toEqual([mockMachine]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(machineRepository.createQueryBuilder).toHaveBeenCalledWith('machine');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'machine.location',
        'location',
      );
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
    });

    it('should filter machines by location_id', async () => {
      // Act
      await service.findAll({ location_id: 'location-1' });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('machine.location_id = :location_id', {
        location_id: 'location-1',
      });
    });

    it('should filter machines by status', async () => {
      // Act
      await service.findAll({ status: MachineStatus.ACTIVE });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('machine.status = :status', {
        status: MachineStatus.ACTIVE,
      });
    });

    it('should filter machines by is_online true', async () => {
      // Act
      await service.findAll({ is_online: true });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('machine.is_online = :is_online', {
        is_online: true,
      });
    });

    it('should filter machines by is_online false', async () => {
      // Act
      await service.findAll({ is_online: false });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('machine.is_online = :is_online', {
        is_online: false,
      });
    });

    it('should apply multiple filters together', async () => {
      // Act
      await service.findAll({
        location_id: 'location-1',
        status: MachineStatus.ACTIVE,
        is_online: true,
      });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // FIND ONE TESTS
  // ============================================================================

  describe('findOne', () => {
    it('should return machine by ID with location relation', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine);

      // Act
      const result = await service.findOne('machine-1');

      // Assert
      expect(result).toEqual(mockMachine);
      expect(machineRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'machine-1' },
        relations: ['location'],
      });
    });

    it('should throw NotFoundException when machine not found', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        /Machine with ID non-existent not found/,
      );
    });
  });

  // ============================================================================
  // FIND BY MACHINE NUMBER TESTS
  // ============================================================================

  describe('findByMachineNumber', () => {
    it('should return machine by machine_number', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine);

      // Act
      const result = await service.findByMachineNumber('M-001');

      // Assert
      expect(result).toEqual(mockMachine);
      expect(machineRepository.findOne).toHaveBeenCalledWith({
        where: { machine_number: 'M-001' },
        relations: ['location'],
      });
    });

    it('should throw NotFoundException when machine number not found', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByMachineNumber('M-999')).rejects.toThrow(NotFoundException);
      await expect(service.findByMachineNumber('M-999')).rejects.toThrow(
        /Machine with number M-999 not found/,
      );
    });
  });

  // ============================================================================
  // FIND BY QR CODE TESTS
  // ============================================================================

  describe('findByQrCode', () => {
    it('should return machine by QR code', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine);

      // Act
      const result = await service.findByQrCode('QR-001');

      // Assert
      expect(result).toEqual(mockMachine);
      expect(machineRepository.findOne).toHaveBeenCalledWith({
        where: { qr_code: 'QR-001' },
        relations: ['location'],
      });
    });

    it('should throw NotFoundException when QR code not found', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByQrCode('QR-999')).rejects.toThrow(NotFoundException);
      await expect(service.findByQrCode('QR-999')).rejects.toThrow(
        /Machine with QR code QR-999 not found/,
      );
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================

  describe('update', () => {
    it('should update machine successfully', async () => {
      // Arrange
      const updateDto: UpdateMachineDto = {
        name: 'Updated Machine Name',
        status: MachineStatus.MAINTENANCE,
      };

      const updatedMachine = { ...mockMachine, ...updateDto };
      machineRepository.findOne
        .mockResolvedValueOnce(mockMachine)
        .mockResolvedValueOnce(updatedMachine as Machine);
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.update('machine-1', updateDto);

      // Assert
      expect(machineRepository.update).toHaveBeenCalledWith('machine-1', updateDto);
      expect(result.name).toBe('Updated Machine Name');
      expect(result.status).toBe(MachineStatus.MAINTENANCE);
    });

    it('should record location history when location changes', async () => {
      // Arrange
      const updateDto: UpdateMachineDto = {
        location_id: 'location-2', // Different from current location-1
      };
      const userId = 'user-123';

      const updatedMachine = { ...mockMachine, location_id: 'location-2' };
      machineRepository.findOne
        .mockResolvedValueOnce(mockMachine)
        .mockResolvedValueOnce(updatedMachine as Machine);
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.update('machine-1', updateDto, userId);

      // Assert
      expect(locationHistoryRepository.create).toHaveBeenCalledWith({
        machine: { id: 'machine-1' },
        from_location_id: 'location-1',
        to_location_id: 'location-2',
        moved_by_user_id: userId,
        moved_at: expect.any(Date),
      });
      expect(locationHistoryRepository.save).toHaveBeenCalled();
    });

    it('should not record location history when location does not change', async () => {
      // Arrange
      const updateDto: UpdateMachineDto = {
        location_id: 'location-1', // Same as current
      };

      machineRepository.findOne
        .mockResolvedValueOnce(mockMachine)
        .mockResolvedValueOnce(mockMachine);
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.update('machine-1', updateDto);

      // Assert
      expect(locationHistoryRepository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when machine not found', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('non-existent', {})).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // REMOVE (SOFT DELETE) TESTS
  // ============================================================================

  describe('remove', () => {
    it('should soft delete machine when status is not ACTIVE', async () => {
      // Arrange
      const inactiveMachine = { ...mockMachine, status: MachineStatus.DISABLED };
      machineRepository.findOne.mockResolvedValue(inactiveMachine as Machine);

      // Act
      await service.remove('machine-1');

      // Assert
      expect(machineRepository.softDelete).toHaveBeenCalledWith('machine-1');
    });

    it('should soft delete machine when status is OFFLINE', async () => {
      // Arrange
      const offlineMachine = { ...mockMachine, status: MachineStatus.OFFLINE };
      machineRepository.findOne.mockResolvedValue(offlineMachine as Machine);

      // Act
      await service.remove('machine-1');

      // Assert
      expect(machineRepository.softDelete).toHaveBeenCalledWith('machine-1');
    });

    it('should throw BadRequestException when trying to delete ACTIVE machine', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine); // ACTIVE status

      // Act & Assert
      await expect(service.remove('machine-1')).rejects.toThrow(BadRequestException);
      await expect(service.remove('machine-1')).rejects.toThrow(/Cannot delete active machine/);
    });

    it('should throw NotFoundException when machine not found', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // GET MACHINE STATS BY LOCATION TESTS
  // ============================================================================

  describe('getMachineStatsByLocation', () => {
    it('should return correct stats for machines at location', async () => {
      // Arrange - use getRawMany format since we now use COUNT with GROUP BY
      const statusCounts = [
        { status: MachineStatus.ACTIVE, count: '2' },
        { status: MachineStatus.OFFLINE, count: '1' },
        { status: MachineStatus.ERROR, count: '1' },
        { status: MachineStatus.MAINTENANCE, count: '1' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(statusCounts);

      // Act
      const result = await service.getMachineStatsByLocation('location-1');

      // Assert
      expect(result).toEqual({
        total: 5,
        active: 2,
        offline: 1,
        error: 1,
        maintenance: 1,
      });
    });

    it('should return all zeros when no machines at location', async () => {
      // Arrange
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.getMachineStatsByLocation('location-empty');

      // Assert
      expect(result).toEqual({
        total: 0,
        active: 0,
        offline: 0,
        error: 0,
        maintenance: 0,
      });
    });
  });

  // ============================================================================
  // REGENERATE QR CODE TESTS
  // ============================================================================

  describe('regenerateQrCode', () => {
    it('should generate new QR code and update machine', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine);
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);
      qrCodeService.generateUniqueQrCode.mockReturnValue('QR-NEW-001');
      qrCodeService.getComplaintUrl.mockReturnValue('https://app.com/complaint/QR-NEW-001');

      // Act
      const result = await service.regenerateQrCode('machine-1');

      // Assert
      expect(machineRepository.update).toHaveBeenCalledWith('machine-1', {
        qr_code: 'QR-NEW-001',
        qr_code_url: 'https://app.com/complaint/QR-NEW-001',
      });
      expect(result).toEqual({
        qrCode: 'QR-NEW-001',
        url: 'https://app.com/complaint/QR-NEW-001',
      });
    });

    it('should throw NotFoundException when machine not found', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.regenerateQrCode('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // GET QR CODE IMAGE TESTS
  // ============================================================================

  describe('getQrCodeImage', () => {
    it('should return QR code buffer from QrCodeService', async () => {
      // Arrange
      const expectedBuffer = Buffer.from('test-qr-buffer');
      machineRepository.findOne.mockResolvedValue(mockMachine);
      qrCodeService.generateQrCodeBuffer.mockResolvedValue(expectedBuffer);

      // Act
      const result = await service.getQrCodeImage('machine-1');

      // Assert
      expect(qrCodeService.generateQrCodeBuffer).toHaveBeenCalledWith('machine-1');
      expect(result).toEqual(expectedBuffer);
    });

    it('should throw NotFoundException when machine not found', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getQrCodeImage('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // GET LOCATION HISTORY TESTS
  // ============================================================================

  describe('getLocationHistory', () => {
    it('should return location history for machine ordered by created_at DESC', async () => {
      // Arrange
      const histories = [
        { ...mockLocationHistory, id: 'h-1' },
        { ...mockLocationHistory, id: 'h-2' },
      ];
      locationHistoryRepository.find.mockResolvedValue(histories as MachineLocationHistory[]);

      // Act
      const result = await service.getLocationHistory('machine-1');

      // Assert
      expect(locationHistoryRepository.find).toHaveBeenCalledWith({
        where: { machine: { id: 'machine-1' } },
        order: { created_at: 'DESC' },
        relations: ['from_location', 'to_location'],
      });
      expect(result).toEqual(histories);
    });

    it('should return empty array when no location history', async () => {
      // Arrange
      locationHistoryRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getLocationHistory('machine-1');

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // UPDATE ONLINE STATUS TESTS
  // ============================================================================

  describe('updateOnlineStatus', () => {
    it('should mark machines offline when no recent ping', async () => {
      // Arrange
      const oldPingMachine = {
        ...mockMachine,
        is_online: true,
        last_ping_at: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };
      machineRepository.find.mockResolvedValue([oldPingMachine as Machine]);
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);
      machineRepository.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(0) // online
        .mockResolvedValueOnce(1); // offline

      // Act
      const result = await service.updateOnlineStatus(30);

      // Assert
      expect(result).toEqual({
        total: 1,
        online: 0,
        offline: 1,
        updated: 1,
      });
      expect(machineRepository.update).toHaveBeenCalledWith(
        { id: In([oldPingMachine.id]) },
        { is_online: false, status: MachineStatus.OFFLINE },
      );
    });

    it('should not update machines with recent ping', async () => {
      // Arrange
      machineRepository.find.mockResolvedValue([]); // No machines need update
      machineRepository.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1) // online
        .mockResolvedValueOnce(0); // offline

      // Act
      const result = await service.updateOnlineStatus(30);

      // Assert
      expect(result).toEqual({
        total: 1,
        online: 1,
        offline: 0,
        updated: 0,
      });
      expect(machineRepository.update).not.toHaveBeenCalled();
    });

    it('should use default threshold of 30 minutes', async () => {
      // Arrange
      machineRepository.find.mockResolvedValue([]);
      machineRepository.count.mockResolvedValue(0);

      // Act
      await service.updateOnlineStatus();

      // Assert
      expect(machineRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_online: true,
          }),
        }),
      );
    });
  });

  // ============================================================================
  // GET OFFLINE MACHINES TESTS
  // ============================================================================

  describe('getOfflineMachines', () => {
    it('should return machines offline for specified duration', async () => {
      // Arrange
      const offlineMachine = {
        ...mockMachine,
        is_online: false,
        last_ping_at: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };
      machineRepository.find.mockResolvedValue([offlineMachine as Machine]);

      // Act
      const result = await service.getOfflineMachines(30);

      // Assert
      expect(result).toEqual([offlineMachine]);
      expect(machineRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_online: false,
          }),
          relations: ['location'],
        }),
      );
    });

    it('should use default duration of 30 minutes', async () => {
      // Arrange
      machineRepository.find.mockResolvedValue([]);

      // Act
      await service.getOfflineMachines();

      // Assert
      expect(machineRepository.find).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // WRITE OFF MACHINE TESTS
  // ============================================================================

  describe('writeOffMachine', () => {
    it('should queue writeoff job successfully', async () => {
      // Arrange
      const writeoffDto: WriteoffMachineDto = {
        disposal_reason: 'Broken beyond repair',
        disposal_date: new Date().toISOString(),
      };
      machineRepository.findOne.mockResolvedValue(mockMachine);

      // Act
      const result = await service.writeOffMachine('machine-1', writeoffDto, 'user-1');

      // Assert
      expect(writeoffQueue.add).toHaveBeenCalledWith(
        'process-writeoff',
        expect.objectContaining({
          machineId: 'machine-1',
          writeoffDto,
          userId: 'user-1',
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: expect.any(Object),
        }),
      );
      expect(result.jobId).toContain('writeoff-');
      expect(result.message).toContain('queued for processing');
      expect(result.statusUrl).toContain('/api/machines/writeoff/job/');
    });

    it('should throw BadRequestException when machine already disposed', async () => {
      // Arrange
      const disposedMachine = {
        ...mockMachine,
        is_disposed: true,
        disposal_date: new Date('2024-01-15'),
      };
      machineRepository.findOne.mockResolvedValue(disposedMachine as Machine);

      // Act & Assert
      await expect(
        service.writeOffMachine('machine-1', { disposal_reason: 'Test' } as WriteoffMachineDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.writeOffMachine('machine-1', { disposal_reason: 'Test' } as WriteoffMachineDto),
      ).rejects.toThrow(/already disposed/);
    });

    it('should throw BadRequestException when machine has no purchase price', async () => {
      // Arrange
      const noPriceMachine = { ...mockMachine, purchase_price: null };
      machineRepository.findOne.mockResolvedValue(noPriceMachine as Machine);

      // Act & Assert
      await expect(
        service.writeOffMachine('machine-1', { disposal_reason: 'Test' } as WriteoffMachineDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.writeOffMachine('machine-1', { disposal_reason: 'Test' } as WriteoffMachineDto),
      ).rejects.toThrow(/missing purchase price/);
    });

    it('should throw NotFoundException when machine not found', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.writeOffMachine('non-existent', { disposal_reason: 'Test' } as WriteoffMachineDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // BULK WRITE OFF TESTS
  // ============================================================================

  describe('bulkWriteOffMachines', () => {
    it('should queue multiple writeoff jobs', async () => {
      // Arrange
      const machineIds = ['machine-1', 'machine-2', 'machine-3'];
      const writeoffDto: WriteoffMachineDto = {
        disposal_reason: 'Batch disposal',
        disposal_date: new Date().toISOString(),
      };

      machineRepository.findOne.mockResolvedValue(mockMachine);
      writeoffQueue.add.mockResolvedValue({ id: '123' });

      // Act
      const result = await service.bulkWriteOffMachines(machineIds, writeoffDto, 'user-1');

      // Assert
      expect(result.total).toBe(3);
      expect(result.queued).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.jobIds).toHaveLength(3);
      expect(writeoffQueue.add).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk writeoff', async () => {
      // Arrange
      const machineIds = ['machine-1', 'machine-2', 'machine-3'];
      const writeoffDto: WriteoffMachineDto = {
        disposal_reason: 'Batch disposal',
      };

      machineRepository.findOne
        .mockResolvedValueOnce(mockMachine) // First succeeds
        .mockResolvedValueOnce({ ...mockMachine, is_disposed: true } as Machine) // Second fails
        .mockResolvedValueOnce(mockMachine); // Third succeeds

      // Act
      const result = await service.bulkWriteOffMachines(machineIds, writeoffDto, 'user-1');

      // Assert
      expect(result.total).toBe(3);
      expect(result.queued).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].machineId).toBe('machine-2');
    });
  });

  // ============================================================================
  // GET WRITEOFF JOB STATUS TESTS
  // ============================================================================

  describe('getWriteoffJobStatus', () => {
    it('should return pending status', async () => {
      // Arrange
      const mockJob = {
        id: '123',
        progress: jest.fn().mockReturnValue(0),
        timestamp: Date.now(),
        processedOn: null,
        attemptsMade: 0,
        isCompleted: jest.fn().mockResolvedValue(false),
        isFailed: jest.fn().mockResolvedValue(false),
        isActive: jest.fn().mockResolvedValue(false),
      };
      writeoffQueue.getJob.mockResolvedValue(mockJob);
      writeoffQueue.getJobCounts.mockResolvedValue({ waiting: 5 });

      // Act
      const result = await service.getWriteoffJobStatus('writeoff-123');

      // Assert
      expect(result.status).toBe(WriteoffJobStatus.PENDING);
      expect(result.message).toContain('queued');
    });

    it('should return processing status', async () => {
      // Arrange
      const mockJob = {
        id: '123',
        progress: jest.fn().mockReturnValue(50),
        timestamp: Date.now(),
        processedOn: Date.now(),
        attemptsMade: 1,
        isCompleted: jest.fn().mockResolvedValue(false),
        isFailed: jest.fn().mockResolvedValue(false),
        isActive: jest.fn().mockResolvedValue(true),
      };
      writeoffQueue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getWriteoffJobStatus('writeoff-123');

      // Assert
      expect(result.status).toBe(WriteoffJobStatus.PROCESSING);
      expect(result.progress).toBe(50);
    });

    it('should return completed status with result', async () => {
      // Arrange
      const mockJob = {
        id: '123',
        progress: jest.fn().mockReturnValue(100),
        timestamp: Date.now(),
        processedOn: Date.now(),
        finishedOn: Date.now(),
        attemptsMade: 1,
        returnvalue: { success: true, machineNumber: 'M-001' },
        isCompleted: jest.fn().mockResolvedValue(true),
        isFailed: jest.fn().mockResolvedValue(false),
        isActive: jest.fn().mockResolvedValue(false),
      };
      writeoffQueue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getWriteoffJobStatus('writeoff-123');

      // Assert
      expect(result.status).toBe(WriteoffJobStatus.COMPLETED);
      expect(result.result).toEqual({ success: true, machineNumber: 'M-001' });
      expect(result.message).toContain('successfully');
    });

    it('should return failed status with error', async () => {
      // Arrange
      const mockJob = {
        id: '123',
        progress: jest.fn().mockReturnValue(30),
        timestamp: Date.now(),
        processedOn: Date.now(),
        attemptsMade: 3,
        failedReason: 'Database connection error',
        isCompleted: jest.fn().mockResolvedValue(false),
        isFailed: jest.fn().mockResolvedValue(true),
        isActive: jest.fn().mockResolvedValue(false),
      };
      writeoffQueue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getWriteoffJobStatus('writeoff-123');

      // Assert
      expect(result.status).toBe(WriteoffJobStatus.FAILED);
      expect(result.error).toBe('Database connection error');
      expect(result.message).toContain('failed');
    });

    it('should throw NotFoundException when job not found', async () => {
      // Arrange
      writeoffQueue.getJob.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getWriteoffJobStatus('writeoff-999')).rejects.toThrow(NotFoundException);
    });

    it('should handle job ID with or without prefix', async () => {
      // Arrange
      const mockJob = {
        id: '123',
        progress: jest.fn().mockReturnValue(0),
        timestamp: Date.now(),
        processedOn: null,
        attemptsMade: 0,
        isCompleted: jest.fn().mockResolvedValue(false),
        isFailed: jest.fn().mockResolvedValue(false),
        isActive: jest.fn().mockResolvedValue(false),
      };
      writeoffQueue.getJob.mockResolvedValue(mockJob);
      writeoffQueue.getJobCounts.mockResolvedValue({ waiting: 0 });

      // Act
      await service.getWriteoffJobStatus('123'); // Without prefix
      await service.getWriteoffJobStatus('writeoff-123'); // With prefix

      // Assert
      expect(writeoffQueue.getJob).toHaveBeenCalledWith('123');
    });
  });

  // ============================================================================
  // CANCEL WRITEOFF JOB TESTS
  // ============================================================================

  describe('cancelWriteoffJob', () => {
    it('should cancel pending job', async () => {
      // Arrange
      const mockJob = {
        id: '123',
        remove: jest.fn().mockResolvedValue(undefined),
        isActive: jest.fn().mockResolvedValue(false),
        isCompleted: jest.fn().mockResolvedValue(false),
      };
      writeoffQueue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.cancelWriteoffJob('writeoff-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('cancelled');
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to cancel active job', async () => {
      // Arrange
      const mockJob = {
        id: '123',
        isActive: jest.fn().mockResolvedValue(true),
        isCompleted: jest.fn().mockResolvedValue(false),
      };
      writeoffQueue.getJob.mockResolvedValue(mockJob);

      // Act & Assert
      await expect(service.cancelWriteoffJob('writeoff-123')).rejects.toThrow(BadRequestException);
      await expect(service.cancelWriteoffJob('writeoff-123')).rejects.toThrow(/active job/);
    });

    it('should throw BadRequestException when trying to cancel completed job', async () => {
      // Arrange
      const mockJob = {
        id: '123',
        isActive: jest.fn().mockResolvedValue(false),
        isCompleted: jest.fn().mockResolvedValue(true),
      };
      writeoffQueue.getJob.mockResolvedValue(mockJob);

      // Act & Assert
      await expect(service.cancelWriteoffJob('writeoff-123')).rejects.toThrow(BadRequestException);
      await expect(service.cancelWriteoffJob('writeoff-123')).rejects.toThrow(/completed job/);
    });

    it('should throw NotFoundException when job not found', async () => {
      // Arrange
      writeoffQueue.getJob.mockResolvedValue(null);

      // Act & Assert
      await expect(service.cancelWriteoffJob('writeoff-999')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // GET WRITEOFF JOBS TESTS
  // ============================================================================

  describe('getWriteoffJobs', () => {
    it('should return completed jobs when status is completed', async () => {
      // Arrange
      const completedJobs = [{ id: '1' }, { id: '2' }];
      writeoffQueue.getCompleted.mockResolvedValue(completedJobs);

      // Act
      const result = await service.getWriteoffJobs('completed');

      // Assert
      expect(result).toEqual(completedJobs);
      expect(writeoffQueue.getCompleted).toHaveBeenCalledWith(0, 100);
    });

    it('should return failed jobs when status is failed', async () => {
      // Arrange
      const failedJobs = [{ id: '3' }];
      writeoffQueue.getFailed.mockResolvedValue(failedJobs);

      // Act
      const result = await service.getWriteoffJobs('failed');

      // Assert
      expect(result).toEqual(failedJobs);
      expect(writeoffQueue.getFailed).toHaveBeenCalledWith(0, 100);
    });

    it('should return active jobs when status is active', async () => {
      // Arrange
      const activeJobs = [{ id: '4' }];
      writeoffQueue.getActive.mockResolvedValue(activeJobs);

      // Act
      const result = await service.getWriteoffJobs('active');

      // Assert
      expect(result).toEqual(activeJobs);
      expect(writeoffQueue.getActive).toHaveBeenCalledWith(0, 100);
    });

    it('should return waiting jobs when status is waiting', async () => {
      // Arrange
      const waitingJobs = [{ id: '5' }];
      writeoffQueue.getWaiting.mockResolvedValue(waitingJobs);

      // Act
      const result = await service.getWriteoffJobs('waiting');

      // Assert
      expect(result).toEqual(waitingJobs);
      expect(writeoffQueue.getWaiting).toHaveBeenCalledWith(0, 100);
    });

    it('should return all jobs when no status specified', async () => {
      // Arrange
      writeoffQueue.getCompleted.mockResolvedValue([{ id: '1' }]);
      writeoffQueue.getFailed.mockResolvedValue([{ id: '2' }]);
      writeoffQueue.getActive.mockResolvedValue([{ id: '3' }]);
      writeoffQueue.getWaiting.mockResolvedValue([{ id: '4' }]);

      // Act
      const result = await service.getWriteoffJobs();

      // Assert
      expect(result).toHaveLength(4);
      expect(writeoffQueue.getCompleted).toHaveBeenCalledWith(0, 20);
      expect(writeoffQueue.getFailed).toHaveBeenCalledWith(0, 20);
      expect(writeoffQueue.getActive).toHaveBeenCalledWith(0, 20);
      expect(writeoffQueue.getWaiting).toHaveBeenCalledWith(0, 20);
    });
  });

  // ============================================================================
  // UPDATE STATS TESTS
  // ============================================================================

  describe('updateStats', () => {
    it('should update machine statistics', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine);
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);

      const stats = {
        current_cash_amount: 30000,
        last_refill_date: new Date(),
        last_collection_date: new Date(),
        total_sales_count: 150,
        total_revenue: 75000,
      };

      // Act
      await service.updateStats('machine-1', stats);

      // Assert
      expect(machineRepository.update).toHaveBeenCalledWith(
        'machine-1',
        expect.objectContaining({
          current_cash_amount: 30000,
          total_sales_count: 150,
          total_revenue: 75000,
        }),
      );
    });

    it('should only update provided stats', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine);
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.updateStats('machine-1', { current_cash_amount: 50000 });

      // Assert
      expect(machineRepository.update).toHaveBeenCalledWith('machine-1', {
        current_cash_amount: 50000,
      });
    });

    it('should not update when no stats provided', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine);

      // Act
      await service.updateStats('machine-1', {});

      // Assert
      expect(machineRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when machine not found', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateStats('non-existent', {})).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // CALCULATE DEPRECIATION TESTS
  // ============================================================================

  describe('calculateDepreciation', () => {
    it('should calculate depreciation for machines with monthly_depreciation in metadata', async () => {
      // Arrange
      const machineWithDepreciation = {
        ...mockMachine,
        is_disposed: false,
        metadata: { monthly_depreciation: 10000 },
        accumulated_depreciation: 50000,
        purchase_price: 500000,
      };
      machineRepository.find.mockResolvedValue([machineWithDepreciation as Machine]);
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);
      machineRepository.save.mockResolvedValue(machineWithDepreciation as Machine);

      // Act
      const result = await service.calculateDepreciation();

      // Assert
      expect(result.updated).toBe(1);
      expect(result.totalDepreciation).toBe(10000);
      expect(machineRepository.update).toHaveBeenCalledWith(machineWithDepreciation.id, {
        accumulated_depreciation: 60000,
      });
    });

    it('should skip machines without monthly_depreciation', async () => {
      // Arrange
      const machineNoDepreciation = {
        ...mockMachine,
        is_disposed: false,
        metadata: null,
      };
      machineRepository.find.mockResolvedValue([machineNoDepreciation as Machine]);

      // Act
      const result = await service.calculateDepreciation();

      // Assert
      expect(result.updated).toBe(0);
      expect(result.totalDepreciation).toBe(0);
      expect(machineRepository.update).not.toHaveBeenCalled();
    });

    it('should not depreciate below zero book value', async () => {
      // Arrange
      const nearlyFullyDepreciated = {
        ...mockMachine,
        is_disposed: false,
        metadata: { monthly_depreciation: 100000 }, // Large depreciation
        accumulated_depreciation: 990000,
        purchase_price: 1000000,
      };
      machineRepository.find.mockResolvedValue([nearlyFullyDepreciated as Machine]);
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);
      machineRepository.save.mockResolvedValue(nearlyFullyDepreciated as Machine);

      // Act
      const result = await service.calculateDepreciation();

      // Assert
      // Book value would be 1000000 - 990000 - 100000 = -90000, so skip
      expect(result.updated).toBe(0);
    });

    it('should only find non-disposed machines', async () => {
      // Arrange
      machineRepository.find.mockResolvedValue([]);

      // Act
      await service.calculateDepreciation();

      // Assert
      expect(machineRepository.find).toHaveBeenCalledWith({
        where: { is_disposed: false },
      });
    });
  });

  // ============================================================================
  // FIND BY QR CODE PUBLIC TESTS
  // ============================================================================

  describe('findByQrCodePublic', () => {
    it('should delegate to QrCodeService', async () => {
      // Arrange
      qrCodeService.getMachineByQrCode.mockResolvedValue(mockMachine);

      // Act
      const result = await service.findByQrCodePublic('QR-001');

      // Assert
      expect(qrCodeService.getMachineByQrCode).toHaveBeenCalledWith('QR-001');
      expect(result).toEqual(mockMachine);
    });
  });

  // ============================================================================
  // UPDATE CONNECTIVITY STATUS TESTS
  // ============================================================================

  describe('updateConnectivityStatus', () => {
    it('should mark machines offline based on last_ping_at', async () => {
      // Arrange
      const staleMachine = {
        ...mockMachine,
        is_online: true,
        status: MachineStatus.ACTIVE,
        last_ping_at: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };
      machineRepository.find
        .mockResolvedValueOnce([staleMachine as Machine]) // Machines to mark offline
        .mockResolvedValueOnce([]); // Online machines to update
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);
      machineRepository.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      // Act
      const result = await service.updateConnectivityStatus(30);

      // Assert
      expect(result.updated).toBe(1);
      expect(machineRepository.update).toHaveBeenCalled();
    });

    it('should handle machines with null last_ping_at', async () => {
      // Arrange
      const neverPingedMachine = {
        ...mockMachine,
        is_online: true,
        status: MachineStatus.ACTIVE,
        last_ping_at: null,
      };
      machineRepository.find
        .mockResolvedValueOnce([neverPingedMachine as Machine])
        .mockResolvedValueOnce([]);
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);
      machineRepository.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      // Act
      const result = await service.updateConnectivityStatus(30);

      // Assert
      expect(result.updated).toBe(1);
    });

    it('should update connectivity_status for online machines', async () => {
      // Arrange
      const recentlyPingedMachine = {
        ...mockMachine,
        is_online: true,
        last_ping_at: new Date(),
        connectivity_status: 'unknown',
      };
      machineRepository.find
        .mockResolvedValueOnce([]) // No machines to mark offline
        .mockResolvedValueOnce([recentlyPingedMachine as Machine]); // Machines to update connectivity
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);
      machineRepository.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      // Act
      const result = await service.updateConnectivityStatus(30);

      // Assert
      expect(result.online).toBe(1);
      expect(machineRepository.update).toHaveBeenCalledWith(
        { id: In([recentlyPingedMachine.id]) },
        { connectivity_status: 'online' },
      );
    });

    // BRANCH COVERAGE: Test for lines 685, 688 - Non-ACTIVE machines going offline
    it('should mark non-ACTIVE machines offline but preserve their status', async () => {
      // Arrange - Machine in MAINTENANCE status that needs to go offline
      const maintenanceMachine = {
        ...mockMachine,
        id: 'machine-maintenance',
        is_online: true,
        status: MachineStatus.MAINTENANCE, // Not ACTIVE
        last_ping_at: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago (stale)
      };
      machineRepository.find
        .mockResolvedValueOnce([maintenanceMachine as Machine]) // Machines to mark offline
        .mockResolvedValueOnce([]); // Online machines to update
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);
      machineRepository.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      // Act
      const result = await service.updateConnectivityStatus(30);

      // Assert
      expect(result.updated).toBe(1);
      // Should be called with just is_online and connectivity_status, not status change
      expect(machineRepository.update).toHaveBeenCalledWith(
        { id: In([maintenanceMachine.id]) },
        { is_online: false, connectivity_status: 'offline' },
      );
    });

    it('should handle mixed ACTIVE and non-ACTIVE machines going offline', async () => {
      // Arrange - One ACTIVE and one MAINTENANCE machine both need to go offline
      const activeMachine = {
        ...mockMachine,
        id: 'machine-active',
        is_online: true,
        status: MachineStatus.ACTIVE,
        last_ping_at: new Date(Date.now() - 60 * 60 * 1000), // stale
      };
      const maintenanceMachine = {
        ...mockMachine,
        id: 'machine-maintenance',
        is_online: true,
        status: MachineStatus.MAINTENANCE,
        last_ping_at: new Date(Date.now() - 60 * 60 * 1000), // stale
      };
      const errorMachine = {
        ...mockMachine,
        id: 'machine-error',
        is_online: true,
        status: MachineStatus.ERROR,
        last_ping_at: null, // Never pinged
      };

      machineRepository.find
        .mockResolvedValueOnce([
          activeMachine as Machine,
          maintenanceMachine as Machine,
          errorMachine as Machine,
        ])
        .mockResolvedValueOnce([]);
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);
      machineRepository.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(3);

      // Act
      const result = await service.updateConnectivityStatus(30);

      // Assert
      expect(result.updated).toBe(3);
      // First call should update ACTIVE machines with status change to OFFLINE
      expect(machineRepository.update).toHaveBeenCalledWith(
        { id: In([activeMachine.id]) },
        { is_online: false, connectivity_status: 'offline', status: MachineStatus.OFFLINE },
      );
      // Second call should update non-ACTIVE machines without status change
      expect(machineRepository.update).toHaveBeenCalledWith(
        { id: In([maintenanceMachine.id, errorMachine.id]) },
        { is_online: false, connectivity_status: 'offline' },
      );
    });

    it('should not call update for non-ACTIVE machines if none exist', async () => {
      // Arrange - Only ACTIVE machines going offline
      const activeMachine = {
        ...mockMachine,
        id: 'machine-active',
        is_online: true,
        status: MachineStatus.ACTIVE,
        last_ping_at: new Date(Date.now() - 60 * 60 * 1000),
      };

      machineRepository.find
        .mockResolvedValueOnce([activeMachine as Machine])
        .mockResolvedValueOnce([]);
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);
      machineRepository.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      // Act
      await service.updateConnectivityStatus(30);

      // Assert - Should only call update once (for ACTIVE machines)
      expect(machineRepository.update).toHaveBeenCalledTimes(1);
      expect(machineRepository.update).toHaveBeenCalledWith(
        { id: In([activeMachine.id]) },
        { is_online: false, connectivity_status: 'offline', status: MachineStatus.OFFLINE },
      );
    });

    it('should handle only non-ACTIVE machines going offline (no ACTIVE)', async () => {
      // Arrange - Only non-ACTIVE machines going offline
      const maintenanceMachine = {
        ...mockMachine,
        id: 'machine-maintenance',
        is_online: true,
        status: MachineStatus.MAINTENANCE,
        last_ping_at: new Date(Date.now() - 60 * 60 * 1000),
      };
      const errorMachine = {
        ...mockMachine,
        id: 'machine-error',
        is_online: true,
        status: MachineStatus.ERROR,
        last_ping_at: null,
      };

      machineRepository.find
        .mockResolvedValueOnce([maintenanceMachine as Machine, errorMachine as Machine])
        .mockResolvedValueOnce([]);
      machineRepository.update.mockResolvedValue({ affected: 1 } as any);
      machineRepository.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(2);

      // Act
      await service.updateConnectivityStatus(30);

      // Assert - Should only call update once (for non-ACTIVE machines)
      expect(machineRepository.update).toHaveBeenCalledTimes(1);
      expect(machineRepository.update).toHaveBeenCalledWith(
        { id: In([maintenanceMachine.id, errorMachine.id]) },
        { is_online: false, connectivity_status: 'offline' },
      );
    });
  });
});
