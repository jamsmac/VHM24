import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';
import { QrCodeService } from './qr-code.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Machine, MachineStatus } from './entities/machine.entity';
import { MachineLocationHistory } from './entities/machine-location-history.entity';
type MockUser = Parameters<typeof MachinesController.prototype.writeOff>[2];

interface MockMachinesService {
  create: jest.Mock;
  findAll: jest.Mock;
  findOne: jest.Mock;
  findByMachineNumber: jest.Mock;
  findByQrCode: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
  writeOffMachine: jest.Mock;
  bulkWriteOffMachines: jest.Mock;
  getWriteoffJobStatus: jest.Mock;
  cancelWriteoffJob: jest.Mock;
  getWriteoffJobs: jest.Mock;
  getLocationHistory: jest.Mock;
  updateOnlineStatus: jest.Mock;
}

interface MockQrCodeService {
  generateQrCodeImage: jest.Mock;
  generateQrCodeBuffer: jest.Mock;
  regenerateQrCode: jest.Mock;
}

describe('MachinesController', () => {
  let controller: MachinesController;
  let mockMachinesService: MockMachinesService;
  let mockQrCodeService: MockQrCodeService;

  const mockMachine: Partial<Machine> = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    machine_number: 'M-001',
    name: 'Test Machine',
    status: MachineStatus.ACTIVE,
    location_id: '123e4567-e89b-12d3-a456-426614174002',
    qr_code: 'QR123456',
    qr_code_url: 'https://example.com/complaint/QR123456',
    is_online: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockLocationHistory: Partial<MachineLocationHistory> = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    machine_id: mockMachine.id!,
    from_location_id: null,
    to_location_id: '123e4567-e89b-12d3-a456-426614174002',
    moved_at: new Date(),
  };

  const mockUser = { id: 'user-123', role: 'ADMIN' } as unknown as MockUser;

  beforeEach(async () => {
    mockMachinesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByMachineNumber: jest.fn(),
      findByQrCode: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      writeOffMachine: jest.fn(),
      bulkWriteOffMachines: jest.fn(),
      getWriteoffJobStatus: jest.fn(),
      cancelWriteoffJob: jest.fn(),
      getWriteoffJobs: jest.fn(),
      getLocationHistory: jest.fn(),
      updateOnlineStatus: jest.fn(),
    };

    mockQrCodeService = {
      generateQrCodeImage: jest.fn(),
      generateQrCodeBuffer: jest.fn(),
      regenerateQrCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MachinesController],
      providers: [
        {
          provide: MachinesService,
          useValue: mockMachinesService,
        },
        {
          provide: QrCodeService,
          useValue: mockQrCodeService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MachinesController>(MachinesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // BASIC CRUD ENDPOINTS
  // ==========================================================================

  describe('create', () => {
    it('should create a new machine', async () => {
      const createDto = {
        machine_number: 'M-001',
        name: 'New Machine',
        type_code: 'coffee_machine',
        location_id: '123e4567-e89b-12d3-a456-426614174002',
        qr_code: 'QR-M001',
      };
      mockMachinesService.create.mockResolvedValue(mockMachine as any);

      const result = await controller.create(createDto as any, mockUser);

      expect(result).toEqual(mockMachine);
      expect(mockMachinesService.create).toHaveBeenCalledWith(createDto, 'user-123');
    });
  });

  describe('findAll', () => {
    it('should return all machines', async () => {
      const mockMachines = [mockMachine];
      mockMachinesService.findAll.mockResolvedValue(mockMachines as any);

      const result = await controller.findAll();

      expect(result).toEqual(mockMachines);
      expect(mockMachinesService.findAll).toHaveBeenCalledWith({
        status: undefined,
        location_id: undefined,
      });
    });

    it('should filter by status', async () => {
      mockMachinesService.findAll.mockResolvedValue([]);

      await controller.findAll(MachineStatus.ACTIVE);

      expect(mockMachinesService.findAll).toHaveBeenCalledWith({
        status: MachineStatus.ACTIVE,
        location_id: undefined,
      });
    });

    it('should filter by locationId', async () => {
      mockMachinesService.findAll.mockResolvedValue([]);

      await controller.findAll(undefined, 'loc-123');

      expect(mockMachinesService.findAll).toHaveBeenCalledWith({
        status: undefined,
        location_id: 'loc-123',
      });
    });

    it('should filter by both status and locationId', async () => {
      mockMachinesService.findAll.mockResolvedValue([]);

      await controller.findAll(MachineStatus.OFFLINE, 'loc-123');

      expect(mockMachinesService.findAll).toHaveBeenCalledWith({
        status: MachineStatus.OFFLINE,
        location_id: 'loc-123',
      });
    });
  });

  describe('findByNumber', () => {
    it('should find machine by number', async () => {
      mockMachinesService.findByMachineNumber.mockResolvedValue(mockMachine as any);

      const result = await controller.findByNumber('M-001');

      expect(result).toEqual(mockMachine);
      expect(mockMachinesService.findByMachineNumber).toHaveBeenCalledWith('M-001');
    });
  });

  describe('findByQRCode', () => {
    it('should find machine by QR code', async () => {
      mockMachinesService.findByQrCode.mockResolvedValue(mockMachine as any);

      const result = await controller.findByQRCode('QR123456');

      expect(result).toEqual(mockMachine);
      expect(mockMachinesService.findByQrCode).toHaveBeenCalledWith('QR123456');
    });
  });

  describe('findByLocation', () => {
    it('should find machines by location', async () => {
      const mockMachines = [mockMachine];
      mockMachinesService.findAll.mockResolvedValue(mockMachines as any);

      const result = await controller.findByLocation('123e4567-e89b-12d3-a456-426614174002');

      expect(result).toEqual(mockMachines);
      expect(mockMachinesService.findAll).toHaveBeenCalledWith({
        location_id: '123e4567-e89b-12d3-a456-426614174002',
      });
    });
  });

  describe('findOne', () => {
    it('should find machine by id', async () => {
      mockMachinesService.findOne.mockResolvedValue(mockMachine as any);

      const result = await controller.findOne('123e4567-e89b-12d3-a456-426614174001');

      expect(result).toEqual(mockMachine);
      expect(mockMachinesService.findOne).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
      );
    });
  });

  describe('update', () => {
    it('should update machine', async () => {
      const updateDto = { name: 'Updated Machine' };
      const updatedMachine = { ...mockMachine, name: 'Updated Machine' };
      mockMachinesService.update.mockResolvedValue(updatedMachine as any);

      const result = await controller.update('123e4567-e89b-12d3-a456-426614174001', updateDto, mockUser);

      expect(result).toEqual(updatedMachine);
      expect(mockMachinesService.update).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        updateDto,
        'user-123',
      );
    });
  });

  describe('updateStatus', () => {
    it('should update machine status', async () => {
      const updatedMachine = { ...mockMachine, status: MachineStatus.MAINTENANCE };
      mockMachinesService.update.mockResolvedValue(updatedMachine as any);

      const result = await controller.updateStatus(
        '123e4567-e89b-12d3-a456-426614174001',
        MachineStatus.MAINTENANCE,
        mockUser,
      );

      expect(result).toEqual(updatedMachine);
      expect(mockMachinesService.update).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        { status: MachineStatus.MAINTENANCE },
        'user-123',
      );
    });
  });

  describe('remove', () => {
    it('should soft delete machine', async () => {
      mockMachinesService.remove.mockResolvedValue(undefined);

      await controller.remove('123e4567-e89b-12d3-a456-426614174001');

      expect(mockMachinesService.remove).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
      );
    });
  });

  // ==========================================================================
  // WRITEOFF ENDPOINTS
  // ==========================================================================

  describe('writeOff', () => {
    it('should queue writeoff job', async () => {
      const writeoffDto = { disposal_reason: 'End of life', disposal_date: '2025-11-16' };
      const mockResponse = { jobId: 'writeoff-123', message: 'Job queued' };
      mockMachinesService.writeOffMachine.mockResolvedValue(mockResponse as any);

      const result = await controller.writeOff(
        '123e4567-e89b-12d3-a456-426614174001',
        writeoffDto as any,
        mockUser,
      );

      expect(result).toEqual(mockResponse);
      expect(mockMachinesService.writeOffMachine).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        writeoffDto,
        'user-123',
      );
    });
  });

  describe('bulkWriteOff', () => {
    it('should queue bulk writeoff jobs', async () => {
      const machineIds = ['m-1', 'm-2', 'm-3'];
      const writeoffDto = { disposal_reason: 'Bulk disposal' };
      const mockResponse = {
        queued: 3,
        failed: 0,
        jobs: [{ machineId: 'm-1', jobId: 'writeoff-1' }],
      };
      mockMachinesService.bulkWriteOffMachines.mockResolvedValue(mockResponse as any);

      const result = await controller.bulkWriteOff(machineIds, writeoffDto as any, mockUser);

      expect(result).toEqual(mockResponse);
      expect(mockMachinesService.bulkWriteOffMachines).toHaveBeenCalledWith(
        machineIds,
        writeoffDto,
        'user-123',
      );
    });
  });

  describe('getWriteoffJobStatus', () => {
    it('should return writeoff job status', async () => {
      const mockStatus = {
        id: 'writeoff-123',
        status: 'completed',
        progress: 100,
        result: { success: true },
      };
      mockMachinesService.getWriteoffJobStatus.mockResolvedValue(mockStatus as any);

      const result = await controller.getWriteoffJobStatus('writeoff-123');

      expect(result).toEqual(mockStatus);
      expect(mockMachinesService.getWriteoffJobStatus).toHaveBeenCalledWith('writeoff-123');
    });
  });

  describe('cancelWriteoffJob', () => {
    it('should cancel writeoff job', async () => {
      const mockResponse = { success: true, message: 'Job cancelled' };
      mockMachinesService.cancelWriteoffJob.mockResolvedValue(mockResponse);

      const result = await controller.cancelWriteoffJob('writeoff-123');

      expect(result).toEqual(mockResponse);
      expect(mockMachinesService.cancelWriteoffJob).toHaveBeenCalledWith('writeoff-123');
    });
  });

  describe('getWriteoffJobs', () => {
    it('should return list of writeoff jobs', async () => {
      const mockJobs = [
        {
          id: '123',
          progress: jest.fn().mockReturnValue(100),
          data: { machineId: 'm-1' },
          timestamp: Date.now(),
          attemptsMade: 1,
        },
      ];
      mockMachinesService.getWriteoffJobs.mockResolvedValue(mockJobs as any);

      const result = await controller.getWriteoffJobs();

      expect(result).toEqual([
        {
          id: 'writeoff-123',
          status: 'processing',
          progress: 100,
          data: { machineId: 'm-1' },
          createdAt: expect.any(Date),
          attempts: 1,
        },
      ]);
    });

    it('should filter jobs by status', async () => {
      mockMachinesService.getWriteoffJobs.mockResolvedValue([]);

      await controller.getWriteoffJobs('completed');

      expect(mockMachinesService.getWriteoffJobs).toHaveBeenCalledWith('completed');
    });

    it('should return pending status when progress is 0', async () => {
      const mockJobs = [
        {
          id: '456',
          progress: jest.fn().mockReturnValue(0),
          data: { machineId: 'm-2' },
          timestamp: Date.now(),
          attemptsMade: 0,
        },
      ];
      mockMachinesService.getWriteoffJobs.mockResolvedValue(mockJobs as any);

      const result = await controller.getWriteoffJobs();

      expect(result[0].status).toBe('pending');
    });
  });

  // ==========================================================================
  // LOCATION HISTORY ENDPOINTS
  // ==========================================================================

  describe('getLocationHistory', () => {
    it('should return machine location history', async () => {
      const mockHistory = [mockLocationHistory];
      mockMachinesService.getLocationHistory.mockResolvedValue(mockHistory as any);

      const result = await controller.getLocationHistory('123e4567-e89b-12d3-a456-426614174001');

      expect(result).toEqual(mockHistory);
      expect(mockMachinesService.getLocationHistory).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
      );
    });
  });

  // ==========================================================================
  // CONNECTIVITY ENDPOINTS
  // ==========================================================================

  describe('getConnectivityStatus', () => {
    it('should return connectivity status', async () => {
      const mockStats = { total: 100, online: 85, offline: 15, updated: 5 };
      mockMachinesService.updateOnlineStatus.mockResolvedValue(mockStats);

      const result = await controller.getConnectivityStatus();

      expect(result).toEqual({
        total: 100,
        online: 85,
        offline: 15,
      });
    });
  });

  // ==========================================================================
  // QR CODE ENDPOINTS
  // ==========================================================================

  describe('getQrCode', () => {
    it('should return QR code data', async () => {
      mockMachinesService.findOne.mockResolvedValue(mockMachine as any);
      mockQrCodeService.generateQrCodeImage.mockResolvedValue('data:image/png;base64,ABC123');

      const result = await controller.getQrCode('123e4567-e89b-12d3-a456-426614174001');

      expect(result).toEqual({
        qr_code: 'QR123456',
        qr_code_url: 'https://example.com/complaint/QR123456',
        image: 'data:image/png;base64,ABC123',
      });
      expect(mockMachinesService.findOne).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
      );
      expect(mockQrCodeService.generateQrCodeImage).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
      );
    });
  });

  describe('downloadQrCode', () => {
    it('should send QR code as PNG file', async () => {
      const mockBuffer = Buffer.from('PNG data');
      mockMachinesService.findOne.mockResolvedValue(mockMachine as any);
      mockQrCodeService.generateQrCodeBuffer.mockResolvedValue(mockBuffer);

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as any as Response;

      await controller.downloadQrCode('123e4567-e89b-12d3-a456-426614174001', mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=qr-code-M-001.png',
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('regenerateQrCode', () => {
    it('should regenerate QR code', async () => {
      const updatedMachine = { ...mockMachine, qr_code: 'NEW_QR_123' };
      mockQrCodeService.regenerateQrCode.mockResolvedValue(updatedMachine as any);

      const result = await controller.regenerateQrCode('123e4567-e89b-12d3-a456-426614174001');

      expect(result).toEqual(updatedMachine);
      expect(mockQrCodeService.regenerateQrCode).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
      );
    });
  });
});
