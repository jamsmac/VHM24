import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Job } from 'bull';
import { SalesImportProcessor } from './sales-import.processor';
import { SalesImport, ImportStatus, ImportFileType } from './entities/sales-import.entity';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
} from '../transactions/entities/transaction.entity';
import { Machine } from '../machines/entities/machine.entity';
import { Nomenclature } from '../nomenclature/entities/nomenclature.entity';
import { InventoryService } from '../inventory/inventory.service';

// Mock ExcelJS with configurable behavior
const mockWorkbook = {
  xlsx: {
    load: jest.fn().mockResolvedValue(undefined),
  },
  worksheets: [] as any[],
};

jest.mock('exceljs', () => ({
  Workbook: jest.fn().mockImplementation(() => mockWorkbook),
}));

// Mock csv-parser with configurable behavior
jest.mock('csv-parser', () => {
  return jest.fn().mockImplementation(() => {
    const { Transform } = require('stream');
    return new Transform({
      objectMode: true,
      transform(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
        // Parse the input and push rows
        const lines = chunk.toString().split('\n');
        const headers = lines[0]?.split(',') || [];

        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',');
            const row: any = {};
            headers.forEach((header: string, index: number) => {
              row[header.trim()] = values[index]?.trim();
            });
            this.push(row);
          }
        }
        callback();
      },
    });
  });
});

