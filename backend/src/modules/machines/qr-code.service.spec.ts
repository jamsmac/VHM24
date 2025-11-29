import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { QrCodeService } from './qr-code.service';
import { Machine, MachineStatus } from './entities/machine.entity';
import * as QRCode from 'qrcode';

// Mock the qrcode library
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
  toBuffer: jest.fn(),
}));

describe('QrCodeService', () => {
  let service: QrCodeService;
  let machineRepository: jest.Mocked<Repository<Machine>>;
  let configService: jest.Mocked<ConfigService>;

  // Mock data - use unknown cast to avoid strict type checks on relations
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
    qr_code_url: 'https://app.com/public/complaint/QR-001',
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

  let mockQueryBuilder: any;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock QueryBuilder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    // Mock Machine Repository
    const mockMachineRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    // Mock ConfigService
    const mockConfigService = {
      get: jest.fn().mockReturnValue('https://app.vendhub.com'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrCodeService,
        {
          provide: getRepositoryToken(Machine),
          useValue: mockMachineRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<QrCodeService>(QrCodeService);
    machineRepository = module.get(getRepositoryToken(Machine));
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // GENERATE QR CODE IMAGE TESTS
  // ============================================================================

  describe('generateQrCodeImage', () => {
    it('should generate QR code image as base64 string', async () => {
      // Arrange
      const expectedDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...';
      machineRepository.findOne.mockResolvedValue(mockMachine);
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(expectedDataUrl);

      // Act
      const result = await service.generateQrCodeImage('machine-1');

      // Assert
      expect(machineRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'machine-1' },
      });
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        'https://app.vendhub.com/public/complaint/QR-001',
        expect.objectContaining({
          errorCorrectionLevel: 'M',
          type: 'image/png',
          width: 400,
          margin: 2,
        }),
      );
      expect(result).toBe(expectedDataUrl);
    });

    it('should throw NotFoundException when machine not found', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.generateQrCodeImage('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.generateQrCodeImage('non-existent')).rejects.toThrow(
        /Machine non-existent not found/,
      );
    });

    it('should propagate QRCode library errors', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine);
      const qrError = new Error('QR code generation failed');
      (QRCode.toDataURL as jest.Mock).mockRejectedValue(qrError);

      // Act & Assert
      await expect(service.generateQrCodeImage('machine-1')).rejects.toThrow(
        'QR code generation failed',
      );
    });
  });

  // ============================================================================
  // GENERATE QR CODE BUFFER TESTS
  // ============================================================================

  describe('generateQrCodeBuffer', () => {
    it('should generate QR code as Buffer', async () => {
      // Arrange
      const expectedBuffer = Buffer.from('PNG...image data...', 'utf8');
      machineRepository.findOne.mockResolvedValue(mockMachine);
      (QRCode.toBuffer as jest.Mock).mockResolvedValue(expectedBuffer);

      // Act
      const result = await service.generateQrCodeBuffer('machine-1');

      // Assert
      expect(machineRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'machine-1' },
      });
      expect(QRCode.toBuffer).toHaveBeenCalledWith(
        'https://app.vendhub.com/public/complaint/QR-001',
        expect.objectContaining({
          errorCorrectionLevel: 'M',
          type: 'png',
          width: 400,
          margin: 2,
        }),
      );
      expect(result).toBe(expectedBuffer);
    });

    it('should throw NotFoundException when machine not found', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.generateQrCodeBuffer('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate QRCode library errors', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine);
      const qrError = new Error('Buffer generation failed');
      (QRCode.toBuffer as jest.Mock).mockRejectedValue(qrError);

      // Act & Assert
      await expect(service.generateQrCodeBuffer('machine-1')).rejects.toThrow(
        'Buffer generation failed',
      );
    });
  });

  // ============================================================================
  // GET COMPLAINT URL TESTS
  // ============================================================================

  describe('getComplaintUrl', () => {
    it('should return complaint URL with frontend URL prefix', () => {
      // Act
      const result = service.getComplaintUrl('QR-TEST-001');

      // Assert
      expect(result).toBe('https://app.vendhub.com/public/complaint/QR-TEST-001');
    });

    it('should handle different QR codes', () => {
      // Act & Assert
      expect(service.getComplaintUrl('QR-ABC123')).toBe(
        'https://app.vendhub.com/public/complaint/QR-ABC123',
      );
      expect(service.getComplaintUrl('SIMPLE-CODE')).toBe(
        'https://app.vendhub.com/public/complaint/SIMPLE-CODE',
      );
    });

    it('should use default frontend URL when not configured', async () => {
      // Create a new service instance with null config
      const mockConfigServiceNull = {
        get: jest.fn().mockReturnValue(null),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          QrCodeService,
          {
            provide: getRepositoryToken(Machine),
            useValue: machineRepository,
          },
          {
            provide: ConfigService,
            useValue: mockConfigServiceNull,
          },
        ],
      }).compile();

      const serviceWithDefault = module.get<QrCodeService>(QrCodeService);

      // Act
      const result = serviceWithDefault.getComplaintUrl('QR-TEST');

      // Assert
      expect(result).toBe('http://localhost:3001/public/complaint/QR-TEST');
    });
  });

  // ============================================================================
  // GENERATE UNIQUE QR CODE TESTS
  // ============================================================================

  describe('generateUniqueQrCode', () => {
    it('should generate QR code starting with "QR-" prefix', () => {
      // Act
      const result = service.generateUniqueQrCode();

      // Assert
      expect(result).toMatch(/^QR-/);
    });

    it('should generate uppercase QR codes', () => {
      // Act
      const result = service.generateUniqueQrCode();

      // Assert
      expect(result).toBe(result.toUpperCase());
    });

    it('should generate unique QR codes on each call', () => {
      // Act
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(service.generateUniqueQrCode());
      }

      // Assert
      expect(codes.size).toBe(100); // All codes should be unique
    });

    it('should generate QR codes with timestamp and random components', () => {
      // Act
      const result = service.generateUniqueQrCode();

      // Assert
      // Format: QR-{timestamp_base36}-{random_hex}
      const parts = result.split('-');
      expect(parts.length).toBeGreaterThanOrEqual(3);
      expect(parts[0]).toBe('QR');
    });
  });

  // ============================================================================
  // REGENERATE QR CODE TESTS
  // ============================================================================

  describe('regenerateQrCode', () => {
    it('should generate new QR code and update machine', async () => {
      // Arrange
      machineRepository.findOne
        .mockResolvedValueOnce(mockMachine) // First call to find machine
        .mockResolvedValueOnce(null); // Second call to check uniqueness (no duplicate)
      machineRepository.save.mockResolvedValue({
        ...mockMachine,
        qr_code: 'QR-NEW-001',
        qr_code_url: 'https://app.vendhub.com/public/complaint/QR-NEW-001',
      } as Machine);

      // Act
      const result = await service.regenerateQrCode('machine-1');

      // Assert
      expect(result.qr_code).toMatch(/^QR-/);
      expect(result.qr_code_url).toContain('/public/complaint/');
      expect(machineRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when machine not found', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.regenerateQrCode('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should retry if generated QR code already exists', async () => {
      // Arrange
      const existingMachine = { ...mockMachine, qr_code: 'QR-EXISTING' };

      machineRepository.findOne
        .mockResolvedValueOnce(mockMachine) // First call to find machine
        .mockResolvedValueOnce(existingMachine as Machine) // Second call: first QR code exists
        .mockResolvedValueOnce(existingMachine as Machine) // Third call: second QR code exists
        .mockResolvedValueOnce(null); // Fourth call: third QR code is unique

      machineRepository.save.mockResolvedValue({
        ...mockMachine,
        qr_code: 'QR-UNIQUE-001',
      } as Machine);

      // Act
      const result = await service.regenerateQrCode('machine-1');

      // Assert
      expect(result).toBeDefined();
      expect(machineRepository.findOne).toHaveBeenCalledTimes(4);
    });

    it('should throw error after 10 failed uniqueness attempts', async () => {
      // Arrange
      const existingMachine = { ...mockMachine, qr_code: 'QR-EXISTING' };

      // Always return existing machine (QR always exists)
      machineRepository.findOne.mockResolvedValue(existingMachine as Machine);

      // Act & Assert
      await expect(service.regenerateQrCode('machine-1')).rejects.toThrow(
        /Failed to generate unique QR code after 10 attempts/,
      );
    });
  });

  // ============================================================================
  // ASSIGN QR CODE TO MACHINE TESTS
  // ============================================================================

  describe('assignQrCodeToMachine', () => {
    it('should assign QR code to machine without existing code', async () => {
      // Arrange
      const machineWithoutQr = {
        ...mockMachine,
        qr_code: null,
        qr_code_url: null,
      } as unknown as Machine;

      // Act
      const result = await service.assignQrCodeToMachine(machineWithoutQr);

      // Assert
      expect(result.qr_code).toMatch(/^QR-/);
      expect(result.qr_code_url).toContain('/public/complaint/');
    });

    it('should not change QR code if machine already has one', async () => {
      // Arrange - create a machine with an existing QR code
      const machineWithQr: Machine = {
        ...mockMachine,
        qr_code: 'QR-EXISTING-001',
      } as unknown as Machine;

      // Act
      const result = await service.assignQrCodeToMachine(machineWithQr);

      // Assert
      expect(result.qr_code).toBe('QR-EXISTING-001'); // Original QR code unchanged
    });

    it('should assign new QR code when qr_code is empty string (falsy)', async () => {
      // Arrange
      const machineWithEmptyQr = {
        ...mockMachine,
        qr_code: '',
        qr_code_url: '',
      } as unknown as Machine;

      // Act
      const result = await service.assignQrCodeToMachine(machineWithEmptyQr);

      // Assert
      // Empty string is falsy, so a new QR code is assigned
      expect(result.qr_code).toMatch(/^QR-/);
      expect(result.qr_code_url).toContain('/public/complaint/');
    });
  });

  // ============================================================================
  // GET MACHINE BY QR CODE TESTS
  // ============================================================================

  describe('getMachineByQrCode', () => {
    it('should return machine when QR code exists', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine);

      // Act
      const result = await service.getMachineByQrCode('QR-001');

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
      await expect(service.getMachineByQrCode('QR-NON-EXISTENT')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getMachineByQrCode('QR-NON-EXISTENT')).rejects.toThrow(
        /Machine with QR code QR-NON-EXISTENT not found/,
      );
    });

    it('should include location relation', async () => {
      // Arrange
      const machineWithLocation = {
        ...mockMachine,
        location: { id: 'location-1', name: 'Main Office' },
      };
      machineRepository.findOne.mockResolvedValue(machineWithLocation as Machine);

      // Act
      const result = await service.getMachineByQrCode('QR-001');

      // Assert
      expect(result.location).toBeDefined();
      expect(machineRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['location'],
        }),
      );
    });
  });

  // ============================================================================
  // GENERATE MISSING QR CODES TESTS
  // ============================================================================

  describe('generateMissingQrCodes', () => {
    it('should generate QR codes for machines without one', async () => {
      // Arrange
      const machinesWithoutQr = [
        { ...mockMachine, id: 'm1', qr_code: null, qr_code_url: null },
        { ...mockMachine, id: 'm2', qr_code: '', qr_code_url: '' },
        { ...mockMachine, id: 'm3', qr_code: null, qr_code_url: null },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(machinesWithoutQr);
      machineRepository.save.mockImplementation((machine) =>
        Promise.resolve({ ...machine, qr_code: 'QR-GENERATED' } as Machine),
      );

      // Act
      const result = await service.generateMissingQrCodes();

      // Assert
      expect(result).toBe(3);
      expect(machineRepository.save).toHaveBeenCalledTimes(3);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'machine.qr_code IS NULL OR machine.qr_code = :empty',
        { empty: '' },
      );
    });

    it('should return 0 when all machines have QR codes', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.generateMissingQrCodes();

      // Assert
      expect(result).toBe(0);
      expect(machineRepository.save).not.toHaveBeenCalled();
    });

    it('should update each machine with new QR code and URL', async () => {
      // Arrange
      const machineWithoutQr = {
        ...mockMachine,
        id: 'm1',
        machine_number: 'M-TEST',
        qr_code: null,
        qr_code_url: null,
      };
      mockQueryBuilder.getMany.mockResolvedValue([machineWithoutQr]);
      machineRepository.save.mockImplementation((machine) => Promise.resolve(machine as Machine));

      // Act
      await service.generateMissingQrCodes();

      // Assert
      expect(machineRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          qr_code: expect.stringMatching(/^QR-/),
          qr_code_url: expect.stringContaining('/public/complaint/'),
        }),
      );
    });
  });

  // ============================================================================
  // EDGE CASES AND INTEGRATION TESTS
  // ============================================================================

  describe('edge cases', () => {
    it('should handle special characters in QR code', async () => {
      // Arrange
      const machineWithSpecialQr = {
        ...mockMachine,
        qr_code: 'QR-ABC-123_456',
      };
      machineRepository.findOne.mockResolvedValue(machineWithSpecialQr as Machine);

      // Act
      const url = service.getComplaintUrl(machineWithSpecialQr.qr_code);

      // Assert
      expect(url).toBe('https://app.vendhub.com/public/complaint/QR-ABC-123_456');
    });

    it('should handle very long QR codes', async () => {
      // Act
      const longCode = 'QR-' + 'A'.repeat(100);
      const url = service.getComplaintUrl(longCode);

      // Assert
      expect(url).toContain(longCode);
    });

    it('should generate consistent URL format across methods', async () => {
      // Arrange
      const qrCode = 'QR-CONSISTENT-001';
      const machineWithQr = { ...mockMachine, qr_code: qrCode };
      machineRepository.findOne.mockResolvedValue(machineWithQr as Machine);

      // Act
      const urlFromMethod = service.getComplaintUrl(qrCode);

      // Assert
      expect(urlFromMethod).toMatch(/^https?:\/\/.+\/public\/complaint\/QR-CONSISTENT-001$/);
    });
  });

  // ============================================================================
  // QR CODE OPTIONS TESTS
  // ============================================================================

  describe('QR code options', () => {
    it('should use correct error correction level', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine);
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:...');

      // Act
      await service.generateQrCodeImage('machine-1');

      // Assert
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          errorCorrectionLevel: 'M', // Medium error correction
        }),
      );
    });

    it('should use correct image dimensions', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine);
      (QRCode.toBuffer as jest.Mock).mockResolvedValue(Buffer.from('test'));

      // Act
      await service.generateQrCodeBuffer('machine-1');

      // Assert
      expect(QRCode.toBuffer).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          width: 400,
          margin: 2,
        }),
      );
    });

    it('should use correct color settings for image', async () => {
      // Arrange
      machineRepository.findOne.mockResolvedValue(mockMachine);
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:...');

      // Act
      await service.generateQrCodeImage('machine-1');

      // Assert
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        }),
      );
    });
  });
});
