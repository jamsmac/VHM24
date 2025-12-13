import { Injectable, Logger } from '@nestjs/common';
import { IAgent, AgentContext, AgentStatus, ClassifiedData } from '../interfaces/agent.interface';
import { ValidationReport, ValidationError } from '../interfaces/common.interface';
import { RulesEngineService } from '../engines/rules-engine.service';
import { SchemaValidator } from '../tools/validators/schema.validator';
import { IntegrityValidator } from '../tools/validators/integrity.validator';
import { AnomalyDetector } from '../tools/validators/anomaly.detector';
import { SchemaField } from '../engines/schema-registry.service';

/**
 * Validation Agent
 *
 * Validates data against schemas, business rules, and integrity constraints
 */
@Injectable()
export class ValidationAgent implements IAgent<ClassifiedData, ValidationReport> {
  private readonly logger = new Logger(ValidationAgent.name);
  readonly name = 'ValidationAgent';
  private status: AgentStatus = AgentStatus.IDLE;

  constructor(
    private readonly rulesEngine: RulesEngineService,
    private readonly schemaValidator: SchemaValidator,
    private readonly integrityValidator: IntegrityValidator,
    private readonly anomalyDetector: AnomalyDetector,
  ) {}

  /**
   * Execute validation
   */
  async execute(input: ClassifiedData, _context: AgentContext): Promise<ValidationReport> {
    this.status = AgentStatus.RUNNING;

    try {
      this.logger.log(`Validating ${input.rows.length} rows for ${input.domain} domain`);

      const allErrors: ValidationError[] = [];
      const allWarnings: ValidationError[] = [];
      const allInfo: ValidationError[] = [];

      // Step 1: Schema validation
      this.logger.log(`Running schema validation...`);
      const schemaErrors = await this.schemaValidator.validate(
        input.rows,
        input.schema.fields as SchemaField[],
      );
      this.categorizeErrors(schemaErrors, allErrors, allWarnings, allInfo);
      this.logger.log(`Schema validation: ${schemaErrors.length} issues found`);

      // Step 2: Business rules validation
      this.logger.log(`Running business rules validation...`);
      const rules = await this.rulesEngine.getRules(input.domain);
      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i];
        const ruleResult = await this.rulesEngine.validate(row, rules);

        // Set row index for errors
        ruleResult.errors.forEach((e) => (e.rowIndex = i));
        ruleResult.warnings.forEach((w) => (w.rowIndex = i));

        this.categorizeErrors(ruleResult.errors, allErrors, allWarnings, allInfo);
        this.categorizeErrors(ruleResult.warnings, allErrors, allWarnings, allInfo);
      }
      this.logger.log(
        `Business rules validation: ${allErrors.length} errors, ${allWarnings.length} warnings`,
      );

      // Step 3: Referential integrity validation
      this.logger.log(`Running integrity validation...`);
      const integrityErrors = await this.integrityValidator.checkForeignKeys(
        input.rows,
        input.schema.relationships,
      );
      this.categorizeErrors(integrityErrors, allErrors, allWarnings, allInfo);
      this.logger.log(`Integrity validation: ${integrityErrors.length} issues found`);

      // Step 4: Anomaly detection
      this.logger.log(`Running anomaly detection...`);
      const anomalies = this.anomalyDetector.detectAllAnomalies(
        input.rows,
        input.schema.fields.map((f: SchemaField) => ({ name: f.name, type: f.type })),
      );
      this.categorizeErrors(anomalies, allErrors, allWarnings, allInfo);
      this.logger.log(`Anomaly detection: ${anomalies.length} anomalies found`);

      // Step 5: Compile report
      const report: ValidationReport = {
        totalRows: input.rows.length,
        errorCount: allErrors.length,
        warningCount: allWarnings.length,
        infoCount: allInfo.length,
        errors: allErrors,
        warnings: allWarnings,
        info: allInfo,
        isValid: allErrors.length === 0,
        canProceed: allErrors.length < input.rows.length * 0.1, // < 10% errors
      };

      this.logger.log(
        `Validation complete: ${report.errorCount} errors, ${report.warningCount} warnings, ${report.infoCount} info`,
      );
      this.logger.log(`Can proceed: ${report.canProceed}`);

      this.status = AgentStatus.COMPLETED;

      return report;
    } catch (error) {
      this.status = AgentStatus.FAILED;
      this.logger.error(`Validation failed:`, error);
      throw error;
    }
  }

  /**
   * Validate input
   */
  async validateInput(input: ClassifiedData): Promise<boolean> {
    if (!input.rows || input.rows.length === 0) {
      throw new Error('No rows to validate');
    }

    if (!input.schema) {
      throw new Error('Schema is required for validation');
    }

    return true;
  }

  /**
   * Get current status
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Categorize errors by severity
   */
  private categorizeErrors(
    errors: ValidationError[],
    allErrors: ValidationError[],
    allWarnings: ValidationError[],
    allInfo: ValidationError[],
  ): void {
    for (const error of errors) {
      switch (error.severity) {
        case 'error':
          allErrors.push(error);
          break;
        case 'warning':
          allWarnings.push(error);
          break;
        case 'info':
          allInfo.push(error);
          break;
      }
    }
  }
}
