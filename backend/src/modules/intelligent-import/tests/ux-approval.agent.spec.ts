import { Test, TestingModule } from '@nestjs/testing';
import { UxApprovalAgent } from '../agents/ux-approval.agent';
import { DiffFormatter } from '../tools/formatters/diff.formatter';
import { SummaryFormatter } from '../tools/formatters/summary.formatter';
import { AgentStatus } from '../interfaces/agent.interface';
import { DomainType, ActionType } from '../interfaces/common.interface';

describe('UxApprovalAgent', () => {
  let agent: UxApprovalAgent;
  let mockDiffFormatter: jest.Mocked<DiffFormatter>;
  let mockSummaryFormatter: jest.Mocked<SummaryFormatter>;

  const mockContext = {
    sessionId: 'session-123',
    userId: 'user-123',
  };

  const mockValidationReport = {
    totalRows: 10,
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    errors: [],
    warnings: [],
    info: [],
    isValid: true,
    canProceed: true,
  };

  const mockActionPlan = {
    actions: [
      { type: ActionType.INSERT, table: 'transactions', data: { amount: 100 } },
      { type: ActionType.INSERT, table: 'transactions', data: { amount: 200 } },
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

  const mockSummary = {
    domain: DomainType.SALES,
    totalRows: 10,
    validRows: 10,
    invalidRows: 0,
    newEntities: [{ type: 'transactions', count: 2 }],
    updatedEntities: [],
    warnings: [],
    estimatedChanges: 'Create 2 new record(s).',
  };

  const mockDiff = {
    summary: 'Planned changes: 2 new record(s)',
    entries: [],
    markdown: '# Import Preview',
    html: '<div>Preview</div>',
  };

  beforeEach(async () => {
    mockDiffFormatter = {
      formatActionPlan: jest.fn().mockReturnValue(mockDiff),
    } as any;

    mockSummaryFormatter = {
      generateSummary: jest.fn().mockReturnValue(mockSummary),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UxApprovalAgent,
        {
          provide: DiffFormatter,
          useValue: mockDiffFormatter,
        },
        {
          provide: SummaryFormatter,
          useValue: mockSummaryFormatter,
        },
      ],
    }).compile();

    agent = module.get<UxApprovalAgent>(UxApprovalAgent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should generate approval request with summary and diff', async () => {
      // Arrange
      const input = {
        actionPlan: mockActionPlan,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.summary).toEqual(mockSummary);
      expect(result.diff).toEqual(mockDiff);
      expect(mockSummaryFormatter.generateSummary).toHaveBeenCalledWith(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );
      expect(mockDiffFormatter.formatActionPlan).toHaveBeenCalledWith(mockActionPlan.actions);
    });

    it('should always require user approval', async () => {
      // Arrange
      const input = {
        actionPlan: mockActionPlan,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.requiresApproval).toBe(true);
    });

    it('should allow auto-approve for small safe imports', async () => {
      // Arrange - small import with no errors, all inserts
      const smallActionPlan = {
        ...mockActionPlan,
        actions: Array(5).fill({ type: ActionType.INSERT, table: 'transactions', data: {} }),
      };

      const input = {
        actionPlan: smallActionPlan,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.autoApprove).toBe(true);
    });

    it('should NOT auto-approve when there are validation errors', async () => {
      // Arrange
      const reportWithErrors = {
        ...mockValidationReport,
        errorCount: 5,
      };

      const input = {
        actionPlan: mockActionPlan,
        validationReport: reportWithErrors,
        domain: DomainType.SALES,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.autoApprove).toBe(false);
    });

    it('should NOT auto-approve when action count exceeds 10', async () => {
      // Arrange
      const largeActionPlan = {
        ...mockActionPlan,
        actions: Array(15).fill({ type: ActionType.INSERT, table: 'transactions', data: {} }),
      };

      const input = {
        actionPlan: largeActionPlan,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.autoApprove).toBe(false);
    });

    it('should NOT auto-approve when there are update actions', async () => {
      // Arrange
      const actionPlanWithUpdate = {
        ...mockActionPlan,
        actions: [
          { type: ActionType.INSERT, table: 'transactions', data: {} },
          { type: 'update' as ActionType, table: 'transactions', data: {} },
        ],
      };

      const input = {
        actionPlan: actionPlanWithUpdate,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.autoApprove).toBe(false);
    });

    it('should NOT auto-approve when there are delete actions', async () => {
      // Arrange
      const actionPlanWithDelete = {
        ...mockActionPlan,
        actions: [
          { type: ActionType.INSERT, table: 'transactions', data: {} },
          { type: 'delete' as ActionType, table: 'transactions', data: {} },
        ],
      };

      const input = {
        actionPlan: actionPlanWithDelete,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.autoApprove).toBe(false);
    });

    it('should update status to COMPLETED after successful execution', async () => {
      // Arrange
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);

      const input = {
        actionPlan: mockActionPlan,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act
      await agent.execute(input, mockContext);

      // Assert
      expect(agent.getStatus()).toBe(AgentStatus.COMPLETED);
    });

    it('should set status to FAILED on error', async () => {
      // Arrange
      mockSummaryFormatter.generateSummary.mockImplementation(() => {
        throw new Error('Summary generation failed');
      });

      const input = {
        actionPlan: mockActionPlan,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act & Assert
      await expect(agent.execute(input, mockContext)).rejects.toThrow('Summary generation failed');
      expect(agent.getStatus()).toBe(AgentStatus.FAILED);
    });

    it('should handle skip actions for auto-approve decision', async () => {
      // Arrange - skip actions should be allowed for auto-approve
      const actionPlanWithSkip = {
        ...mockActionPlan,
        actions: [
          { type: ActionType.INSERT, table: 'transactions', data: {} },
          { type: ActionType.SKIP, table: 'transactions', data: {} },
        ],
      };

      const input = {
        actionPlan: actionPlanWithSkip,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert - skip actions don't prevent auto-approve
      expect(result.autoApprove).toBe(true);
    });

    it('should work with different domain types', async () => {
      // Arrange
      const domains = [
        DomainType.SALES,
        DomainType.INVENTORY,
        DomainType.MACHINES,
        DomainType.EQUIPMENT,
      ];

      for (const domain of domains) {
        mockSummaryFormatter.generateSummary.mockReturnValue({ ...mockSummary, domain });

        const input = {
          actionPlan: mockActionPlan,
          validationReport: mockValidationReport,
          domain,
        };

        // Act
        const result = await agent.execute(input, mockContext);

        // Assert
        expect(result.summary.domain).toBe(domain);
      }
    });
  });

  describe('requiresUserApproval (private method)', () => {
    it('should always return true in current implementation', async () => {
      // Act - test via execute
      const input = {
        actionPlan: { ...mockActionPlan, actions: [] },
        validationReport: { ...mockValidationReport, errorCount: 0 },
        domain: DomainType.SALES,
      };

      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.requiresApproval).toBe(true);
    });
  });

  describe('canAutoApprove (private method)', () => {
    it('should return true when all conditions are met', async () => {
      // Arrange - exactly at the limit of 10 actions
      const actionPlanAtLimit = {
        ...mockActionPlan,
        actions: Array(10).fill({ type: ActionType.INSERT, table: 'transactions', data: {} }),
      };

      const input = {
        actionPlan: actionPlanAtLimit,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.autoApprove).toBe(true);
    });

    it('should return false when exactly at 11 actions', async () => {
      // Arrange - 11 actions
      const actionPlanOverLimit = {
        ...mockActionPlan,
        actions: Array(11).fill({ type: ActionType.INSERT, table: 'transactions', data: {} }),
      };

      const input = {
        actionPlan: actionPlanOverLimit,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.autoApprove).toBe(false);
    });
  });

  describe('validateInput', () => {
    it('should return true when all required fields are present', async () => {
      // Arrange
      const input = {
        actionPlan: mockActionPlan,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act
      const result = await agent.validateInput(input);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when actionPlan is missing', async () => {
      // Arrange
      const input = {
        actionPlan: null as any,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act
      const result = await agent.validateInput(input);

      // Assert
      expect(result).toBeFalsy();
    });

    it('should return false when validationReport is missing', async () => {
      // Arrange
      const input = {
        actionPlan: mockActionPlan,
        validationReport: null as any,
        domain: DomainType.SALES,
      };

      // Act
      const result = await agent.validateInput(input);

      // Assert
      expect(result).toBeFalsy();
    });

    it('should return false when domain is null', async () => {
      // Arrange
      const input = {
        actionPlan: mockActionPlan,
        validationReport: mockValidationReport,
        domain: null as any,
      };

      // Act
      const result = await agent.validateInput(input);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when domain is undefined', async () => {
      // Arrange
      const input = {
        actionPlan: mockActionPlan,
        validationReport: mockValidationReport,
        domain: undefined as any,
      };

      // Act
      const result = await agent.validateInput(input);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return IDLE initially', () => {
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);
    });

    it('should return COMPLETED after successful execution', async () => {
      // Arrange
      const input = {
        actionPlan: mockActionPlan,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act
      await agent.execute(input, mockContext);

      // Assert
      expect(agent.getStatus()).toBe(AgentStatus.COMPLETED);
    });

    it('should return FAILED after failed execution', async () => {
      // Arrange
      mockDiffFormatter.formatActionPlan.mockImplementation(() => {
        throw new Error('Diff error');
      });

      const input = {
        actionPlan: mockActionPlan,
        validationReport: mockValidationReport,
        domain: DomainType.SALES,
      };

      // Act
      try {
        await agent.execute(input, mockContext);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(agent.getStatus()).toBe(AgentStatus.FAILED);
    });
  });
});
