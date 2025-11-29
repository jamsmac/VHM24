import { Test, TestingModule } from '@nestjs/testing';
import { ValidationAgent } from '../agents/validation.agent';
import { RulesEngineService } from '../engines/rules-engine.service';
import { SchemaValidator } from '../tools/validators/schema.validator';
import { IntegrityValidator } from '../tools/validators/integrity.validator';
import { AnomalyDetector } from '../tools/validators/anomaly.detector';
import { AgentStatus, ClassifiedData } from '../interfaces/agent.interface';
import { DomainType, ValidationSeverity } from '../interfaces/common.interface';

describe('ValidationAgent', () => {
  let agent: ValidationAgent;
  let mockRulesEngine: jest.Mocked<RulesEngineService>;
  let mockSchemaValidator: jest.Mocked<SchemaValidator>;
  let mockIntegrityValidator: jest.Mocked<IntegrityValidator>;
  let mockAnomalyDetector: jest.Mocked<AnomalyDetector>;

  const mockClassifiedData: ClassifiedData = {
    domain: DomainType.SALES,
    schema: {
      domain: DomainType.SALES,
      fields: [
        { name: 'amount', type: 'number', required: true },
        { name: 'machine_number', type: 'string', required: true },
        { name: 'transaction_date', type: 'date', required: true },
      ],
      relationships: {},
    },
    columnMapping: {
      amount: { field: 'amount', confidence: 1.0 },
      machine: { field: 'machine_number', confidence: 0.9 },
      date: { field: 'transaction_date', confidence: 1.0 },
    },
    rows: [
      { amount: 5000, machine_number: 'M-001', transaction_date: '2025-01-15' },
      { amount: 10000, machine_number: 'M-002', transaction_date: '2025-01-16' },
    ],
    confidence: 0.95,
  };

  const mockContext = {
    sessionId: 'session-123',
    userId: 'user-123',
  };

  beforeEach(async () => {
    mockRulesEngine = {
      getRules: jest.fn().mockResolvedValue([]),
      validate: jest.fn().mockResolvedValue({ passed: true, errors: [], warnings: [] }),
    } as any;

    mockSchemaValidator = {
      validate: jest.fn().mockResolvedValue([]),
    } as any;

    mockIntegrityValidator = {
      checkForeignKeys: jest.fn().mockResolvedValue([]),
    } as any;

    mockAnomalyDetector = {
      detectAllAnomalies: jest.fn().mockReturnValue([]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationAgent,
        {
          provide: RulesEngineService,
          useValue: mockRulesEngine,
        },
        {
          provide: SchemaValidator,
          useValue: mockSchemaValidator,
        },
        {
          provide: IntegrityValidator,
          useValue: mockIntegrityValidator,
        },
        {
          provide: AnomalyDetector,
          useValue: mockAnomalyDetector,
        },
      ],
    }).compile();

    agent = module.get<ValidationAgent>(ValidationAgent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return valid report when no errors found', async () => {
      // Act
      const result = await agent.execute(mockClassifiedData, mockContext);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.totalRows).toBe(2);
    });

    it('should call all validation steps', async () => {
      // Act
      await agent.execute(mockClassifiedData, mockContext);

      // Assert
      expect(mockSchemaValidator.validate).toHaveBeenCalled();
      expect(mockRulesEngine.getRules).toHaveBeenCalledWith(DomainType.SALES);
      expect(mockRulesEngine.validate).toHaveBeenCalled();
      expect(mockIntegrityValidator.checkForeignKeys).toHaveBeenCalled();
      expect(mockAnomalyDetector.detectAllAnomalies).toHaveBeenCalled();
    });

    it('should categorize schema validation errors correctly', async () => {
      // Arrange
      mockSchemaValidator.validate.mockResolvedValue([
        {
          rowIndex: 0,
          field: 'amount',
          value: null,
          code: 'REQUIRED_FIELD',
          message: 'Amount is required',
          severity: ValidationSeverity.ERROR,
        },
        {
          rowIndex: 1,
          field: 'amount',
          value: -100,
          code: 'NEGATIVE_VALUE',
          message: 'Amount should be positive',
          severity: ValidationSeverity.WARNING,
        },
      ]);

      // Act
      const result = await agent.execute(mockClassifiedData, mockContext);

      // Assert
      expect(result.errorCount).toBe(1);
      expect(result.warningCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
    });

    it('should include business rule validation errors in report', async () => {
      // Arrange
      mockRulesEngine.validate.mockResolvedValue({
        passed: false,
        errors: [
          {
            rowIndex: 0,
            field: 'amount',
            value: 1000000,
            code: 'MAX_AMOUNT_EXCEEDED',
            message: 'Amount exceeds maximum',
            severity: ValidationSeverity.ERROR,
          },
        ],
        warnings: [],
      });

      // Act
      const result = await agent.execute(mockClassifiedData, mockContext);

      // Assert - The agent validates each row, so errors accumulate
      expect(result.errors.some((e) => e.code === 'MAX_AMOUNT_EXCEEDED')).toBe(true);
    });

    it('should set canProceed to false when error rate exceeds 10%', async () => {
      // Arrange - Create data with more than 10% errors
      const dataWith100Rows = {
        ...mockClassifiedData,
        rows: Array(100).fill({ amount: 5000, machine_number: 'M-001' }),
      };

      // 15 errors out of 100 rows = 15% error rate
      const errors = Array(15)
        .fill(null)
        .map((_, i) => ({
          rowIndex: i,
          field: 'amount',
          value: null,
          code: 'ERROR',
          message: 'Error',
          severity: ValidationSeverity.ERROR,
        }));

      mockSchemaValidator.validate.mockResolvedValue(errors);

      // Act
      const result = await agent.execute(dataWith100Rows, mockContext);

      // Assert
      expect(result.canProceed).toBe(false);
    });

    it('should set canProceed to true when error rate is below 10%', async () => {
      // Arrange - Create data with less than 10% errors
      const dataWith100Rows = {
        ...mockClassifiedData,
        rows: Array(100).fill({ amount: 5000, machine_number: 'M-001' }),
      };

      // 5 errors out of 100 rows = 5% error rate
      const errors = Array(5)
        .fill(null)
        .map((_, i) => ({
          rowIndex: i,
          field: 'amount',
          value: null,
          code: 'ERROR',
          message: 'Error',
          severity: ValidationSeverity.ERROR,
        }));

      mockSchemaValidator.validate.mockResolvedValue(errors);

      // Act
      const result = await agent.execute(dataWith100Rows, mockContext);

      // Assert
      expect(result.canProceed).toBe(true);
    });

    it('should include integrity validation errors', async () => {
      // Arrange
      mockIntegrityValidator.checkForeignKeys.mockResolvedValue([
        {
          rowIndex: 0,
          field: 'machine_id',
          value: 'invalid-id',
          code: 'FK_NOT_FOUND',
          message: 'Machine not found',
          severity: ValidationSeverity.ERROR,
        },
      ]);

      // Act
      const result = await agent.execute(mockClassifiedData, mockContext);

      // Assert
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].code).toBe('FK_NOT_FOUND');
    });

    it('should include anomaly detection results', async () => {
      // Arrange
      mockAnomalyDetector.detectAllAnomalies.mockReturnValue([
        {
          rowIndex: 0,
          field: 'amount',
          value: 1000000,
          code: 'OUTLIER',
          message: 'Value is an outlier',
          severity: ValidationSeverity.WARNING,
        },
      ]);

      // Act
      const result = await agent.execute(mockClassifiedData, mockContext);

      // Assert
      expect(result.warningCount).toBe(1);
      expect(result.warnings[0].code).toBe('OUTLIER');
    });

    it('should update agent status during execution', async () => {
      // Arrange
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);

      // Act
      await agent.execute(mockClassifiedData, mockContext);

      // Assert
      expect(agent.getStatus()).toBe(AgentStatus.COMPLETED);
    });

    it('should set status to FAILED on error', async () => {
      // Arrange
      mockSchemaValidator.validate.mockRejectedValue(new Error('Validation error'));

      // Act & Assert
      await expect(agent.execute(mockClassifiedData, mockContext)).rejects.toThrow(
        'Validation error',
      );
      expect(agent.getStatus()).toBe(AgentStatus.FAILED);
    });

    it('should correctly count info level messages', async () => {
      // Arrange
      mockSchemaValidator.validate.mockResolvedValue([
        {
          rowIndex: 0,
          field: 'description',
          value: '',
          code: 'EMPTY_OPTIONAL',
          message: 'Optional field is empty',
          severity: ValidationSeverity.INFO,
        },
      ]);

      // Act
      const result = await agent.execute(mockClassifiedData, mockContext);

      // Assert
      expect(result.infoCount).toBe(1);
      expect(result.info).toHaveLength(1);
    });
  });

  describe('validateInput', () => {
    it('should return true for valid input', async () => {
      // Act
      const result = await agent.validateInput(mockClassifiedData);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw error when rows are empty', async () => {
      // Arrange
      const invalidData = { ...mockClassifiedData, rows: [] };

      // Act & Assert
      await expect(agent.validateInput(invalidData)).rejects.toThrow('No rows to validate');
    });

    it('should throw error when rows are undefined', async () => {
      // Arrange
      const invalidData = { ...mockClassifiedData, rows: undefined as any };

      // Act & Assert
      await expect(agent.validateInput(invalidData)).rejects.toThrow('No rows to validate');
    });

    it('should throw error when schema is missing', async () => {
      // Arrange
      const invalidData = { ...mockClassifiedData, schema: undefined as any };

      // Act & Assert
      await expect(agent.validateInput(invalidData)).rejects.toThrow(
        'Schema is required for validation',
      );
    });
  });

  describe('getStatus', () => {
    it('should return IDLE initially', () => {
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);
    });

    it('should return COMPLETED after successful execution', async () => {
      await agent.execute(mockClassifiedData, mockContext);
      expect(agent.getStatus()).toBe(AgentStatus.COMPLETED);
    });

    it('should return FAILED after failed execution', async () => {
      mockSchemaValidator.validate.mockRejectedValue(new Error('Test error'));
      try {
        await agent.execute(mockClassifiedData, mockContext);
      } catch {
        // Expected to throw
      }
      expect(agent.getStatus()).toBe(AgentStatus.FAILED);
    });
  });

  describe('categorizeErrors', () => {
    it('should correctly categorize mixed severity errors', async () => {
      // Arrange
      const mixedErrors = [
        {
          rowIndex: 0,
          field: 'f1',
          value: null,
          code: 'E1',
          message: 'Error 1',
          severity: ValidationSeverity.ERROR,
        },
        {
          rowIndex: 1,
          field: 'f2',
          value: null,
          code: 'W1',
          message: 'Warning 1',
          severity: ValidationSeverity.WARNING,
        },
        {
          rowIndex: 2,
          field: 'f3',
          value: null,
          code: 'I1',
          message: 'Info 1',
          severity: ValidationSeverity.INFO,
        },
        {
          rowIndex: 3,
          field: 'f4',
          value: null,
          code: 'E2',
          message: 'Error 2',
          severity: ValidationSeverity.ERROR,
        },
      ];

      mockSchemaValidator.validate.mockResolvedValue(mixedErrors);

      // Act
      const result = await agent.execute(mockClassifiedData, mockContext);

      // Assert
      expect(result.errorCount).toBe(2);
      expect(result.warningCount).toBe(1);
      expect(result.infoCount).toBe(1);
    });
  });
});
