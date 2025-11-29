import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileUpload, AgentContext } from '../interfaces/agent.interface';
import { ImportSession } from '../entities/import-session.entity';
import {
  ImportSessionStatus,
  ApprovalStatus,
  DomainType,
  ActionPlan,
  ColumnMapping,
} from '../interfaces/common.interface';
import { FileIntakeAgent } from '../agents/file-intake.agent';
import { ClassificationAgent } from '../agents/classification.agent';
import { ValidationAgent } from '../agents/validation.agent';
import { SuggestionAgent } from '../agents/suggestion.agent';
import { UxApprovalAgent } from '../agents/ux-approval.agent';
import { ExecutionAgent } from '../agents/execution.agent';
import { ReconciliationAgent } from '../agents/reconciliation.agent';
import { LearningAgent } from '../agents/learning.agent';

export interface ImportResult {
  sessionId: string;
  status: ImportSessionStatus;
  message: string;
}

/**
 * Main Import Workflow
 *
 * Orchestrates the complete import pipeline through 8 agents
 */
@Injectable()
export class ImportWorkflow {
  private readonly logger = new Logger(ImportWorkflow.name);
  readonly name = 'import_workflow';

  constructor(
    @InjectRepository(ImportSession)
    private readonly sessionRepo: Repository<ImportSession>,
    private readonly fileIntakeAgent: FileIntakeAgent,
    private readonly classificationAgent: ClassificationAgent,
    private readonly validationAgent: ValidationAgent,
    private readonly suggestionAgent: SuggestionAgent,
    private readonly uxApprovalAgent: UxApprovalAgent,
    private readonly executionAgent: ExecutionAgent,
    private readonly reconciliationAgent: ReconciliationAgent,
    private readonly learningAgent: LearningAgent,
  ) {}

  /**
   * Execute import workflow
   */
  async execute(
    fileUpload: FileUpload,
    userId: string,
    onProgress?: (status: ImportSessionStatus, progress: number, message: string) => void,
  ): Promise<ImportResult> {
    // Create import session
    const session = await this.createSession(userId);
    const context: AgentContext = {
      sessionId: session.id,
      userId,
    };

    try {
      this.logger.log(`Starting import workflow for session ${session.id}`);

      // Step 1: File Intake
      await this.updateSessionStatus(session.id, ImportSessionStatus.PARSING);
      onProgress?.(ImportSessionStatus.PARSING, 10, 'Parsing file...');

      const parsedFile = await this.fileIntakeAgent.execute(fileUpload, context);
      await this.sessionRepo.update(session.id, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        file_metadata: parsedFile.metadata as any,
      });

      // Step 2: Classification
      await this.updateSessionStatus(session.id, ImportSessionStatus.CLASSIFYING);
      onProgress?.(ImportSessionStatus.CLASSIFYING, 25, 'Classifying data...');

      const classificationResult = await this.classificationAgent.execute(parsedFile, context);
      await this.sessionRepo.update(session.id, {
        domain: classificationResult.domain,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        classification_result: classificationResult as any,
        template_id: classificationResult.suggestedTemplate,
      });

      // Step 3: Validation
      await this.updateSessionStatus(session.id, ImportSessionStatus.VALIDATING);
      onProgress?.(ImportSessionStatus.VALIDATING, 40, 'Validating data...');

      const validationReport = await this.validationAgent.execute(
        {
          domain: classificationResult.domain,
          schema: await this.classificationAgent['schemaRegistry'].getSchema(
            classificationResult.domain,
          ),
          columnMapping: classificationResult.columnMapping,
          rows: this.mapRows(
            parsedFile.tables[0].rows,
            parsedFile.tables[0].headers,
            classificationResult.columnMapping,
          ),
          confidence: classificationResult.confidence,
        },
        context,
      );
      await this.sessionRepo.update(session.id, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        validation_report: validationReport as any,
      });

      if (!validationReport.canProceed) {
        await this.updateSessionStatus(session.id, ImportSessionStatus.FAILED);
        return {
          sessionId: session.id,
          status: ImportSessionStatus.FAILED,
          message: `Validation failed: ${validationReport.errorCount} errors (${((validationReport.errorCount / validationReport.totalRows) * 100).toFixed(1)}% failure rate)`,
        };
      }

      // Step 4: Suggestion
      await this.updateSessionStatus(session.id, ImportSessionStatus.SUGGESTING);
      onProgress?.(ImportSessionStatus.SUGGESTING, 55, 'Generating action plan...');

