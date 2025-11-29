import { Injectable, Logger } from '@nestjs/common';
import { IAgent, AgentContext, AgentStatus } from '../interfaces/agent.interface';
import {
  ReconciliationReport,
  DomainType,
  ExecutionResult,
  ValidationSeverity,
  Action,
} from '../interfaces/common.interface';

interface ReconciliationInput {
  domain: DomainType;
  executionResult: ExecutionResult;
  expectedRowCount: number;
}

/**
 * Reconciliation Agent
 *
 * Verifies data consistency after import
 */
@Injectable()
export class ReconciliationAgent implements IAgent<ReconciliationInput, ReconciliationReport> {
  private readonly logger = new Logger(ReconciliationAgent.name);
  readonly name = 'ReconciliationAgent';
  private status: AgentStatus = AgentStatus.IDLE;

  async execute(input: ReconciliationInput, context: AgentContext): Promise<ReconciliationReport> {
    this.status = AgentStatus.RUNNING;

    try {
      this.logger.log(`Reconciling import for ${input.domain} domain`);

      const gaps: { type: string; description: string; affectedRecords: number }[] = [];
      const inconsistencies: { type: string; description: string; severity: ValidationSeverity }[] =
        [];
      const proposedCorrections: Action[] = [];

      // Check if row count matches
      if (input.executionResult.successCount !== input.expectedRowCount) {
        const missing = input.expectedRowCount - input.executionResult.successCount;
        gaps.push({
          type: 'MISSING_RECORDS',
          description: `Expected ${input.expectedRowCount} records, but only ${input.executionResult.successCount} were inserted`,
          affectedRecords: missing,
        });
      }

      // Check for failures
      if (input.executionResult.failureCount > 0) {
        inconsistencies.push({
          type: 'EXECUTION_FAILURES',
          description: `${input.executionResult.failureCount} actions failed during execution`,
          severity: ValidationSeverity.ERROR,
        });
      }

      this.logger.log(
        `Reconciliation complete: ${gaps.length} gaps, ${inconsistencies.length} inconsistencies`,
      );

      this.status = AgentStatus.COMPLETED;

      return {
        domain: input.domain,
        gaps,
        inconsistencies,
        proposedCorrections,
      };
    } catch (error) {
      this.status = AgentStatus.FAILED;
      this.logger.error(`Reconciliation failed:`, error);
      throw error;
    }
  }

  async validateInput(input: ReconciliationInput): Promise<boolean> {
    return input.domain != null && input.executionResult != null;
  }

  getStatus(): AgentStatus {
    return this.status;
  }
}
