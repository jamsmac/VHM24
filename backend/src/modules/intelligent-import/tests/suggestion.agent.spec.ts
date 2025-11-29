import { Test, TestingModule } from '@nestjs/testing';
import { SuggestionAgent } from '../agents/suggestion.agent';
import { AgentStatus } from '../interfaces/agent.interface';
import { ActionType, ValidationSeverity } from '../interfaces/common.interface';

describe('SuggestionAgent', () => {
  let agent: SuggestionAgent;

  const mockContext = {
    sessionId: 'session-123',
    userId: 'user-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SuggestionAgent],
    }).compile();

    agent = module.get<SuggestionAgent>(SuggestionAgent);
  });

  describe('execute', () => {
    it('should generate INSERT actions for rows without errors', async () => {
      // Arrange
      const input = {
        validationReport: {
          totalRows: 3,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
          errors: [],
          warnings: [],
          info: [],
          isValid: true,
          canProceed: true,
        },
        rows: [
          { amount: 100, machine: 'M-001' },
          { amount: 200, machine: 'M-002' },
          { amount: 300, machine: 'M-003' },
        ],
        domain: 'sales',
        columnMapping: {},
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.actions).toHaveLength(3);
      expect(result.actions.every((a) => a.type === ActionType.INSERT)).toBe(true);
      expect(result.summary.insertCount).toBe(3);
      expect(result.summary.skipCount).toBe(0);
    });

    it('should generate SKIP actions for rows with errors', async () => {
      // Arrange
      const input = {
        validationReport: {
          totalRows: 3,
          errorCount: 2,
          warningCount: 0,
          infoCount: 0,
          errors: [
            {
              rowIndex: 0,
              field: 'amount',
              value: null,
              code: 'REQUIRED',
              message: 'Required field',
              severity: ValidationSeverity.ERROR,
            },
            {
              rowIndex: 2,
              field: 'amount',
              value: -100,
              code: 'INVALID',
              message: 'Invalid value',
              severity: ValidationSeverity.ERROR,
            },
          ],
          warnings: [],
          info: [],
          isValid: false,
          canProceed: true,
        },
        rows: [
          { amount: null, machine: 'M-001' },
          { amount: 200, machine: 'M-002' },
          { amount: -100, machine: 'M-003' },
        ],
        domain: 'sales',
        columnMapping: {},
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.actions).toHaveLength(3);
      expect(result.actions[0].type).toBe(ActionType.SKIP);
      expect(result.actions[1].type).toBe(ActionType.INSERT);
      expect(result.actions[2].type).toBe(ActionType.SKIP);
      expect(result.summary.insertCount).toBe(1);
      expect(result.summary.skipCount).toBe(2);
    });

    it('should add skip reason to metadata for skipped rows', async () => {
      // Arrange
      const input = {
        validationReport: {
          totalRows: 1,
          errorCount: 1,
          warningCount: 0,
          infoCount: 0,
          errors: [
            {
              rowIndex: 0,
              field: 'amount',
              value: null,
              code: 'REQUIRED',
              message: 'Required',
              severity: ValidationSeverity.ERROR,
            },
          ],
          warnings: [],
          info: [],
          isValid: false,
          canProceed: false,
        },
        rows: [{ amount: null }],
        domain: 'sales',
        columnMapping: {},
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.actions[0].metadata).toHaveProperty('reason', 'Validation errors');
      expect(result.actions[0].metadata).toHaveProperty('rowIndex', 0);
    });

    it('should calculate estimated duration based on action count', async () => {
      // Arrange
      const rows = Array(500).fill({ amount: 100, machine: 'M-001' });
      const input = {
        validationReport: {
          totalRows: 500,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
          errors: [],
          warnings: [],
          info: [],
          isValid: true,
          canProceed: true,
        },
        rows,
        domain: 'sales',
        columnMapping: {},
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.estimatedDuration).toBe(5); // 500 / 100 = 5 seconds
    });

    it('should identify risk when warning count > 0', async () => {
      // Arrange
      const input = {
        validationReport: {
          totalRows: 2,
          errorCount: 0,
          warningCount: 3,
          infoCount: 0,
          errors: [],
          warnings: [
            {
              rowIndex: 0,
              field: 'amount',
              value: 1000000,
              code: 'OUTLIER',
              message: 'Value is an outlier',
              severity: ValidationSeverity.WARNING,
            },
          ],
          info: [],
          isValid: true,
          canProceed: true,
        },
        rows: [{ amount: 1000000 }, { amount: 200 }],
        domain: 'sales',
        columnMapping: {},
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.risks).toContain('3 warnings detected');
    });

    it('should identify risk for large bulk inserts (>1000)', async () => {
      // Arrange
      const rows = Array(1500).fill({ amount: 100, machine: 'M-001' });
      const input = {
        validationReport: {
          totalRows: 1500,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
          errors: [],
          warnings: [],
          info: [],
          isValid: true,
          canProceed: true,
        },
        rows,
        domain: 'sales',
        columnMapping: {},
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.risks.some((r) => r.includes('Large bulk insert'))).toBe(true);
      expect(result.risks.some((r) => r.includes('1500'))).toBe(true);
    });

    it('should update agent status to COMPLETED after successful execution', async () => {
      // Arrange
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);

      const input = {
        validationReport: {
          totalRows: 1,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
          errors: [],
          warnings: [],
          info: [],
          isValid: true,
          canProceed: true,
        },
        rows: [{ amount: 100 }],
        domain: 'sales',
        columnMapping: {},
      };

      // Act
      await agent.execute(input, mockContext);

      // Assert
      expect(agent.getStatus()).toBe(AgentStatus.COMPLETED);
    });

    it('should set status to FAILED on error', async () => {
      // Arrange
      const invalidInput = {
        validationReport: null as any,
        rows: null as any,
        domain: 'sales',
        columnMapping: {},
      };

      // Act & Assert
      await expect(agent.execute(invalidInput, mockContext)).rejects.toThrow();
      expect(agent.getStatus()).toBe(AgentStatus.FAILED);
    });

    it('should correctly count all action types in summary', async () => {
      // Arrange
      const input = {
        validationReport: {
          totalRows: 5,
          errorCount: 2,
          warningCount: 0,
          infoCount: 0,
          errors: [
            {
              rowIndex: 1,
              field: 'amount',
              value: null,
              code: 'REQUIRED',
              message: 'Required',
              severity: ValidationSeverity.ERROR,
            },
            {
              rowIndex: 3,
              field: 'amount',
              value: null,
              code: 'REQUIRED',
              message: 'Required',
              severity: ValidationSeverity.ERROR,
            },
          ],
          warnings: [],
          info: [],
          isValid: false,
          canProceed: true,
        },
        rows: [
          { amount: 100 },
          { amount: null },
          { amount: 300 },
          { amount: null },
          { amount: 500 },
        ],
        domain: 'sales',
        columnMapping: {},
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.summary.insertCount).toBe(3);
      expect(result.summary.skipCount).toBe(2);
      expect(result.summary.updateCount).toBe(0);
      expect(result.summary.mergeCount).toBe(0);
      expect(result.summary.deleteCount).toBe(0);
    });
  });

  describe('getTableName', () => {
    it('should return correct table name for sales domain', async () => {
      // Act - Testing private method via reflection
      const tableName = (agent as any).getTableName('sales');

      // Assert
      expect(tableName).toBe('transactions');
    });

    it('should return correct table name for inventory domain', async () => {
      const tableName = (agent as any).getTableName('inventory');
      expect(tableName).toBe('inventory');
    });

    it('should return correct table name for machines domain', async () => {
      const tableName = (agent as any).getTableName('machines');
      expect(tableName).toBe('machines');
    });

    it('should return correct table name for equipment domain', async () => {
      const tableName = (agent as any).getTableName('equipment');
      expect(tableName).toBe('equipment');
    });

    it('should return "unknown" for unrecognized domain', async () => {
      const tableName = (agent as any).getTableName('some_unknown_domain');
      expect(tableName).toBe('unknown');
    });
  });

  describe('identifyRisks', () => {
    it('should return empty array when no risks', async () => {
      // Arrange
      const actions: any[] = [];
      const validationReport = {
        totalRows: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        errors: [],
        warnings: [],
        info: [],
        isValid: true,
        canProceed: true,
      };

      // Act
      const risks = (agent as any).identifyRisks(actions, validationReport);

      // Assert
      expect(risks).toEqual([]);
    });

    it('should add warning risk when warningCount > 0', async () => {
      // Arrange
      const actions: any[] = [];
      const validationReport = {
        warningCount: 5,
      };

      // Act
      const risks = (agent as any).identifyRisks(actions, validationReport);

      // Assert
      expect(risks).toContain('5 warnings detected');
    });

    it('should not add large insert risk when insert count <= 1000', async () => {
      // Arrange
      const actions = Array(1000).fill({ type: ActionType.INSERT });
      const validationReport = {
        warningCount: 0,
      };

      // Act
      const risks = (agent as any).identifyRisks(actions, validationReport);

      // Assert
      expect(risks.some((r: string) => r.includes('Large bulk insert'))).toBe(false);
    });
  });

  describe('validateInput', () => {
    it('should return true when rows exist', async () => {
      // Arrange
      const input = {
        rows: [{ amount: 100 }],
        validationReport: {},
        domain: 'sales',
        columnMapping: {},
      };

      // Act
      const result = await agent.validateInput(input as any);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when rows are empty', async () => {
      // Arrange
      const input = {
        rows: [],
        validationReport: {},
        domain: 'sales',
        columnMapping: {},
      };

      // Act
      const result = await agent.validateInput(input as any);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when rows are undefined', async () => {
      // Arrange
      const input = {
        rows: undefined as any,
        validationReport: {},
        domain: 'sales',
        columnMapping: {},
      };

      // Act
      const result = await agent.validateInput(input as any);

      // Assert
      expect(result).toBeFalsy();
    });
  });

  describe('getStatus', () => {
    it('should return IDLE initially', () => {
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);
    });

    it('should return COMPLETED after successful execution', async () => {
      const input = {
        validationReport: {
          totalRows: 1,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
          errors: [],
          warnings: [],
          info: [],
          isValid: true,
          canProceed: true,
        },
        rows: [{ amount: 100 }],
        domain: 'sales',
        columnMapping: {},
      };

      await agent.execute(input, mockContext);

      expect(agent.getStatus()).toBe(AgentStatus.COMPLETED);
    });
  });
});
