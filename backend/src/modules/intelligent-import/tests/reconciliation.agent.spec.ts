import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationAgent } from '../agents/reconciliation.agent';
import { AgentStatus } from '../interfaces/agent.interface';
import { DomainType, ValidationSeverity } from '../interfaces/common.interface';

describe('ReconciliationAgent', () => {
  let agent: ReconciliationAgent;

  const mockContext = {
    sessionId: 'session-123',
    userId: 'user-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReconciliationAgent],
    }).compile();

    agent = module.get<ReconciliationAgent>(ReconciliationAgent);
  });

  describe('execute', () => {
    it('should return empty gaps and inconsistencies when execution is successful', async () => {
      // Arrange
      const input = {
        domain: DomainType.SALES,
        executionResult: {
          successCount: 100,
          failureCount: 0,
          results: [],
          duration: 500,
        },
        expectedRowCount: 100,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.domain).toBe(DomainType.SALES);
      expect(result.gaps).toHaveLength(0);
      expect(result.inconsistencies).toHaveLength(0);
      expect(result.proposedCorrections).toHaveLength(0);
    });

    it('should detect gap when successCount does not match expectedRowCount', async () => {
      // Arrange
      const input = {
        domain: DomainType.SALES,
        executionResult: {
          successCount: 80,
          failureCount: 20,
          results: [],
          duration: 500,
        },
        expectedRowCount: 100,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.gaps).toHaveLength(1);
      expect(result.gaps[0].type).toBe('MISSING_RECORDS');
      expect(result.gaps[0].affectedRecords).toBe(20);
      expect(result.gaps[0].description).toContain('Expected 100 records');
      expect(result.gaps[0].description).toContain('only 80 were inserted');
    });

    it('should detect inconsistency when there are execution failures', async () => {
      // Arrange
      const input = {
        domain: DomainType.INVENTORY,
        executionResult: {
          successCount: 95,
          failureCount: 5,
          results: [],
          duration: 500,
        },
        expectedRowCount: 100,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.inconsistencies).toHaveLength(1);
      expect(result.inconsistencies[0].type).toBe('EXECUTION_FAILURES');
      expect(result.inconsistencies[0].description).toContain('5 actions failed');
      expect(result.inconsistencies[0].severity).toBe(ValidationSeverity.ERROR);
    });

    it('should detect both gaps and inconsistencies', async () => {
      // Arrange
      const input = {
        domain: DomainType.MACHINES,
        executionResult: {
          successCount: 70,
          failureCount: 30,
          results: [],
          duration: 1000,
        },
        expectedRowCount: 100,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.gaps).toHaveLength(1);
      expect(result.gaps[0].type).toBe('MISSING_RECORDS');
      expect(result.gaps[0].affectedRecords).toBe(30);
      expect(result.inconsistencies).toHaveLength(1);
      expect(result.inconsistencies[0].type).toBe('EXECUTION_FAILURES');
    });

    it('should update status to COMPLETED after successful execution', async () => {
      // Arrange
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);

      const input = {
        domain: DomainType.SALES,
        executionResult: {
          successCount: 100,
          failureCount: 0,
          results: [],
          duration: 500,
        },
        expectedRowCount: 100,
      };

      // Act
      await agent.execute(input, mockContext);

      // Assert
      expect(agent.getStatus()).toBe(AgentStatus.COMPLETED);
    });

    it('should set status to FAILED on error', async () => {
      // Arrange
      const invalidInput = null as any;

      // Act & Assert
      await expect(agent.execute(invalidInput, mockContext)).rejects.toThrow();
      expect(agent.getStatus()).toBe(AgentStatus.FAILED);
    });

    it('should return empty proposedCorrections array', async () => {
      // Arrange
      const input = {
        domain: DomainType.SALES,
        executionResult: {
          successCount: 50,
          failureCount: 50,
          results: [],
          duration: 500,
        },
        expectedRowCount: 100,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      // Current implementation doesn't propose corrections
      expect(result.proposedCorrections).toEqual([]);
    });

    it('should handle zero expected rows', async () => {
      // Arrange
      const input = {
        domain: DomainType.SALES,
        executionResult: {
          successCount: 0,
          failureCount: 0,
          results: [],
          duration: 100,
        },
        expectedRowCount: 0,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.gaps).toHaveLength(0);
      expect(result.inconsistencies).toHaveLength(0);
    });

    it('should handle all rows failing', async () => {
      // Arrange
      const input = {
        domain: DomainType.SALES,
        executionResult: {
          successCount: 0,
          failureCount: 100,
          results: [],
          duration: 500,
        },
        expectedRowCount: 100,
      };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.gaps).toHaveLength(1);
      expect(result.gaps[0].affectedRecords).toBe(100);
      expect(result.inconsistencies).toHaveLength(1);
      expect(result.inconsistencies[0].description).toContain('100 actions failed');
    });

    it('should pass through correct domain type', async () => {
      // Arrange
      const domains = [
        DomainType.SALES,
        DomainType.INVENTORY,
        DomainType.MACHINES,
        DomainType.EQUIPMENT,
      ];

      for (const domain of domains) {
        const input = {
          domain,
          executionResult: {
            successCount: 100,
            failureCount: 0,
            results: [],
            duration: 500,
          },
          expectedRowCount: 100,
        };

        // Act
        const result = await agent.execute(input, mockContext);

        // Assert
        expect(result.domain).toBe(domain);
      }
    });
  });

  describe('validateInput', () => {
    it('should return true when domain and executionResult are provided', async () => {
      // Arrange
      const input = {
        domain: DomainType.SALES,
        executionResult: {
          successCount: 100,
          failureCount: 0,
          results: [],
          duration: 500,
        },
        expectedRowCount: 100,
      };

      // Act
      const result = await agent.validateInput(input);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when domain is null', async () => {
      // Arrange
      const input = {
        domain: null as any,
        executionResult: {
          successCount: 100,
          failureCount: 0,
          results: [],
          duration: 500,
        },
        expectedRowCount: 100,
      };

      // Act
      const result = await agent.validateInput(input);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when executionResult is null', async () => {
      // Arrange
      const input = {
        domain: DomainType.SALES,
        executionResult: null as any,
        expectedRowCount: 100,
      };

      // Act
      const result = await agent.validateInput(input);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when both domain and executionResult are null', async () => {
      // Arrange
      const input = {
        domain: null as any,
        executionResult: null as any,
        expectedRowCount: 100,
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
        domain: DomainType.SALES,
        executionResult: {
          successCount: 100,
          failureCount: 0,
          results: [],
          duration: 500,
        },
        expectedRowCount: 100,
      };

      // Act
      await agent.execute(input, mockContext);

      // Assert
      expect(agent.getStatus()).toBe(AgentStatus.COMPLETED);
    });

    it('should return FAILED after failed execution', async () => {
      // Arrange
      const invalidInput = {} as any;

      // Act
      try {
        await agent.execute(invalidInput, mockContext);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(agent.getStatus()).toBe(AgentStatus.FAILED);
    });
  });
});
