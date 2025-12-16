import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import { ImportSession } from './entities/import-session.entity';
import { ImportTemplate } from './entities/import-template.entity';
import { SchemaDefinition } from './entities/schema-definition.entity';
import { ValidationRule } from './entities/validation-rule.entity';
import { ImportAuditLog } from './entities/import-audit-log.entity';

// Agents
import { FileIntakeAgent } from './agents/file-intake.agent';
import { ClassificationAgent } from './agents/classification.agent';
import { ValidationAgent } from './agents/validation.agent';
import { SuggestionAgent } from './agents/suggestion.agent';
import { UxApprovalAgent } from './agents/ux-approval.agent';
import { ExecutionAgent } from './agents/execution.agent';
import { ReconciliationAgent } from './agents/reconciliation.agent';
import { LearningAgent } from './agents/learning.agent';

// Workflows
import { ImportWorkflow } from './workflows/import.workflow';

// Engines
import { SchemaRegistryService } from './engines/schema-registry.service';
import { RulesEngineService } from './engines/rules-engine.service';

// Tools - Parsers
import { XlsxParser } from './tools/parsers/xlsx.parser';
import { CsvParser } from './tools/parsers/csv.parser';
import { JsonParser } from './tools/parsers/json.parser';
import { XmlParser } from './tools/parsers/xml.parser';

// Tools - Validators
import { SchemaValidator } from './tools/validators/schema.validator';
import { IntegrityValidator } from './tools/validators/integrity.validator';
import { AnomalyDetector } from './tools/validators/anomaly.detector';

// Tools - Formatters
import { DiffFormatter } from './tools/formatters/diff.formatter';
import { SummaryFormatter } from './tools/formatters/summary.formatter';

// Main service, controller, gateway
import { IntelligentImportService } from './intelligent-import.service';
import { IntelligentImportController } from './intelligent-import.controller';
import { IntelligentImportGateway } from './intelligent-import.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImportSession,
      ImportTemplate,
      SchemaDefinition,
      ValidationRule,
      ImportAuditLog,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [IntelligentImportController],
  providers: [
    // Main service
    IntelligentImportService,

    // Gateway
    IntelligentImportGateway,

    // Workflows
    ImportWorkflow,

    // Engines
    SchemaRegistryService,
    RulesEngineService,

    // Agents (8)
    FileIntakeAgent,
    ClassificationAgent,
    ValidationAgent,
    SuggestionAgent,
    UxApprovalAgent,
    ExecutionAgent,
    ReconciliationAgent,
    LearningAgent,

    // Parsers (4)
    XlsxParser,
    CsvParser,
    JsonParser,
    XmlParser,

    // Validators (3)
    SchemaValidator,
    IntegrityValidator,
    AnomalyDetector,

    // Formatters (2)
    DiffFormatter,
    SummaryFormatter,
  ],
  exports: [IntelligentImportService, IntelligentImportGateway],
})
export class IntelligentImportModule {}
