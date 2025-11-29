import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ExecutionAgent } from '../agents/execution.agent';
import { ImportAuditLog } from '../entities/import-audit-log.entity';
import { AgentStatus } from '../interfaces/agent.interface';
import { ActionType, ActionPlan } from '../interfaces/common.interface';

describe('ExecutionAgent', () => {
  let agent: ExecutionAgent;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockAuditRepo: jest.Mocked<Repository<ImportAuditLog>>;

  const mockContext = {
    sessionId: 'session-123',
    userId: 'user-123',
  };

  beforeEach(async () => {
    mockAuditRepo = {
      create: jest.fn().mockImplementation((data) => data),
    } as any;

    mockDataSource = {
      transaction: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionAgent,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(ImportAuditLog),
          useValue: mockAuditRepo,
        },
      ],
    }).compile();

    agent = module.get<ExecutionAgent>(ExecutionAgent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute INSERT actions successfully', async () => {
      // Arrange
      const mockActionPlan: ActionPlan = {
        actions: [
          {
            type: ActionType.INSERT,
            table: 'transactions',
            data: { amount: 100, machine_id: 'M-001' },
          },
          {
            type: ActionType.INSERT,
            table: 'transactions',
            data: { amount: 200, machine_id: 'M-002' },
          },
        ],
        summary: {
          insertCount: 2,
          updateCount: 0,
          mergeCount: 0,
          skipCount: 0,
          deleteCount: 0,
        },
        estimatedDuration: 1,
        risks: [],
      };

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnThis(),
          into: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ identifiers: [{ id: 1 }] }),
        }),
        save: jest.fn().mockResolvedValue({}),
      };

      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      // Act
      const result = await agent.execute(mockActionPlan, mockContext);

      // Assert
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results.every((r) => r.success)).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should execute UPDATE actions successfully', async () => {
      // Arrange
      const mockActionPlan: ActionPlan = {
        actions: [
          {
            type: ActionType.UPDATE,
            table: 'transactions',
            data: { amount: 150 },
            conditions: { id: 'tx-001' },
          },
        ],
        summary: {
          insertCount: 0,
          updateCount: 1,
          mergeCount: 0,
          skipCount: 0,
          deleteCount: 0,
        },
        estimatedDuration: 1,
        risks: [],
      };

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
        save: jest.fn().mockResolvedValue({}),
      };

      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      // Act
      const result = await agent.execute(mockActionPlan, mockContext);

      // Assert
      expect(result.successCount).toBe(1);
      expect(result.results[0].success).toBe(true);
    });

    it('should execute DELETE actions with soft delete', async () => {
      // Arrange
      const mockActionPlan: ActionPlan = {
        actions: [
          {
            type: ActionType.DELETE,
            table: 'transactions',
            data: {},
            conditions: { id: 'tx-001' },
          },
        ],
        summary: {
          insertCount: 0,
          updateCount: 0,
          mergeCount: 0,
          skipCount: 0,
          deleteCount: 1,
        },
        estimatedDuration: 1,
        risks: [],
      };

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          softDelete: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
        save: jest.fn().mockResolvedValue({}),
      };

      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      // Act
      const result = await agent.execute(mockActionPlan, mockContext);

      // Assert
      expect(result.successCount).toBe(1);
      expect(result.results[0].success).toBe(true);
    });

    it('should handle SKIP actions without database operations', async () => {
      // Arrange
      const mockActionPlan: ActionPlan = {
        actions: [
          {
            type: ActionType.SKIP,
            table: 'transactions',
            data: { amount: 100 },
            metadata: { reason: 'Validation errors' },
          },
        ],
        summary: {
          insertCount: 0,
          updateCount: 0,
          mergeCount: 0,
          skipCount: 1,
          deleteCount: 0,
        },
        estimatedDuration: 1,
        risks: [],
      };

      const mockManager = {
        createQueryBuilder: jest.fn(),
        save: jest.fn().mockResolvedValue({}),
      };

      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      // Act
      const result = await agent.execute(mockActionPlan, mockContext);

      // Assert
      expect(result.successCount).toBe(1);
      expect(result.results[0].result).toEqual({ skipped: true });
    });

    it('should throw error for unsupported action types', async () => {
      // Arrange
      const mockActionPlan: ActionPlan = {
        actions: [
          {
            type: 'unknown_type' as ActionType,
            table: 'transactions',
            data: {},
          },
        ],
        summary: {
          insertCount: 0,
          updateCount: 0,
          mergeCount: 0,
          skipCount: 0,
          deleteCount: 0,
        },
        estimatedDuration: 1,
        risks: [],
      };

      const mockManager = {
        createQueryBuilder: jest.fn(),
        save: jest.fn().mockResolvedValue({}),
      };

      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      // Act
      const result = await agent.execute(mockActionPlan, mockContext);

      // Assert
      expect(result.failureCount).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('Unsupported action type');
    });

    it('should record audit logs for each action', async () => {
      // Arrange
      const mockActionPlan: ActionPlan = {
        actions: [
          {
            type: ActionType.INSERT,
            table: 'transactions',
            data: { amount: 100 },
            metadata: { rowIndex: 0 },
          },
        ],
        summary: {
          insertCount: 1,
          updateCount: 0,
          mergeCount: 0,
          skipCount: 0,
          deleteCount: 0,
        },
        estimatedDuration: 1,
        risks: [],
      };

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnThis(),
          into: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({}),
        }),
        save: jest.fn().mockResolvedValue({}),
      };

      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      // Act
      await agent.execute(mockActionPlan, mockContext);

      // Assert
      expect(mockAuditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: mockContext.sessionId,
          action_type: ActionType.INSERT,
          table_name: 'transactions',
          executed_by_user_id: mockContext.userId,
        }),
      );
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should rollback transaction when failures exceed 10', async () => {
      // Arrange
      const actions = Array(15).fill({
        type: ActionType.INSERT,
        table: 'transactions',
        data: { amount: 100 },
      });

      const mockActionPlan: ActionPlan = {
        actions,
        summary: {
          insertCount: 15,
          updateCount: 0,
          mergeCount: 0,
          skipCount: 0,
          deleteCount: 0,
        },
        estimatedDuration: 1,
        risks: [],
      };

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnThis(),
          into: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          execute: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
        save: jest.fn().mockResolvedValue({}),
      };

      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      // Act & Assert
      await expect(agent.execute(mockActionPlan, mockContext)).rejects.toThrow(
        'Too many failures (11). Rolling back transaction.',
      );
      expect(agent.getStatus()).toBe(AgentStatus.FAILED);
    });

    it('should update status to COMPLETED after successful execution', async () => {
      // Arrange
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);

      const mockActionPlan: ActionPlan = {
        actions: [],
        summary: {
          insertCount: 0,
          updateCount: 0,
          mergeCount: 0,
          skipCount: 0,
          deleteCount: 0,
        },
        estimatedDuration: 0,
        risks: [],
      };

      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return callback({});
      });

      // Act
      await agent.execute(mockActionPlan, mockContext);

      // Assert
      expect(agent.getStatus()).toBe(AgentStatus.COMPLETED);
    });

    it('should update status to FAILED on error', async () => {
      // Arrange
      mockDataSource.transaction.mockRejectedValue(new Error('Transaction failed'));

      const mockActionPlan: ActionPlan = {
        actions: [],
        summary: {
          insertCount: 0,
          updateCount: 0,
          mergeCount: 0,
          skipCount: 0,
          deleteCount: 0,
        },
        estimatedDuration: 0,
        risks: [],
      };

      // Act & Assert
      await expect(agent.execute(mockActionPlan, mockContext)).rejects.toThrow(
        'Transaction failed',
      );
      expect(agent.getStatus()).toBe(AgentStatus.FAILED);
    });

    it('should calculate execution duration correctly', async () => {
      // Arrange
      const mockActionPlan: ActionPlan = {
        actions: [
          {
            type: ActionType.INSERT,
            table: 'transactions',
            data: { amount: 100 },
          },
        ],
        summary: {
          insertCount: 1,
          updateCount: 0,
          mergeCount: 0,
          skipCount: 0,
          deleteCount: 0,
        },
        estimatedDuration: 1,
        risks: [],
      };

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnThis(),
          into: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({}),
        }),
        save: jest.fn().mockResolvedValue({}),
      };

      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      // Act
      const result = await agent.execute(mockActionPlan, mockContext);

      // Assert
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle partial failures within transaction', async () => {
      // Arrange
      const mockActionPlan: ActionPlan = {
        actions: [
          {
            type: ActionType.INSERT,
            table: 'transactions',
            data: { amount: 100 },
          },
          {
            type: ActionType.INSERT,
            table: 'transactions',
            data: { amount: 200 },
          },
          {
            type: ActionType.INSERT,
            table: 'transactions',
            data: { amount: 300 },
          },
        ],
        summary: {
          insertCount: 3,
          updateCount: 0,
          mergeCount: 0,
          skipCount: 0,
          deleteCount: 0,
        },
        estimatedDuration: 1,
        risks: [],
      };

      let callCount = 0;
      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnThis(),
          into: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          execute: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 2) {
              return Promise.reject(new Error('Constraint violation'));
            }
            return Promise.resolve({});
          }),
        }),
        save: jest.fn().mockResolvedValue({}),
      };

      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      // Act
      const result = await agent.execute(mockActionPlan, mockContext);

      // Assert
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('Constraint violation');
    });
  });

  describe('validateInput', () => {
    it('should return true when actions array is not empty', async () => {
      // Arrange
      const input: ActionPlan = {
        actions: [{ type: ActionType.INSERT, table: 'test', data: {} }],
        summary: {
          insertCount: 1,
          updateCount: 0,
          mergeCount: 0,
          skipCount: 0,
          deleteCount: 0,
        },
        estimatedDuration: 1,
        risks: [],
      };

      // Act
      const result = await agent.validateInput(input);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when actions array is empty', async () => {
      // Arrange
      const input: ActionPlan = {
        actions: [],
        summary: {
          insertCount: 0,
          updateCount: 0,
          mergeCount: 0,
          skipCount: 0,
          deleteCount: 0,
        },
        estimatedDuration: 0,
        risks: [],
      };

      // Act
      const result = await agent.validateInput(input);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when actions is undefined', async () => {
      // Arrange
      const input = {
        actions: undefined as any,
        summary: {},
        estimatedDuration: 0,
        risks: [],
      };

      // Act
      const result = await agent.validateInput(input as any);

      // Assert - validateInput returns falsy value when actions is undefined
      expect(result).toBeFalsy();
    });
  });

  describe('getStatus', () => {
    it('should return IDLE initially', () => {
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);
    });
  });
});