      const actionPlan = await this.suggestionAgent.execute(
        {
          validationReport,
          rows: this.mapRows(
            parsedFile.tables[0].rows,
            parsedFile.tables[0].headers,
            classificationResult.columnMapping,
          ),
          domain: classificationResult.domain,
          columnMapping: classificationResult.columnMapping,
        },
        context,
      );
      await this.sessionRepo.update(session.id, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        action_plan: actionPlan as any,
      });

      // Step 5: UX/Approval
      await this.updateSessionStatus(session.id, ImportSessionStatus.AWAITING_APPROVAL);
      onProgress?.(ImportSessionStatus.AWAITING_APPROVAL, 70, 'Awaiting approval...');

      const approvalRequest = await this.uxApprovalAgent.execute(
        {
          actionPlan,
          validationReport,
          domain: classificationResult.domain,
        },
        context,
      );

      if (approvalRequest.autoApprove) {
        await this.sessionRepo.update(session.id, {
          approval_status: ApprovalStatus.AUTO_APPROVED,
          approved_by_user_id: userId,
          approved_at: new Date(),
        });
        this.logger.log(`Auto-approved session ${session.id}`);
      } else {
        // Wait for manual approval
        this.logger.log(`Session ${session.id} requires manual approval`);
        return {
          sessionId: session.id,
          status: ImportSessionStatus.AWAITING_APPROVAL,
          message: 'Import ready for approval',
        };
      }

      // Step 6: Execution (only if approved)
      await this.updateSessionStatus(session.id, ImportSessionStatus.EXECUTING);
      onProgress?.(ImportSessionStatus.EXECUTING, 85, 'Executing actions...');

      const executionResult = await this.executionAgent.execute(actionPlan, context);
      await this.sessionRepo.update(session.id, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        execution_result: executionResult as any,
      });

      // Step 7: Reconciliation
      await this.updateSessionStatus(session.id, ImportSessionStatus.RECONCILING);
      onProgress?.(ImportSessionStatus.RECONCILING, 95, 'Reconciling data...');

      const reconciliationReport = await this.reconciliationAgent.execute(
        {
          domain: classificationResult.domain,
          executionResult,
          expectedRowCount: validationReport.totalRows - validationReport.errorCount,
        },
        context,
      );

      // Step 8: Learning (async, non-blocking)
      this.learningAgent
        .execute({ sessionId: session.id }, context)
        .catch((err) => this.logger.error(`Learning failed: ${err.message}`));

      // Complete workflow
      await this.updateSessionStatus(session.id, ImportSessionStatus.COMPLETED);
      onProgress?.(ImportSessionStatus.COMPLETED, 100, 'Import completed');

      this.logger.log(`Import workflow completed for session ${session.id}`);

      return {
        sessionId: session.id,
        status: ImportSessionStatus.COMPLETED,
        message: `Import completed: ${executionResult.successCount} records created, ${executionResult.failureCount} failures`,
      };
    } catch (error) {
      this.logger.error(`Import workflow failed: ${error.message}`);
      await this.updateSessionStatus(session.id, ImportSessionStatus.FAILED);
      await this.sessionRepo.update(session.id, {
        message: error.message,
      });

      return {
        sessionId: session.id,
        status: ImportSessionStatus.FAILED,
        message: `Import failed: ${error.message}`,
      };
    }
  }

  /**
   * Approve import session and continue execution
   */
  async approve(sessionId: string, userId: string): Promise<ImportResult> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== ImportSessionStatus.AWAITING_APPROVAL) {
      throw new BadRequestException('Session is not awaiting approval');
    }

    // Update approval status
    await this.sessionRepo.update(sessionId, {
      approval_status: ApprovalStatus.APPROVED,
      approved_by_user_id: userId,
      approved_at: new Date(),
    });

    const context: AgentContext = {
      sessionId,
      userId,
    };

    try {
      // Continue execution from Step 6
      await this.updateSessionStatus(sessionId, ImportSessionStatus.EXECUTING);

      const executionResult = await this.executionAgent.execute(
        session.action_plan as unknown as ActionPlan,
        context,
      );
      await this.sessionRepo.update(sessionId, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        execution_result: executionResult as any,
      });

      // Reconciliation
      await this.updateSessionStatus(sessionId, ImportSessionStatus.RECONCILING);

      await this.reconciliationAgent.execute(
        {
          domain: session.domain,
          executionResult,
          expectedRowCount:
            (session.validation_report as unknown as { totalRows?: number })?.totalRows || 0,
        },
        context,
      );

      // Learning
      this.learningAgent
        .execute({ sessionId }, context)
        .catch((err) => this.logger.error(`Learning failed: ${err.message}`));

      // Complete
      await this.updateSessionStatus(sessionId, ImportSessionStatus.COMPLETED);

      return {
        sessionId,
        status: ImportSessionStatus.COMPLETED,
        message: `Import completed: ${executionResult.successCount} records`,
      };
    } catch (error) {
      await this.updateSessionStatus(sessionId, ImportSessionStatus.FAILED);
      throw error;
    }
  }

  /**
   * Reject import session
   */
  async reject(sessionId: string, userId: string, reason: string): Promise<void> {
    await this.sessionRepo.update(sessionId, {
      approval_status: ApprovalStatus.REJECTED,
      approved_by_user_id: userId,
      approved_at: new Date(),
      status: ImportSessionStatus.CANCELLED,
      message: `Rejected: ${reason}`,
    });
  }

  /**
   * Create import session
   */
  private async createSession(userId: string): Promise<ImportSession> {
    const session = this.sessionRepo.create({
      domain: DomainType.UNKNOWN,
      status: ImportSessionStatus.PENDING,
      uploaded_by_user_id: userId,
      approval_status: ApprovalStatus.PENDING,
      started_at: new Date(),
    });

    return await this.sessionRepo.save(session);
  }

  /**
   * Update session status
   */
  private async updateSessionStatus(sessionId: string, status: ImportSessionStatus): Promise<void> {
    await this.sessionRepo.update(sessionId, { status });
  }

  /**
   * Map rows from array format to object format using column mapping
   */
  private mapRows(
    rows: unknown[][],
    headers: string[],
    columnMapping: ColumnMapping,
  ): Record<string, unknown>[] {
    return rows.map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        const mapping = columnMapping[header];
        if (mapping && mapping.field) {
          obj[mapping.field] = row[index];
        } else {
          obj[header] = row[index];
        }
      });
      return obj;
    });
  }
}
