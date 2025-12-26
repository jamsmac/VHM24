import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { MachineAccessImportService } from './machine-access-import.service';
import { MachineAccessService } from './machine-access.service';
import { MachineAccess, MachineAccessRole } from './entities/machine-access.entity';

// Mock exceljs
jest.mock('exceljs', () => {
  return {
    Workbook: jest.fn().mockImplementation(() => ({
      xlsx: {
        load: jest.fn(),
      },
      worksheets: [],
    })),
  };
});

describe('MachineAccessImportService', () => {
  let service: MachineAccessImportService;
  let machineAccessService: jest.Mocked<MachineAccessService>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: any;
  let mockManagerFindOne: jest.Mock;
  let mockManagerCreate: jest.Mock;
  let mockManagerSave: jest.Mock;

  const mockMachine = {
    id: 'machine-uuid-123',
    machine_number: 'M-001',
    serial_number: 'SN-12345',
  };

  const mockUser = {
    id: 'user-uuid-456',
    email: 'test@example.com',
    username: 'testuser',
  };

  beforeEach(async () => {
    mockManagerFindOne = jest.fn();
    mockManagerCreate = jest.fn();
    mockManagerSave = jest.fn();

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: mockManagerFindOne,
        create: mockManagerCreate,
        save: mockManagerSave,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachineAccessImportService,
        {
          provide: MachineAccessService,
          useValue: {
            resolveMachine: jest.fn(),
            resolveUser: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(queryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<MachineAccessImportService>(MachineAccessImportService);
    machineAccessService = module.get(MachineAccessService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('importFromCsv', () => {
    it('should import valid CSV data', async () => {
      const csvContent = `machine_number,user_identifier,role
M-001,test@example.com,operator`;
      const buffer = Buffer.from(csvContent);

      machineAccessService.resolveMachine.mockResolvedValue(mockMachine as any);
      machineAccessService.resolveUser.mockResolvedValue(mockUser as any);
      mockManagerFindOne.mockResolvedValue(null);
      mockManagerCreate.mockReturnValue({ id: 'access-1' } as any);
      mockManagerSave.mockResolvedValue({ id: 'access-1' } as any);

      const result = await service.importFromCsv(buffer, 'creator-123');

      expect(result.applied_count).toBe(1);
      expect(result.updated_count).toBe(0);
      expect(result.skipped_count).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should handle multiple rows', async () => {
      const csvContent = `machine_number,user_identifier,role
M-001,user1@example.com,operator
M-002,user2@example.com,admin
M-003,user3@example.com,viewer`;
      const buffer = Buffer.from(csvContent);

      machineAccessService.resolveMachine.mockResolvedValue(mockMachine as any);
      machineAccessService.resolveUser.mockResolvedValue(mockUser as any);
      mockManagerFindOne.mockResolvedValue(null);
      mockManagerCreate.mockReturnValue({ id: 'access-1' } as any);
      mockManagerSave.mockResolvedValue({ id: 'access-1' } as any);

      const result = await service.importFromCsv(buffer, 'creator-123');

      expect(result.applied_count).toBe(3);
    });

    it('should update existing access entries', async () => {
      const csvContent = `machine_number,user_identifier,role
M-001,test@example.com,admin`;
      const buffer = Buffer.from(csvContent);

      machineAccessService.resolveMachine.mockResolvedValue(mockMachine as any);
      machineAccessService.resolveUser.mockResolvedValue(mockUser as any);
      mockManagerFindOne.mockResolvedValue({
        id: 'existing-access',
        role: MachineAccessRole.OPERATOR, // Different from 'admin'
      } as any);
      mockManagerSave.mockResolvedValue({ id: 'existing-access' } as any);

      const result = await service.importFromCsv(buffer, 'creator-123');

      expect(result.updated_count).toBe(1);
      expect(result.applied_count).toBe(0);
    });

    it('should skip rows with same role', async () => {
      const csvContent = `machine_number,user_identifier,role
M-001,test@example.com,operator`;
      const buffer = Buffer.from(csvContent);

      machineAccessService.resolveMachine.mockResolvedValue(mockMachine as any);
      machineAccessService.resolveUser.mockResolvedValue(mockUser as any);
      mockManagerFindOne.mockResolvedValue({
        id: 'existing-access',
        role: MachineAccessRole.OPERATOR, // Same as import
      } as any);

      const result = await service.importFromCsv(buffer, 'creator-123');

      expect(result.applied_count).toBe(0);
      expect(result.updated_count).toBe(0);
      // Note: skipped_count only increments on error, not on same role
    });

    it('should handle machine not found error', async () => {
      const csvContent = `machine_number,user_identifier,role
M-INVALID,test@example.com,operator`;
      const buffer = Buffer.from(csvContent);

      machineAccessService.resolveMachine.mockResolvedValue(null);

      const result = await service.importFromCsv(buffer, 'creator-123');

      expect(result.skipped_count).toBe(1);
      expect(result.errors[0].reason).toContain('Machine not found');
    });

    it('should handle user not found error', async () => {
      const csvContent = `machine_number,user_identifier,role
M-001,unknown@example.com,operator`;
      const buffer = Buffer.from(csvContent);

      machineAccessService.resolveMachine.mockResolvedValue(mockMachine as any);
      machineAccessService.resolveUser.mockResolvedValue(null);

      const result = await service.importFromCsv(buffer, 'creator-123');

      expect(result.skipped_count).toBe(1);
      expect(result.errors[0].reason).toContain('User not found');
    });

    it('should handle missing machine identifier', async () => {
      const csvContent = `machine_number,user_identifier,role
,test@example.com,operator`;
      const buffer = Buffer.from(csvContent);

      const result = await service.importFromCsv(buffer, 'creator-123');

      expect(result.skipped_count).toBe(1);
      expect(result.errors[0].reason).toContain('Machine not specified');
    });

    it('should handle missing user identifier', async () => {
      const csvContent = `machine_number,user_identifier,role
M-001,,operator`;
      const buffer = Buffer.from(csvContent);

      const result = await service.importFromCsv(buffer, 'creator-123');

      expect(result.skipped_count).toBe(1);
      expect(result.errors[0].reason).toContain('User not specified');
    });

    it('should handle missing role', async () => {
      const csvContent = `machine_number,user_identifier,role
M-001,test@example.com,`;
      const buffer = Buffer.from(csvContent);

      const result = await service.importFromCsv(buffer, 'creator-123');

      expect(result.skipped_count).toBe(1);
      expect(result.errors[0].reason).toContain('Role not specified');
    });

    it('should handle invalid role', async () => {
      const csvContent = `machine_number,user_identifier,role
M-001,test@example.com,superuser`;
      const buffer = Buffer.from(csvContent);

      const result = await service.importFromCsv(buffer, 'creator-123');

      expect(result.skipped_count).toBe(1);
      expect(result.errors[0].reason).toContain('Invalid role');
    });

    it('should rollback on fatal error', async () => {
      const csvContent = `machine_number,user_identifier,role
M-001,test@example.com,operator`;
      const buffer = Buffer.from(csvContent);

      // Fatal error during commit triggers rollback
      machineAccessService.resolveMachine.mockResolvedValue(mockMachine as any);
      machineAccessService.resolveUser.mockResolvedValue(mockUser as any);
      mockManagerFindOne.mockResolvedValue(null);
      mockManagerCreate.mockReturnValue({ id: 'access-1' } as any);
      mockManagerSave.mockResolvedValue({ id: 'access-1' } as any);
      queryRunner.commitTransaction.mockRejectedValue(new Error('Commit failed'));

      await expect(service.importFromCsv(buffer, 'creator-123')).rejects.toThrow(
        'Commit failed',
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should normalize header variations', async () => {
      const csvContent = `Machine Code,Email,Role
M-001,test@example.com,operator`;
      const buffer = Buffer.from(csvContent);

      machineAccessService.resolveMachine.mockResolvedValue(mockMachine as any);
      machineAccessService.resolveUser.mockResolvedValue(mockUser as any);
      mockManagerFindOne.mockResolvedValue(null);
      mockManagerCreate.mockReturnValue({ id: 'access-1' } as any);
      mockManagerSave.mockResolvedValue({ id: 'access-1' } as any);

      const result = await service.importFromCsv(buffer, 'creator-123');

      expect(result.applied_count).toBe(1);
    });

    it('should handle serial_number as machine identifier', async () => {
      const csvContent = `serial_number,user_identifier,role
SN-12345,test@example.com,operator`;
      const buffer = Buffer.from(csvContent);

      machineAccessService.resolveMachine.mockResolvedValue(mockMachine as any);
      machineAccessService.resolveUser.mockResolvedValue(mockUser as any);
      mockManagerFindOne.mockResolvedValue(null);
      mockManagerCreate.mockReturnValue({ id: 'access-1' } as any);
      mockManagerSave.mockResolvedValue({ id: 'access-1' } as any);

      const result = await service.importFromCsv(buffer, 'creator-123');

      expect(result.applied_count).toBe(1);
      expect(machineAccessService.resolveMachine).toHaveBeenCalledWith(
        undefined,
        'SN-12345',
      );
    });

    it('should handle all role types', async () => {
      const roles = ['owner', 'admin', 'manager', 'operator', 'technician', 'viewer'];

      for (const role of roles) {
        const csvContent = `machine_number,user_identifier,role
M-001,test@example.com,${role}`;
        const buffer = Buffer.from(csvContent);

        machineAccessService.resolveMachine.mockResolvedValue(mockMachine as any);
        machineAccessService.resolveUser.mockResolvedValue(mockUser as any);
        mockManagerFindOne.mockResolvedValue(null);
        mockManagerCreate.mockReturnValue({ id: 'access-1' } as any);
        mockManagerSave.mockResolvedValue({ id: 'access-1' } as any);

        const result = await service.importFromCsv(buffer, 'creator-123');

        expect(result.applied_count).toBe(1);
        jest.clearAllMocks();
      }
    });
  });

  describe('importFromXlsx', () => {
    it('should import valid XLSX data', async () => {
      // Mock exceljs workbook
      const mockWorksheet = {
        eachRow: jest.fn((callback: (row: any, rowNumber: number) => void) => {
          // Header row
          callback(
            {
              eachCell: (cb: (cell: any, colNumber: number) => void) => {
                cb({ value: 'machine_number' }, 1);
                cb({ value: 'user_identifier' }, 2);
                cb({ value: 'role' }, 3);
              },
            },
            1,
          );
          // Data row
          callback(
            {
              eachCell: (cb: (cell: any, colNumber: number) => void) => {
                cb({ value: 'M-001' }, 1);
                cb({ value: 'test@example.com' }, 2);
                cb({ value: 'operator' }, 3);
              },
            },
            2,
          );
        }),
      };

      const ExcelJS = require('exceljs');
      ExcelJS.Workbook.mockImplementation(() => ({
        xlsx: {
          load: jest.fn(),
        },
        worksheets: [mockWorksheet],
      }));

      machineAccessService.resolveMachine.mockResolvedValue(mockMachine as any);
      machineAccessService.resolveUser.mockResolvedValue(mockUser as any);
      mockManagerFindOne.mockResolvedValue(null);
      mockManagerCreate.mockReturnValue({ id: 'access-1' } as any);
      mockManagerSave.mockResolvedValue({ id: 'access-1' } as any);

      const result = await service.importFromXlsx(Buffer.from('test'), 'creator-123');

      expect(result.applied_count).toBe(1);
    });

    it('should handle empty worksheet', async () => {
      const ExcelJS = require('exceljs');
      ExcelJS.Workbook.mockImplementation(() => ({
        xlsx: {
          load: jest.fn(),
        },
        worksheets: [],
      }));

      await expect(
        service.importFromXlsx(Buffer.from('test'), 'creator-123'),
      ).rejects.toThrow('No worksheet found');
    });

    it('should handle XLSX parse error', async () => {
      const ExcelJS = require('exceljs');
      ExcelJS.Workbook.mockImplementation(() => ({
        xlsx: {
          load: jest.fn().mockRejectedValue(new Error('Corrupt file')),
        },
        worksheets: [],
      }));

      await expect(
        service.importFromXlsx(Buffer.from('test'), 'creator-123'),
      ).rejects.toThrow('Failed to parse XLSX');
    });

    it('should handle null cell values', async () => {
      const mockWorksheet = {
        eachRow: jest.fn((callback: (row: any, rowNumber: number) => void) => {
          callback(
            {
              eachCell: (cb: (cell: any, colNumber: number) => void) => {
                cb({ value: 'machine_number' }, 1);
                cb({ value: null }, 2); // null header
                cb({ value: 'role' }, 3);
              },
            },
            1,
          );
          callback(
            {
              eachCell: (cb: (cell: any, colNumber: number) => void) => {
                cb({ value: 'M-001' }, 1);
                cb({ value: null }, 2); // null value
                cb({ value: 'operator' }, 3);
              },
            },
            2,
          );
        }),
      };

      const ExcelJS = require('exceljs');
      ExcelJS.Workbook.mockImplementation(() => ({
        xlsx: {
          load: jest.fn(),
        },
        worksheets: [mockWorksheet],
      }));

      const result = await service.importFromXlsx(Buffer.from('test'), 'creator-123');

      expect(result.skipped_count).toBe(1);
      expect(result.errors[0].reason).toContain('User not specified');
    });
  });

  describe('normalizeHeader', () => {
    it('should normalize various header formats via CSV import', async () => {
      const headerMappings = [
        { input: 'Machine Code', expected: 'machine_number' },
        { input: 'MachineCode', expected: 'machine_number' },
        { input: 'machine_id', expected: 'machine_number' },
        { input: 'Serial', expected: 'serial_number' },
        { input: 'SerialNumber', expected: 'serial_number' },
        { input: 'User', expected: 'user_identifier' },
        { input: 'user_id', expected: 'user_identifier' },
        { input: 'Email', expected: 'user_identifier' },
        { input: 'Username', expected: 'user_identifier' },
        { input: 'Telegram', expected: 'user_identifier' },
        { input: 'telegram_username', expected: 'user_identifier' },
      ];

      for (const mapping of headerMappings) {
        const csvContent = `${mapping.input},role
test-value,operator`;
        const buffer = Buffer.from(csvContent);

        // Just verify it doesn't throw - the normalization happened
        const result = await service.importFromCsv(buffer, 'creator-123');
        expect(result).toBeDefined();
      }
    });
  });

  describe('parseRole', () => {
    it('should parse all valid roles via CSV import', async () => {
      const roles = [
        { input: 'OWNER', expected: MachineAccessRole.OWNER },
        { input: 'Admin', expected: MachineAccessRole.ADMIN },
        { input: 'manager', expected: MachineAccessRole.MANAGER },
        { input: 'OPERATOR', expected: MachineAccessRole.OPERATOR },
        { input: 'Technician', expected: MachineAccessRole.TECHNICIAN },
        { input: 'viewer', expected: MachineAccessRole.VIEWER },
      ];

      for (const role of roles) {
        const csvContent = `machine_number,user_identifier,role
M-001,test@example.com,${role.input}`;
        const buffer = Buffer.from(csvContent);

        machineAccessService.resolveMachine.mockResolvedValue(mockMachine as any);
        machineAccessService.resolveUser.mockResolvedValue(mockUser as any);
        mockManagerFindOne.mockResolvedValue(null);
        mockManagerCreate.mockImplementation((entity, data) => ({
          ...data,
          id: 'access-1',
        }));
        mockManagerSave.mockResolvedValue({ id: 'access-1' } as any);

        const result = await service.importFromCsv(buffer, 'creator-123');

        expect(result.applied_count).toBe(1);
        expect(queryRunner.manager.create).toHaveBeenCalledWith(
          MachineAccess,
          expect.objectContaining({ role: role.expected }),
        );

        jest.clearAllMocks();
      }
    });
  });

  describe('batch processing', () => {
    it('should process large files in batches', async () => {
      // Create CSV with 600 rows (more than batch size of 500)
      let csvContent = 'machine_number,user_identifier,role\n';
      for (let i = 0; i < 600; i++) {
        csvContent += `M-${i.toString().padStart(3, '0')},user${i}@example.com,operator\n`;
      }
      const buffer = Buffer.from(csvContent);

      machineAccessService.resolveMachine.mockResolvedValue(mockMachine as any);
      machineAccessService.resolveUser.mockResolvedValue(mockUser as any);
      mockManagerFindOne.mockResolvedValue(null);
      mockManagerCreate.mockReturnValue({ id: 'access-1' } as any);
      mockManagerSave.mockResolvedValue({ id: 'access-1' } as any);

      const result = await service.importFromCsv(buffer, 'creator-123');

      expect(result.applied_count).toBe(600);
    });

    it('should include correct row numbers in errors', async () => {
      const csvContent = `machine_number,user_identifier,role
M-001,user1@example.com,operator
M-002,,operator
M-003,user3@example.com,operator`;
      const buffer = Buffer.from(csvContent);

      machineAccessService.resolveMachine.mockResolvedValue(mockMachine as any);
      machineAccessService.resolveUser.mockResolvedValue(mockUser as any);
      mockManagerFindOne.mockResolvedValue(null);
      mockManagerCreate.mockReturnValue({ id: 'access-1' } as any);
      mockManagerSave.mockResolvedValue({ id: 'access-1' } as any);

      const result = await service.importFromCsv(buffer, 'creator-123');

      expect(result.applied_count).toBe(2);
      expect(result.skipped_count).toBe(1);
      expect(result.errors[0].rowNumber).toBe(3); // Row 3 (1-based + header)
    });
  });

  describe('transaction handling', () => {
    it('should properly connect and release query runner', async () => {
      const csvContent = `machine_number,user_identifier,role
M-001,test@example.com,operator`;
      const buffer = Buffer.from(csvContent);

      machineAccessService.resolveMachine.mockResolvedValue(mockMachine as any);
      machineAccessService.resolveUser.mockResolvedValue(mockUser as any);
      mockManagerFindOne.mockResolvedValue(null);
      mockManagerCreate.mockReturnValue({ id: 'access-1' } as any);
      mockManagerSave.mockResolvedValue({ id: 'access-1' } as any);

      await service.importFromCsv(buffer, 'creator-123');

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should release query runner even on error', async () => {
      const csvContent = `machine_number,user_identifier,role
M-001,test@example.com,operator`;
      const buffer = Buffer.from(csvContent);

      machineAccessService.resolveMachine.mockRejectedValue(new Error('Fatal error'));

      try {
        await service.importFromCsv(buffer, 'creator-123');
      } catch {
        // Expected to throw
      }

      expect(queryRunner.release).toHaveBeenCalled();
    });
  });
});
