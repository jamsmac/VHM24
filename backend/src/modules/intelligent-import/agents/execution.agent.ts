import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAgent, AgentContext, AgentStatus } from '../interfaces/agent.interface';
import { ActionPlan, ExecutionResult, ActionType, Action } from '../interfaces/common.interface';
import { ImportAuditLog } from '../entities/import-audit-log.entity';

/**
 * Execution Agent
 *
 * Executes approved actions in database with transaction support
 */
@Injectable()
export class ExecutionAgent implements IAgent<ActionPlan, ExecutionResult> {
  private readonly logger = new Logger(ExecutionAgent.name);
  readonly name = 'ExecutionAgent';
  private status: AgentStatus = AgentStatus.IDLE;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ImportAuditLog)
    private readonly auditRepo: Repository<ImportAuditLog>,
  ) {}

  async execute(input: ActionPlan, context: AgentContext): Promise<ExecutionResult> {
    this.status = AgentStatus.RUNNING;

    const startTime = Date.now();

    try {
      this.logger.log(`Executing ${input.actions.length} actions`);

      const results: ExecutionResult['results'] = [];
      let successCount = 0;
      let failureCount = 0;

      // Execute in transaction
      await this.dataSource.transaction(async (manager) => {
        for (const action of input.actions) {
          try {
            let result: unknown = null;

            switch (action.type) {
              case ActionType.INSERT:
                result = await manager
                  .createQueryBuilder()
                  .insert()
                  .into(action.table)
                  .values(action.data)
                  .execute();
                break;

              case ActionType.UPDATE:
                result = await manager
                  .createQueryBuilder()
                  .update(action.table)
                  .set(action.data)
                  .where(action.conditions || {})
                  .execute();
                break;

              case ActionType.DELETE:
                result = await manager
                  .createQueryBuilder()
                  .softDelete()
                  .from(action.table)
                  .where(action.conditions || {})
                  .execute();
                break;

              case ActionType.SKIP:
                // Skip - no action
                result = { skipped: true };
                break;

              default:
                throw new Error(`Unsupported action type: ${action.type}`);
            }

            // Create audit log
            await this.createAuditLog(manager, action, context);

            results.push({
              action,
              success: true,
              result,
            });

            successCount++;
          } catch (error) {
            results.push({
              action,
              success: false,
              error: error.message,
            });

            failureCount++;
            this.logger.error(`Action failed:`, error.message);

            // For critical errors, throw to rollback transaction
            if (failureCount > 10) {
              throw new Error(`Too many failures (${failureCount}). Rolling back transaction.`);
            }
          }
        }
      });

      const duration = Date.now() - startTime;

      this.logger.log(
        `Execution complete: ${successCount} success, ${failureCount} failures in ${duration}ms`,
      );

      this.status = AgentStatus.COMPLETED;

      return {
        successCount,
        failureCount,
        results,
        duration,
      };
    } catch (error) {
      this.status = AgentStatus.FAILED;
      this.logger.error(`Execution failed:`, error);
      throw error;
    }
  }

  async validateInput(input: ActionPlan): Promise<boolean> {
    return input.actions && input.actions.length > 0;
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  private async createAuditLog(
    manager: { save: <T>(entity: { new (): T }, data: T) => Promise<T> },
    action: Action,
    context: AgentContext,
  ): Promise<void> {
    const auditLog = this.auditRepo.create({
      session_id: context.sessionId,
      action_type: action.type,
      table_name: action.table,
      before_state: action.conditions || null,
      after_state: action.data || null,
      executed_by_user_id: context.userId,
      metadata: action.metadata || null,
    });

    await manager.save(ImportAuditLog, auditLog);
  }
}
