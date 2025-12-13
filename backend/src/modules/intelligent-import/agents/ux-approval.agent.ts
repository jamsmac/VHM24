import { Injectable, Logger } from '@nestjs/common';
import { IAgent, AgentContext, AgentStatus } from '../interfaces/agent.interface';
import {
  ActionPlan,
  ValidationReport,
  ImportSummary,
  DomainType,
} from '../interfaces/common.interface';
import { DiffFormatter, FormattedDiff } from '../tools/formatters/diff.formatter';
import { SummaryFormatter } from '../tools/formatters/summary.formatter';

interface UxInput {
  actionPlan: ActionPlan;
  validationReport: ValidationReport;
  domain: DomainType;
}

export interface ApprovalRequest {
  summary: ImportSummary;
  diff: FormattedDiff;
  requiresApproval: boolean;
  autoApprove: boolean;
}

/**
 * UX/Approval Agent
 *
 * Generates human-readable previews and approval requests
 */
@Injectable()
export class UxApprovalAgent implements IAgent<UxInput, ApprovalRequest> {
  private readonly logger = new Logger(UxApprovalAgent.name);
  readonly name = 'UxApprovalAgent';
  private status: AgentStatus = AgentStatus.IDLE;

  constructor(
    private readonly diffFormatter: DiffFormatter,
    private readonly summaryFormatter: SummaryFormatter,
  ) {}

  async execute(input: UxInput, _context: AgentContext): Promise<ApprovalRequest> {
    this.status = AgentStatus.RUNNING;

    try {
      this.logger.log(`Generating approval request for ${input.actionPlan.actions.length} actions`);

      // Generate summary
      const summary = this.summaryFormatter.generateSummary(
        input.domain,
        input.validationReport,
        input.actionPlan,
      );

      // Generate diff
      const diff = this.diffFormatter.formatActionPlan(input.actionPlan.actions);

      // Decide if approval is required
      const requiresApproval = this.requiresUserApproval(input);

      // Decide if can auto-approve
      const autoApprove = this.canAutoApprove(input);

      this.logger.log(`Requires approval: ${requiresApproval}, Auto-approve: ${autoApprove}`);

      this.status = AgentStatus.COMPLETED;

      return {
        summary,
        diff,
        requiresApproval,
        autoApprove,
      };
    } catch (error) {
      this.status = AgentStatus.FAILED;
      this.logger.error(`UX/Approval generation failed:`, error);
      throw error;
    }
  }

  async validateInput(input: UxInput): Promise<boolean> {
    return input.actionPlan && input.validationReport && input.domain != null;
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  private requiresUserApproval(_input: UxInput): boolean {
    // Always require approval for now
    // In future: auto-approve small, safe imports
    return true;
  }

  private canAutoApprove(input: UxInput): boolean {
    // Auto-approve if:
    // - No errors
    // - Less than 10 actions
    // - All inserts (no updates/deletes)
    const { validationReport, actionPlan } = input;

    if (validationReport.errorCount > 0) return false;
    if (actionPlan.actions.length > 10) return false;

    const hasRiskyActions = actionPlan.actions.some(
      (a) => a.type === 'update' || a.type === 'delete',
    );
    if (hasRiskyActions) return false;

    return true;
  }
}