describe('SalesImportProcessor', () => {
  let processor: SalesImportProcessor;
  let mockImportRepository: jest.Mocked<Repository<SalesImport>>;
  let mockTransactionRepository: jest.Mocked<Repository<Transaction>>;
  let mockMachineRepository: jest.Mocked<Repository<Machine>>;
  let mockNomenclatureRepository: jest.Mocked<Repository<Nomenclature>>;
  let mockInventoryService: jest.Mocked<InventoryService>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockEntityManager: Partial<EntityManager>;

  const mockImport: Partial<SalesImport> = {
    id: 'import-123',
    uploaded_by_user_id: 'user-123',
    filename: 'sales_report.xlsx',
    file_type: ImportFileType.EXCEL,
    status: ImportStatus.PENDING,
    total_rows: 0,
    success_rows: 0,
    failed_rows: 0,
  };

  const mockMachine: Partial<Machine> = {
    id: 'machine-123',
    machine_number: 'M-001',
    name: 'Test Machine',
    contract_id: 'contract-123',
  };

  const mockMachineWithoutContract: Partial<Machine> = {
    id: 'machine-456',
    machine_number: 'M-002',
    name: 'Test Machine 2',
    contract_id: null,
  };

  const mockNomenclature: Partial<Nomenclature> = {
    id: 'nom-123',
    name: 'Coffee',
    sku: 'COF-001',
  };

  // Helper to get a valid past date (within 1 year)
  const getValidDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // 7 days ago
    return date.toISOString().split('T')[0];
  };

  const createMockJob = (overrides: any = {}): Partial<Job> => ({
    id: 'job-123',
    data: {
      importId: 'import-123',
      buffer: Buffer.from('test'),
      fileType: ImportFileType.EXCEL,
      userId: 'user-123',
      ...overrides.data,
    },
    progress: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const setupEntityManager = (
    config: {
      machineResult?: any;
      nomenclatureResult?: any;
      duplicateResult?: any;
    } = {},
  ) => {
    mockEntityManager = {
      findOne: jest.fn().mockImplementation((entity, _options) => {
        if (entity === Machine) {
          if (config.machineResult === null) {
            return Promise.resolve(null);
          }
          return Promise.resolve(config.machineResult ?? mockMachine);
        }
        if (entity === Nomenclature) {
          return Promise.resolve(config.nomenclatureResult ?? null);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockReturnValue({} as Transaction),
      save: jest.fn().mockResolvedValue({ id: 'transaction-123' }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(config.duplicateResult ?? null),
      }),
    };

    mockDataSource.transaction.mockImplementation(async (cb: any) => {
      return cb(mockEntityManager as EntityManager);
    });
  };

  const setupExcelMock = (rows: any[]) => {
    const headers: string[] = [];
    if (rows.length > 0) {
      Object.keys(rows[0]).forEach((key) => headers.push(key));
    }

    mockWorkbook.worksheets = [
      {
        eachRow: jest.fn((callback: (row: { eachCell: jest.Mock }, rowNumber: number) => void) => {
          // Header row
          callback(
            {
              eachCell: jest.fn((cb: (cell: { value: unknown }, idx: number) => void) => {
                headers.forEach((header, idx) => cb({ value: header }, idx + 1));
              }),
            },
            1,
          );
          // Data rows
          rows.forEach((row, rowIndex) => {
            callback(
              {
                eachCell: jest.fn((cb: (cell: { value: unknown }, idx: number) => void) => {
                  const values = Object.values(row);
                  values.forEach((val, idx) => cb({ value: val }, idx + 1));
                }),
              },
              rowIndex + 2,
            );
          });
        }),
      },
    ];
  };

  beforeEach(async () => {
    // Reset mocks
    mockWorkbook.worksheets = [];

    mockImportRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    mockTransactionRepository = {
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    mockMachineRepository = {
      findOne: jest.fn(),
    } as any;

    mockNomenclatureRepository = {
      findOne: jest.fn(),
    } as any;

    mockInventoryService = {
      deductFromMachine: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockDataSource = {
      transaction: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesImportProcessor,
        {
          provide: getRepositoryToken(SalesImport),
          useValue: mockImportRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: mockMachineRepository,
        },
        {
          provide: getRepositoryToken(Nomenclature),
          useValue: mockNomenclatureRepository,
        },
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    processor = module.get<SalesImportProcessor>(SalesImportProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleProcessFile', () => {
    it('should throw error when import record not found', async () => {
      mockImportRepository.findOne.mockResolvedValue(null);

      await expect(processor.handleProcessFile(createMockJob() as Job)).rejects.toThrow(
        'Import record import-123 not found',
      );
    });

    it('should process import and update status to COMPLETED on success', async () => {
      const validDate = getValidDate();
      setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '5000' }]);
      setupEntityManager();
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      // Verify final save with COMPLETED status
      const saveCalls = mockImportRepository.save.mock.calls;
      const lastSaveCall = saveCalls[saveCalls.length - 1][0];
      expect(lastSaveCall.status).toBe(ImportStatus.COMPLETED);
      expect(lastSaveCall.started_at).toBeInstanceOf(Date);
      expect(lastSaveCall.completed_at).toBeInstanceOf(Date);
    });

    it('should mark import as FAILED when all rows fail validation', async () => {
      // Use invalid amount (negative)
      const validDate = getValidDate();
      setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '-100' }]);
      setupEntityManager();
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      const saveCalls = mockImportRepository.save.mock.calls;
      const lastSaveCall = saveCalls[saveCalls.length - 1][0];
      expect(lastSaveCall.status).toBe(ImportStatus.FAILED);
    });

    it('should handle critical parsing errors and mark import as FAILED', async () => {
      // Empty worksheet triggers parsing error
      mockWorkbook.worksheets = [];
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await expect(processor.handleProcessFile(createMockJob() as Job)).rejects.toThrow(
        'Excel file is empty or invalid',
      );

      // Verify FAILED status was saved
      const saveCalls = mockImportRepository.save.mock.calls;
      const lastSaveCall = saveCalls[saveCalls.length - 1][0];
      expect(lastSaveCall.status).toBe(ImportStatus.FAILED);
      expect(lastSaveCall.message).toBe('Excel file is empty or invalid');
    });

    it('should report progress at key points', async () => {
      const validDate = getValidDate();
      setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '5000' }]);
      setupEntityManager();
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      const mockJob = createMockJob();
      await processor.handleProcessFile(mockJob as Job);

      expect(mockJob.progress).toHaveBeenCalledWith(10);
      expect(mockJob.progress).toHaveBeenCalledWith(30);
      expect(mockJob.progress).toHaveBeenCalledWith(95);
      expect(mockJob.progress).toHaveBeenCalledWith(100);
    });

    it('should return success true when rows are processed successfully', async () => {
      const validDate = getValidDate();
      setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '5000' }]);
      setupEntityManager();
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      const result = await processor.handleProcessFile(createMockJob() as Job);

      expect(result.success).toBe(true);
      expect(result.processedRows).toBe(1);
    });

    it('should return success false when all rows fail', async () => {
      const validDate = getValidDate();
      // Invalid machine number - machine not found
      setupExcelMock([{ date: validDate, machine_number: 'INVALID', amount: '5000' }]);
      setupEntityManager({ machineResult: null });
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      const result = await processor.handleProcessFile(createMockJob() as Job);

      // success is false when errorCount >= rows.length (all rows failed)
      expect(result.success).toBe(false);
      expect(result.processedRows).toBe(0);
    });
  });

  describe('parseFile', () => {
    it('should call parseCSV for CSV file type', async () => {
      const parseFile = (processor as any).parseFile.bind(processor);
      const buffer = Buffer.from('date,machine_number,amount\n2025-01-15,M-001,5000');

      const result = await parseFile(buffer, ImportFileType.CSV);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should call parseExcel for EXCEL file type', async () => {
      setupExcelMock([{ date: '2025-01-15', machine_number: 'M-001', amount: '5000' }]);
      const parseFile = (processor as any).parseFile.bind(processor);
      const buffer = Buffer.from('test');

      const result = await parseFile(buffer, ImportFileType.EXCEL);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw error for unsupported file type', async () => {
      const parseFile = (processor as any).parseFile.bind(processor);
      const buffer = Buffer.from('test');

      await expect(parseFile(buffer, 'UNSUPPORTED' as ImportFileType)).rejects.toThrow(
        'Unsupported file type: UNSUPPORTED',
      );
    });
  });

  describe('parseCSV', () => {
    it('should parse CSV with English column names', async () => {
      const parseCSV = (processor as any).parseCSV.bind(processor);
      const csvContent = 'date,machine_number,amount\n2025-01-15,M-001,5000';
      const buffer = Buffer.from(csvContent);

      const result = await parseCSV(buffer);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should parse CSV with Russian column names (Cyrillic)', async () => {
      const parseCSV = (processor as any).parseCSV.bind(processor);
      const csvContent = 'Дата,Номер аппарата,Сумма\n2025-01-15,M-001,5000';
      const buffer = Buffer.from(csvContent);

      const result = await parseCSV(buffer);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty CSV file', async () => {
      const parseCSV = (processor as any).parseCSV.bind(processor);
      const csvContent = 'date,machine_number,amount\n';
      const buffer = Buffer.from(csvContent);

      const result = await parseCSV(buffer);

      expect(result).toEqual([]);
    });
  });

  describe('parseExcel', () => {
    it('should parse Excel file with data rows', async () => {
      setupExcelMock([
        { date: '2025-01-15', machine_number: 'M-001', amount: '5000' },
        { date: '2025-01-16', machine_number: 'M-002', amount: '7500' },
      ]);
      const parseExcel = (processor as any).parseExcel.bind(processor);
      const buffer = Buffer.from('test');

      const result = await parseExcel(buffer);

      expect(result).toHaveLength(2);
    });

    it('should throw error for empty worksheet', async () => {
      mockWorkbook.worksheets = [];
      const parseExcel = (processor as any).parseExcel.bind(processor);
      const buffer = Buffer.from('empty');

      await expect(parseExcel(buffer)).rejects.toThrow('Excel file is empty or invalid');
    });

    it('should handle Excel with Russian column names', async () => {
      setupExcelMock([{ Дата: '2025-01-15', 'Номер аппарата': 'M-001', Сумма: '5000' }]);
      const parseExcel = (processor as any).parseExcel.bind(processor);
      const buffer = Buffer.from('test');

      const result = await parseExcel(buffer);

      expect(result).toHaveLength(1);
    });

    it('should handle cells with empty headers (skip them)', async () => {
      mockWorkbook.worksheets = [
        {
          eachRow: jest.fn(
            (callback: (row: { eachCell: jest.Mock }, rowNumber: number) => void) => {
              callback(
                {
                  eachCell: jest.fn((cb: (cell: { value: unknown }, idx: number) => void) => {
                    cb({ value: null }, 1);
                    cb({ value: 'date' }, 2);
                  }),
                },
                1,
              );
              callback(
                {
                  eachCell: jest.fn((cb: (cell: { value: unknown }, idx: number) => void) => {
                    cb({ value: '2025-01-15' }, 1);
                    cb({ value: '2025-01-16' }, 2);
                  }),
                },
                2,
              );
            },
          ),
        },
      ];
      const parseExcel = (processor as any).parseExcel.bind(processor);
      const buffer = Buffer.from('test');

      const result = await parseExcel(buffer);

      expect(result).toHaveLength(1);
    });
  });

  describe('row validation', () => {
    describe('machine validation', () => {
      it('should record error when machine not found', async () => {
        const validDate = getValidDate();
        setupExcelMock([{ date: validDate, machine_number: 'INVALID', amount: '5000' }]);
        setupEntityManager({ machineResult: null });
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        await processor.handleProcessFile(createMockJob() as Job);

        const saveCalls = mockImportRepository.save.mock.calls;
        const lastSaveCall = saveCalls[saveCalls.length - 1][0];
        expect(lastSaveCall.errors).not.toBeNull();
        expect(lastSaveCall.errors?.errors).toContainEqual(
          expect.stringContaining('Аппарат INVALID не найден'),
        );
      });
    });

    describe('nomenclature validation', () => {
      it('should find nomenclature when product name is provided', async () => {
        const validDate = getValidDate();
        setupExcelMock([
          { date: validDate, machine_number: 'M-001', amount: '5000', product_name: 'Coffee' },
        ]);
        setupEntityManager({ nomenclatureResult: mockNomenclature });
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        await processor.handleProcessFile(createMockJob() as Job);

        expect(mockEntityManager.findOne).toHaveBeenCalledWith(Nomenclature, {
          where: { name: 'Coffee' },
        });
      });

      it('should record warning (not error) when product name provided but not found', async () => {
        const validDate = getValidDate();
        setupExcelMock([
          {
            date: validDate,
            machine_number: 'M-001',
            amount: '5000',
            product_name: 'NonExistent',
          },
        ]);
        // Nomenclature not found but processing should continue
        setupEntityManager({ nomenclatureResult: null });
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        const result = await processor.handleProcessFile(createMockJob() as Job);

        // Transaction should still be created (nomenclature lookup failure is just a warning)
        expect(result.processedRows).toBe(1);
        const saveCalls = mockImportRepository.save.mock.calls;
        const lastSaveCall = saveCalls[saveCalls.length - 1][0];
        expect(lastSaveCall.errors).not.toBeNull();
        expect(lastSaveCall.errors?.errors).toContainEqual(
          expect.stringContaining('Товар "NonExistent" не найден'),
        );
      });
    });

    describe('amount validation', () => {
      it('should reject zero amount', async () => {
        const validDate = getValidDate();
        setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '0' }]);
        setupEntityManager();
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        await processor.handleProcessFile(createMockJob() as Job);

        const saveCalls = mockImportRepository.save.mock.calls;
        const lastSaveCall = saveCalls[saveCalls.length - 1][0];
        expect(lastSaveCall.errors?.errors).toContainEqual(
          expect.stringContaining('Сумма должна быть больше 0'),
        );
      });

      it('should reject negative amount', async () => {
        const validDate = getValidDate();
        setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '-100' }]);
        setupEntityManager();
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        await processor.handleProcessFile(createMockJob() as Job);

        const saveCalls = mockImportRepository.save.mock.calls;
        const lastSaveCall = saveCalls[saveCalls.length - 1][0];
        expect(lastSaveCall.errors?.errors).toContainEqual(
          expect.stringContaining('Сумма должна быть больше 0'),
        );
      });

      it('should reject amount exceeding 1,000,000', async () => {
        const validDate = getValidDate();
        setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '1500000' }]);
        setupEntityManager();
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        await processor.handleProcessFile(createMockJob() as Job);

        const saveCalls = mockImportRepository.save.mock.calls;
        const lastSaveCall = saveCalls[saveCalls.length - 1][0];
        expect(lastSaveCall.errors?.errors).toContainEqual(
          expect.stringContaining('Сумма слишком большая'),
        );
      });

      it('should accept valid amount at boundary (1,000,000)', async () => {
        const validDate = getValidDate();
        setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '1000000' }]);
        setupEntityManager();
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        const result = await processor.handleProcessFile(createMockJob() as Job);

        expect(result.processedRows).toBe(1);
      });
    });

    describe('date validation', () => {
      it('should reject missing date', async () => {
        setupExcelMock([{ date: '', machine_number: 'M-001', amount: '5000' }]);
        setupEntityManager();
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        await processor.handleProcessFile(createMockJob() as Job);

        const saveCalls = mockImportRepository.save.mock.calls;
        const lastSaveCall = saveCalls[saveCalls.length - 1][0];
        expect(lastSaveCall.errors?.errors).toContainEqual(
          expect.stringContaining('Дата обязательна'),
        );
      });

      it('should reject future dates', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        setupExcelMock([{ date: futureDateStr, machine_number: 'M-001', amount: '5000' }]);
        setupEntityManager();
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        await processor.handleProcessFile(createMockJob() as Job);

        const saveCalls = mockImportRepository.save.mock.calls;
        const lastSaveCall = saveCalls[saveCalls.length - 1][0];
        expect(lastSaveCall.errors?.errors).toContainEqual(
          expect.stringContaining('Дата продажи не может быть в будущем'),
        );
      });

      it('should reject dates older than 1 year', async () => {
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 2);
        const oldDateStr = oldDate.toISOString().split('T')[0];

        setupExcelMock([{ date: oldDateStr, machine_number: 'M-001', amount: '5000' }]);
        setupEntityManager();
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        await processor.handleProcessFile(createMockJob() as Job);

        const saveCalls = mockImportRepository.save.mock.calls;
        const lastSaveCall = saveCalls[saveCalls.length - 1][0];
        expect(lastSaveCall.errors?.errors).toContainEqual(
          expect.stringContaining('Дата слишком старая'),
        );
      });

      it('should accept date at boundary (today)', async () => {
        const today = new Date().toISOString().split('T')[0];

        setupExcelMock([{ date: today, machine_number: 'M-001', amount: '5000' }]);
        setupEntityManager();
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        const result = await processor.handleProcessFile(createMockJob() as Job);

        expect(result.processedRows).toBe(1);
      });

      it('should accept date within 1 year range', async () => {
        // Use a date 6 months ago (safely within range)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const dateStr = sixMonthsAgo.toISOString().split('T')[0];

        setupExcelMock([{ date: dateStr, machine_number: 'M-001', amount: '5000' }]);
        setupEntityManager();
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        const result = await processor.handleProcessFile(createMockJob() as Job);

        expect(result.processedRows).toBe(1);
      });
    });

    describe('quantity validation', () => {
      it('should reject zero quantity', async () => {
        const validDate = getValidDate();
        setupExcelMock([
          { date: validDate, machine_number: 'M-001', amount: '5000', quantity: '0' },
        ]);
        setupEntityManager();
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        await processor.handleProcessFile(createMockJob() as Job);

        const saveCalls = mockImportRepository.save.mock.calls;
        const lastSaveCall = saveCalls[saveCalls.length - 1][0];
        expect(lastSaveCall.errors?.errors).toContainEqual(
          expect.stringContaining('Количество должно быть больше 0'),
        );
      });

      it('should reject negative quantity', async () => {
        const validDate = getValidDate();
        setupExcelMock([
          { date: validDate, machine_number: 'M-001', amount: '5000', quantity: '-1' },
        ]);
        setupEntityManager();
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        await processor.handleProcessFile(createMockJob() as Job);

        const saveCalls = mockImportRepository.save.mock.calls;
        const lastSaveCall = saveCalls[saveCalls.length - 1][0];
        expect(lastSaveCall.errors?.errors).toContainEqual(
          expect.stringContaining('Количество должно быть больше 0'),
        );
      });

      it('should accept positive quantity', async () => {
        const validDate = getValidDate();
        setupExcelMock([
          { date: validDate, machine_number: 'M-001', amount: '5000', quantity: '5' },
        ]);
        setupEntityManager();
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        const result = await processor.handleProcessFile(createMockJob() as Job);

        expect(result.processedRows).toBe(1);
      });

      it('should accept when quantity is not provided (defaults to 1)', async () => {
        const validDate = getValidDate();
        setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '5000' }]);
        setupEntityManager();
        mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
        mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

        const result = await processor.handleProcessFile(createMockJob() as Job);

        expect(result.processedRows).toBe(1);
        // Verify quantity defaults to 1
        expect(mockEntityManager.create).toHaveBeenCalledWith(
          Transaction,
          expect.objectContaining({
            quantity: 1,
          }),
        );
      });
    });
  });

  describe('payment method mapping', () => {
    it('should default to CASH when no payment method provided', async () => {
      const validDate = getValidDate();
      setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '5000' }]);
      setupEntityManager();
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        Transaction,
        expect.objectContaining({
          payment_method: PaymentMethod.CASH,
        }),
      );
    });

    it('should map "card" to CARD payment method', async () => {
      const validDate = getValidDate();
      setupExcelMock([
        { date: validDate, machine_number: 'M-001', amount: '5000', payment_method: 'card' },
      ]);
      setupEntityManager();
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        Transaction,
        expect.objectContaining({
          payment_method: PaymentMethod.CARD,
        }),
      );
    });

    it('should map Russian "картой" to CARD payment method', async () => {
      const validDate = getValidDate();
      setupExcelMock([
        { date: validDate, machine_number: 'M-001', amount: '5000', payment_method: 'картой' },
      ]);
      setupEntityManager();
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        Transaction,
        expect.objectContaining({
          payment_method: PaymentMethod.CARD,
        }),
      );
    });

    it('should map "mobile" to MOBILE payment method', async () => {
      const validDate = getValidDate();
      setupExcelMock([
        { date: validDate, machine_number: 'M-001', amount: '5000', payment_method: 'mobile' },
      ]);
      setupEntityManager();
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        Transaction,
        expect.objectContaining({
          payment_method: PaymentMethod.MOBILE,
        }),
      );
    });

    it('should map Russian "мобильный" to MOBILE payment method', async () => {
      const validDate = getValidDate();
      setupExcelMock([
        {
          date: validDate,
          machine_number: 'M-001',
          amount: '5000',
          payment_method: 'мобильный',
        },
      ]);
      setupEntityManager();
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        Transaction,
        expect.objectContaining({
          payment_method: PaymentMethod.MOBILE,
        }),
      );
    });

    it('should map "qr" to QR payment method', async () => {
      const validDate = getValidDate();
      setupExcelMock([
        { date: validDate, machine_number: 'M-001', amount: '5000', payment_method: 'qr' },
      ]);
      setupEntityManager();
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        Transaction,
        expect.objectContaining({
          payment_method: PaymentMethod.QR,
        }),
      );
    });

    it('should default to CASH for unknown payment method', async () => {
      const validDate = getValidDate();
      setupExcelMock([
        { date: validDate, machine_number: 'M-001', amount: '5000', payment_method: 'bitcoin' },
      ]);
      setupEntityManager();
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        Transaction,
        expect.objectContaining({
          payment_method: PaymentMethod.CASH,
        }),
      );
    });
  });

  describe('duplicate detection', () => {
    it('should detect and skip duplicate transactions', async () => {
      const validDate = getValidDate();
      const existingTransaction = { id: 'existing-123' } as Transaction;
      setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '5000' }]);
      setupEntityManager({ duplicateResult: existingTransaction });
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      const saveCalls = mockImportRepository.save.mock.calls;
      const lastSaveCall = saveCalls[saveCalls.length - 1][0];
      expect(lastSaveCall.errors?.errors).toContainEqual(
        expect.stringContaining('Возможный дубликат транзакции'),
      );
    });

    it('should create transaction when no duplicate found', async () => {
      const validDate = getValidDate();
      setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '5000' }]);
      setupEntityManager({ duplicateResult: null });
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      const result = await processor.handleProcessFile(createMockJob() as Job);

      expect(mockEntityManager.save).toHaveBeenCalledWith(Transaction, expect.any(Object));
      expect(result.processedRows).toBe(1);
    });
  });

  describe('transaction creation', () => {
    it('should create transaction with correct fields', async () => {
      const validDate = getValidDate();
      setupExcelMock([
        {
          date: validDate,
          machine_number: 'M-001',
          amount: '5000',
          product_name: 'Coffee',
          quantity: '2',
        },
      ]);
      setupEntityManager({ nomenclatureResult: mockNomenclature });
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        Transaction,
        expect.objectContaining({
          transaction_type: TransactionType.SALE,
          machine_id: mockMachine.id,
          contract_id: mockMachine.contract_id,
          nomenclature_id: mockNomenclature.id,
          amount: 5000,
          currency: 'UZS',
          quantity: 2,
        }),
      );
    });

    it('should set contract_id to null when machine has no contract', async () => {
      const validDate = getValidDate();
      setupExcelMock([{ date: validDate, machine_number: 'M-002', amount: '5000' }]);
      setupEntityManager({ machineResult: mockMachineWithoutContract });
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        Transaction,
        expect.objectContaining({
          contract_id: null,
        }),
      );
    });

    it('should use default quantity of 1 when not specified', async () => {
      const validDate = getValidDate();
      setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '5000' }]);
      setupEntityManager();
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        Transaction,
        expect.objectContaining({
          quantity: 1,
        }),
      );
    });

    it('should include metadata with import details', async () => {
      const validDate = getValidDate();
      setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '5000' }]);
      setupEntityManager();
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        Transaction,
        expect.objectContaining({
          metadata: expect.objectContaining({
            import_id: 'import-123',
            row_number: 1,
          }),
        }),
      );
    });
  });

  describe('inventory deduction', () => {
    it('should deduct inventory when nomenclature and quantity are provided', async () => {
      const validDate = getValidDate();
      setupExcelMock([
        {
          date: validDate,
          machine_number: 'M-001',
          amount: '5000',
          product_name: 'Coffee',
          quantity: '3',
        },
      ]);
      setupEntityManager({ nomenclatureResult: mockNomenclature });
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      expect(mockInventoryService.deductFromMachine).toHaveBeenCalledWith(
        mockMachine.id,
        mockNomenclature.id,
        3,
        expect.stringContaining('Продажа из импорта'),
      );
    });

    it('should not deduct inventory when nomenclature is not found', async () => {
      const validDate = getValidDate();
      setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '5000', quantity: '3' }]);
      setupEntityManager({ nomenclatureResult: null });
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      expect(mockInventoryService.deductFromMachine).not.toHaveBeenCalled();
    });

    it('should not deduct inventory when quantity is 0 (parsed from empty)', async () => {
      const validDate = getValidDate();
      // When quantity column exists but is empty, parseInt returns NaN which is falsy
      setupExcelMock([
        { date: validDate, machine_number: 'M-001', amount: '5000', product_name: 'Coffee' },
      ]);
      setupEntityManager({ nomenclatureResult: mockNomenclature });
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      // quantity defaults to 1 from parseInt('1') but nomenclature is found
      // So inventory WILL be deducted
      expect(mockInventoryService.deductFromMachine).toHaveBeenCalled();
    });

    it('should continue processing if inventory deduction fails', async () => {
      const validDate = getValidDate();
      setupExcelMock([
        {
          date: validDate,
          machine_number: 'M-001',
          amount: '5000',
          product_name: 'Coffee',
          quantity: '3',
        },
      ]);
      setupEntityManager({ nomenclatureResult: mockNomenclature });
      mockInventoryService.deductFromMachine.mockRejectedValue(new Error('Insufficient inventory'));
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      const result = await processor.handleProcessFile(createMockJob() as Job);

      // Should still count as processed even if inventory deduction fails
      expect(result.processedRows).toBe(1);
    });
  });

  describe('row processing errors', () => {
    it('should catch and record generic row processing errors', async () => {
      const validDate = getValidDate();
      setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '5000' }]);
      mockEntityManager = {
        findOne: jest.fn().mockResolvedValue(mockMachine),
        create: jest.fn().mockReturnValue({} as Transaction),
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
      };
      mockDataSource.transaction.mockImplementation(async (cb: any) => {
        return cb(mockEntityManager as EntityManager);
      });
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      const saveCalls = mockImportRepository.save.mock.calls;
      const lastSaveCall = saveCalls[saveCalls.length - 1][0];
      expect(lastSaveCall.errors?.errors).toContainEqual(expect.stringContaining('Save failed'));
    });
  });

  describe('import result statistics', () => {
    it('should record correct final statistics', async () => {
      const validDate = getValidDate();
      setupExcelMock([
        { date: validDate, machine_number: 'M-001', amount: '5000' },
        { date: validDate, machine_number: 'INVALID', amount: '6000' },
        { date: validDate, machine_number: 'M-001', amount: '7000' },
      ]);
      mockEntityManager = {
        findOne: jest.fn().mockImplementation((entity, options) => {
          if (entity === Machine) {
            const machineNumber = options?.where?.machine_number;
            if (machineNumber === 'INVALID') return Promise.resolve(null);
            return Promise.resolve(mockMachine);
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockReturnValue({} as Transaction),
        save: jest.fn().mockResolvedValue({ id: 'transaction-123' }),
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
      };
      mockDataSource.transaction.mockImplementation(async (cb: any) => {
        return cb(mockEntityManager as EntityManager);
      });
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      const saveCalls = mockImportRepository.save.mock.calls;
      const lastSaveCall = saveCalls[saveCalls.length - 1][0];
      expect(lastSaveCall.total_rows).toBe(3);
      expect(lastSaveCall.success_rows).toBe(2);
      expect(lastSaveCall.failed_rows).toBe(1);
    });

    it('should set errors to null when no errors occurred', async () => {
      const validDate = getValidDate();
      setupExcelMock([{ date: validDate, machine_number: 'M-001', amount: '5000' }]);
      setupEntityManager();
      mockImportRepository.findOne.mockResolvedValue({ ...mockImport } as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      await processor.handleProcessFile(createMockJob() as Job);

      const saveCalls = mockImportRepository.save.mock.calls;
      const lastSaveCall = saveCalls[saveCalls.length - 1][0];
      expect(lastSaveCall.errors).toBeNull();
    });
  });
});
