import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAgent, AgentContext, AgentStatus } from '../interfaces/agent.interface';
import { ImportTemplate } from '../entities/import-template.entity';
import { ImportSession } from '../entities/import-session.entity';
import { DomainType, ColumnMapping } from '../interfaces/common.interface';

interface LearningInput {
  sessionId: string;
}

interface LearningOutput {
  templateCreated: boolean;
  templateId?: string;
}

/**
 * Learning Agent
 *
 * Learns from successful imports and creates/updates templates
 */
@Injectable()
export class LearningAgent implements IAgent<LearningInput, LearningOutput> {
  private readonly logger = new Logger(LearningAgent.name);
  readonly name = 'LearningAgent';
  private status: AgentStatus = AgentStatus.IDLE;

  constructor(
    @InjectRepository(ImportTemplate)
    private readonly templateRepo: Repository<ImportTemplate>,
    @InjectRepository(ImportSession)
    private readonly sessionRepo: Repository<ImportSession>,
  ) {}

  async execute(input: LearningInput, context: AgentContext): Promise<LearningOutput> {
    this.status = AgentStatus.RUNNING;

    try {
      this.logger.log(`Learning from session ${input.sessionId}`);

      // Get session data
      const session = await this.sessionRepo.findOne({
        where: { id: input.sessionId },
      });

      if (!session || !session.classification_result) {
        this.logger.log(`No classification result found, skipping learning`);
        this.status = AgentStatus.COMPLETED;
        return { templateCreated: false };
      }

      // Check if session was successful
      if (session.status !== 'completed' || session.approval_status !== 'approved') {
        this.logger.log(`Session not successful, skipping learning`);
        this.status = AgentStatus.COMPLETED;
        return { templateCreated: false };
      }

      const classificationResult = session.classification_result as unknown as {
        confidence: number;
        columnMapping: ColumnMapping;
      };

      // Check if we should create a template
      if (classificationResult.confidence < 0.9) {
        this.logger.log(
          `Confidence too low (${classificationResult.confidence}), not creating template`,
        );
        this.status = AgentStatus.COMPLETED;
        return { templateCreated: false };
      }

      // Create or update template
      const templateName = this.generateTemplateName(
        session.domain,
        (session.file_metadata as unknown as { filename?: string })?.filename,
      );

      const existingTemplate = await this.templateRepo.findOne({
        where: { name: templateName, domain: session.domain },
      });

      let template: ImportTemplate;

      if (existingTemplate) {
        // Update existing template
        existingTemplate.column_mapping = classificationResult.columnMapping;
        existingTemplate.use_count += 1;
        existingTemplate.last_used_at = new Date();
        template = await this.templateRepo.save(existingTemplate);
        this.logger.log(`Updated template: ${templateName}`);
      } else {
        // Create new template
        template = this.templateRepo.create({
          name: templateName,
          domain: session.domain,
          column_mapping: classificationResult.columnMapping,
          use_count: 1,
          last_used_at: new Date(),
        });
        template = await this.templateRepo.save(template);
        this.logger.log(`Created new template: ${templateName}`);
      }

      this.status = AgentStatus.COMPLETED;

      return {
        templateCreated: true,
        templateId: template.id,
      };
    } catch (error) {
      this.status = AgentStatus.FAILED;
      this.logger.error(`Learning failed:`, error);
      // Don't throw - learning is optional
      return { templateCreated: false };
    }
  }

  async validateInput(input: LearningInput): Promise<boolean> {
    return input.sessionId != null;
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  private generateTemplateName(domain: DomainType, filename?: string): string {
    if (filename) {
      // Extract base filename without extension and timestamp
      const baseName = filename
        .replace(/\.(xlsx?|csv|json|xml)$/i, '')
        .replace(/_?\d{4}-\d{2}-\d{2}.*$/, '')
        .replace(/_+$/, '');
      return `${domain}_${baseName}`;
    }
    return `${domain}_template_${Date.now()}`;
  }
}
