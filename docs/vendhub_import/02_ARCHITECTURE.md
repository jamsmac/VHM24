# VendHub Intelligent Import System - Architecture

> **Date**: 2025-11-17
> **Status**: Design Phase - Iteration 1
> **Version**: 1.0.0

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Module Structure](#2-module-structure)
3. [Agent Architecture](#3-agent-architecture)
4. [Workflow Engine](#4-workflow-engine)
5. [Database Schema](#5-database-schema)
6. [API Design](#6-api-design)
7. [Integration Points](#7-integration-points)
8. [Deployment Architecture](#8-deployment-architecture)

---

## 1. System Overview

### 1.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          VendHub Backend                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐          ┌──────────────────────┐         │
│  │  sales-import       │          │ intelligent-import   │         │
│  │  (legacy module)    │◄─────────│ (new AI module)      │         │
│  └─────────────────────┘          └──────────────────────┘         │
│            │                                │                       │
│            ▼                                ▼                       │
│  ┌──────────────────────────────────────────────────────┐          │
│  │              Shared Infrastructure                    │          │
│  │  • Bull Queue (import-queue)                          │          │
│  │  • File Storage (S3/MinIO)                            │          │
│  │  • PostgreSQL (shared DB)                             │          │
│  │  • Redis (cache + queue state)                        │          │
│  │  • WebSocket (realtime updates)                       │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 1.2 Design Principles

1. **Modularity**: Each agent is a separate injectable service
2. **Extensibility**: Plugin architecture for new file formats and domains
3. **Fault Tolerance**: Graceful degradation, retry logic, rollback support
4. **Observability**: Comprehensive logging, metrics, WebSocket progress
5. **Performance**: Streaming for large files, batch processing, caching
6. **Security**: RBAC for imports, audit logs, data encryption

---

## 2. Module Structure

### 2.1 Directory Layout

```
backend/src/modules/intelligent-import/
├── agents/                                 # Agent implementations
│   ├── file-intake.agent.ts
│   ├── classification.agent.ts
│   ├── validation.agent.ts
│   ├── suggestion.agent.ts
│   ├── ux-approval.agent.ts
│   ├── execution.agent.ts
│   ├── reconciliation.agent.ts
│   └── learning.agent.ts
│
├── workflows/                              # Workflow definitions
│   ├── import.workflow.ts                  # Main import pipeline
│   ├── template-learning.workflow.ts       # Self-improvement
│   ├── incremental-update.workflow.ts      # Daily updates
│   └── reconciliation.workflow.ts          # Consistency checks
│
├── engines/                                # Core engines
│   ├── schema-registry.service.ts          # Dynamic schemas
│   ├── rules-engine.service.ts             # Business rules
│   └── ml-engine.service.ts                # ML models (optional)
│
├── tools/                                  # Shared utilities
│   ├── parsers/
│   │   ├── xlsx.parser.ts
│   │   ├── csv.parser.ts
│   │   ├── json.parser.ts
│   │   └── xml.parser.ts
│   ├── validators/
│   │   ├── schema.validator.ts
│   │   ├── integrity.validator.ts
│   │   └── anomaly.detector.ts
│   └── formatters/
│       ├── diff.formatter.ts
│       └── summary.formatter.ts
│
├── entities/                               # Database entities
│   ├── import-session.entity.ts
│   ├── import-template.entity.ts
│   ├── schema-definition.entity.ts
│   ├── validation-rule.entity.ts
│   ├── audit-log.entity.ts
│   └── ml-model.entity.ts
│
├── dto/                                    # Data Transfer Objects
│   ├── create-import.dto.ts
│   ├── classify-data.dto.ts
│   ├── validation-result.dto.ts
│   ├── action-plan.dto.ts
│   ├── import-summary.dto.ts
│   └── approval-request.dto.ts
│
├── processors/                             # Bull queue processors
│   ├── import.processor.ts                 # Main workflow processor
│   ├── learning.processor.ts               # Template learning
│   └── reconciliation.processor.ts         # Reconciliation
│
├── interfaces/                             # TypeScript interfaces
│   ├── agent.interface.ts
│   ├── workflow.interface.ts
│   ├── parsed-data.interface.ts
│   └── action.interface.ts
│
├── guards/                                 # Security guards
│   └── import-permission.guard.ts
│
├── intelligent-import.controller.ts        # REST API
├── intelligent-import.service.ts           # Main orchestrator
├── intelligent-import.module.ts            # Module definition
└── intelligent-import.gateway.ts           # WebSocket gateway
```

### 2.2 Core Module Definition

```typescript
// intelligent-import.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImportSession,
      ImportTemplate,
      SchemaDefinition,
      ValidationRule,
      AuditLog,
      MLModel,
    ]),
    BullModule.registerQueue({
      name: 'import-queue',
    }),
    // Existing modules for integration
    forwardRef(() => MachinesModule),
    forwardRef(() => TransactionsModule),
    forwardRef(() => InventoryModule),
    forwardRef(() => NomenclatureModule),
    FilesModule,
    WebsocketModule,
  ],
  controllers: [IntelligentImportController],
  providers: [
    IntelligentImportService,
    IntelligentImportGateway,

    // Agents
    FileIntakeAgent,
    ClassificationAgent,
    ValidationAgent,
    SuggestionAgent,
    UxApprovalAgent,
    ExecutionAgent,
    ReconciliationAgent,
    LearningAgent,

    // Workflows
    ImportWorkflow,
    TemplateLearningWorkflow,
    IncrementalUpdateWorkflow,
    ReconciliationWorkflow,

    // Engines
    SchemaRegistryService,
    RulesEngineService,
    MLEngineService,

    // Tools
    XlsxParser,
    CsvParser,
    JsonParser,
    XmlParser,
    SchemaValidator,
    IntegrityValidator,
    AnomalyDetector,
    DiffFormatter,
    SummaryFormatter,

    // Processors
    ImportProcessor,
    LearningProcessor,
    ReconciliationProcessor,
  ],
  exports: [IntelligentImportService],
})
export class IntelligentImportModule {}
```

---

## 3. Agent Architecture

### 3.1 Base Agent Interface

```typescript
// interfaces/agent.interface.ts
export interface IAgent<TInput, TOutput> {
  /**
   * Agent name for logging and tracking
   */
  readonly name: string;

  /**
   * Execute agent's primary task
   */
  execute(input: TInput, context: AgentContext): Promise<TOutput>;

  /**
   * Validate input before processing
   */
  validateInput(input: TInput): Promise<boolean>;

  /**
   * Get agent's current status
   */
  getStatus(): AgentStatus;
}

export interface AgentContext {
  sessionId: string;
  userId: string;
  metadata?: Record<string, any>;
  abortSignal?: AbortSignal;
}

export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
```

### 3.2 Agent Implementations

#### Agent 1: File Intake Agent

```typescript
// agents/file-intake.agent.ts
@Injectable()
export class FileIntakeAgent implements IAgent<FileUpload, ParsedFile> {
  readonly name = 'FileIntakeAgent';

  constructor(
    private readonly xlsxParser: XlsxParser,
    private readonly csvParser: CsvParser,
    private readonly jsonParser: JsonParser,
    private readonly xmlParser: XmlParser,
  ) {}

  async execute(
    input: FileUpload,
    context: AgentContext,
  ): Promise<ParsedFile> {
    const fileType = this.detectFileType(input.filename, input.mimetype);

    const parser = this.getParser(fileType);
    const tables = await parser.parse(input.buffer);

    const metadata: FileMetadata = {
      filename: input.filename,
      size: input.size,
      mimetype: input.mimetype,
      encoding: await this.detectEncoding(input.buffer),
      checksum: this.calculateChecksum(input.buffer),
      rowCount: tables.reduce((sum, t) => sum + t.rows.length, 0),
      columnCount: tables[0]?.headers.length || 0,
    };

    return {
      fileType,
      tables,
      metadata,
    };
  }

  private detectFileType(filename: string, mimetype: string): FileType {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls' || mimetype.includes('spreadsheet')) {
      return FileType.EXCEL;
    }
    if (ext === 'csv' || mimetype === 'text/csv') {
      return FileType.CSV;
    }
    if (ext === 'json' || mimetype === 'application/json') {
      return FileType.JSON;
    }
    if (ext === 'xml' || mimetype.includes('xml')) {
      return FileType.XML;
    }

    throw new BadRequestException(`Unsupported file type: ${ext}`);
  }

  // ... other methods
}
```

#### Agent 2: Classification Agent

```typescript
// agents/classification.agent.ts
@Injectable()
export class ClassificationAgent implements IAgent<ParsedFile, ClassificationResult> {
  readonly name = 'ClassificationAgent';

  constructor(
    private readonly schemaRegistry: SchemaRegistryService,
    private readonly mlEngine: MLEngineService,
  ) {}

  async execute(
    input: ParsedFile,
    context: AgentContext,
  ): Promise<ClassificationResult> {
    const table = input.tables[0]; // Primary table

    // Step 1: Detect domain using ML
    const domain = await this.detectDomain(table.headers, table.rows.slice(0, 10));

    // Step 2: Get schema for detected domain
    const schema = await this.schemaRegistry.getSchema(domain);

    // Step 3: Map columns to schema fields
    const columnMapping = await this.mapColumns(table.headers, schema);

    // Step 4: Detect relationships
    const relationships = await this.detectRelationships(table.rows, schema);

    // Step 5: Infer data types
    const dataTypes = await this.inferDataTypes(table.rows, columnMapping);

    return {
      domain,
      confidence: columnMapping.confidence,
      columnMapping: columnMapping.mapping,
      dataTypes,
      relationships,
      suggestedTemplate: await this.findMatchingTemplate(domain, columnMapping),
    };
  }

  private async detectDomain(
    headers: string[],
    sampleRows: any[][],
  ): Promise<DomainType> {
    // Use ML model for classification
    const features = this.extractFeatures(headers, sampleRows);
    const prediction = await this.mlEngine.classifyDomain(features);

    // Fallback to rule-based if confidence < 70%
    if (prediction.confidence < 0.7) {
      return this.ruleBasedDomainDetection(headers);
    }

    return prediction.domain;
  }

  private async mapColumns(
    headers: string[],
    schema: SchemaDefinition,
  ): Promise<{ mapping: ColumnMapping; confidence: number }> {
    const mapping: ColumnMapping = {};
    let totalConfidence = 0;

    for (const header of headers) {
      const bestMatch = await this.findBestFieldMatch(header, schema.fields);
      mapping[header] = {
        field: bestMatch.field,
        confidence: bestMatch.confidence,
        transform: bestMatch.transform,
      };
      totalConfidence += bestMatch.confidence;
    }

    return {
      mapping,
      confidence: totalConfidence / headers.length,
    };
  }

  private async findBestFieldMatch(
    header: string,
    fields: SchemaField[],
  ): Promise<FieldMatch> {
    // 1. Exact match
    const exactMatch = fields.find(f => f.name.toLowerCase() === header.toLowerCase());
    if (exactMatch) {
      return { field: exactMatch.name, confidence: 1.0, transform: null };
    }

    // 2. Synonym match
    for (const field of fields) {
      if (field.synonyms?.some(s => s.toLowerCase() === header.toLowerCase())) {
        return { field: field.name, confidence: 0.95, transform: null };
      }
    }

    // 3. Fuzzy match (Levenshtein distance)
    const fuzzyMatches = fields.map(f => ({
      field: f,
      distance: this.calculateDistance(header, f.name),
    }));
    fuzzyMatches.sort((a, b) => a.distance - b.distance);

    const bestFuzzy = fuzzyMatches[0];
    if (bestFuzzy.distance < 5) {
      return {
        field: bestFuzzy.field.name,
        confidence: 1 - (bestFuzzy.distance / 10),
        transform: null,
      };
    }

    // 4. No match found
    return { field: null, confidence: 0, transform: null };
  }

  // ... other methods
}
```

#### Agent 3: Validation Agent

```typescript
// agents/validation.agent.ts
@Injectable()
export class ValidationAgent implements IAgent<ClassifiedData, ValidationReport> {
  readonly name = 'ValidationAgent';

  constructor(
    private readonly rulesEngine: RulesEngineService,
    private readonly schemaValidator: SchemaValidator,
    private readonly integrityValidator: IntegrityValidator,
    private readonly anomalyDetector: AnomalyDetector,
    @InjectRepository(Machine) private machineRepo: Repository<Machine>,
    @InjectRepository(Nomenclature) private nomenclatureRepo: Repository<Nomenclature>,
  ) {}

  async execute(
    input: ClassifiedData,
    context: AgentContext,
  ): Promise<ValidationReport> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    // Step 1: Schema validation
    const schemaErrors = await this.schemaValidator.validate(
      input.rows,
      input.schema,
    );
    errors.push(...schemaErrors);

    // Step 2: Business rules validation
    const rules = await this.rulesEngine.getRules(input.domain);
    for (let i = 0; i < input.rows.length; i++) {
      const row = input.rows[i];
      const ruleResults = await this.rulesEngine.validate(row, rules);

      errors.push(...ruleResults.errors.map(e => ({ ...e, rowIndex: i })));
      warnings.push(...ruleResults.warnings.map(w => ({ ...w, rowIndex: i })));
    }

    // Step 3: Referential integrity
    const integrityIssues = await this.checkIntegrity(input.rows, input.domain);
    warnings.push(...integrityIssues);

    // Step 4: Anomaly detection
    const anomalies = await this.detectAnomalies(input.rows, input.columnMapping);
    info.push(...anomalies);

    // Step 5: Duplicate detection
    const duplicates = await this.findDuplicates(input.rows, input.domain);
    warnings.push(...duplicates);

    return {
      totalRows: input.rows.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      infoCount: info.length,
      errors,
      warnings,
      info,
      isValid: errors.length === 0,
      canProceed: errors.length < input.rows.length * 0.1, // < 10% errors
    };
  }

  private async checkIntegrity(
    rows: any[],
    domain: DomainType,
  ): Promise<ValidationWarning[]> {
    const warnings: ValidationWarning[] = [];

    if (domain === DomainType.SALES) {
      // Check if machines exist
      const machineNumbers = [...new Set(rows.map(r => r.machine_number))];
      const existingMachines = await this.machineRepo.find({
        where: { machine_number: In(machineNumbers) },
        select: ['machine_number'],
      });
      const existingSet = new Set(existingMachines.map(m => m.machine_number));

      const missingMachines = machineNumbers.filter(m => !existingSet.has(m));
      if (missingMachines.length > 0) {
        warnings.push({
          severity: 'warning',
          code: 'MISSING_MACHINES',
          message: `${missingMachines.length} machines not found: ${missingMachines.slice(0, 5).join(', ')}${missingMachines.length > 5 ? '...' : ''}`,
          affectedRows: rows
            .map((r, i) => ({ row: r, index: i }))
            .filter(({ row }) => missingMachines.includes(row.machine_number))
            .map(({ index }) => index),
        });
      }

      // Check if products exist
      const productNames = [
        ...new Set(rows.map(r => r.product_name).filter(Boolean)),
      ];
      if (productNames.length > 0) {
        const existingProducts = await this.nomenclatureRepo.find({
          where: { name: In(productNames) },
          select: ['name'],
        });
        const existingProductSet = new Set(existingProducts.map(p => p.name));

        const missingProducts = productNames.filter(p => !existingProductSet.has(p));
        if (missingProducts.length > 0) {
          warnings.push({
            severity: 'info',
            code: 'MISSING_PRODUCTS',
            message: `${missingProducts.length} products not found (will create if approved): ${missingProducts.slice(0, 5).join(', ')}`,
            affectedRows: [],
          });
        }
      }
    }

    return warnings;
  }

  // ... other methods
}
```

#### Agent 4-8: Similar Structure

*See implementation files for full code*

---

## 4. Workflow Engine

### 4.1 Workflow Interface

```typescript
// interfaces/workflow.interface.ts
export interface IWorkflow<TInput, TOutput> {
  readonly name: string;
  readonly steps: WorkflowStep[];

  execute(input: TInput, context: WorkflowContext): Promise<TOutput>;
  getProgress(): WorkflowProgress;
  pause(): Promise<void>;
  resume(): Promise<void>;
  cancel(): Promise<void>;
}

export interface WorkflowStep {
  name: string;
  agent: IAgent<any, any>;
  condition?: (context: WorkflowContext) => boolean;
  onSuccess?: (result: any, context: WorkflowContext) => Promise<void>;
  onError?: (error: Error, context: WorkflowContext) => Promise<void>;
}

export interface WorkflowContext extends AgentContext {
  sessionId: string;
  currentStep: number;
  results: Map<string, any>;
  errors: Error[];
}
```

### 4.2 Main Import Workflow

```typescript
// workflows/import.workflow.ts
@Injectable()
export class ImportWorkflow implements IWorkflow<FileUpload, ImportResult> {
  readonly name = 'import_workflow';
  readonly steps: WorkflowStep[];

  constructor(
    private readonly fileIntakeAgent: FileIntakeAgent,
    private readonly classificationAgent: ClassificationAgent,
    private readonly validationAgent: ValidationAgent,
    private readonly suggestionAgent: SuggestionAgent,
    private readonly uxApprovalAgent: UxApprovalAgent,
    private readonly executionAgent: ExecutionAgent,
    private readonly reconciliationAgent: ReconciliationAgent,
    private readonly learningAgent: LearningAgent,
    @InjectRepository(ImportSession)
    private readonly sessionRepo: Repository<ImportSession>,
    private readonly gateway: IntelligentImportGateway,
  ) {
    this.steps = [
      {
        name: 'file_intake',
        agent: this.fileIntakeAgent,
        onSuccess: async (result, context) => {
          await this.updateSessionStatus(context.sessionId, 'parsed');
          this.gateway.emitProgress(context.sessionId, 'file_intake', 100);
        },
      },
      {
        name: 'classification',
        agent: this.classificationAgent,
        onSuccess: async (result, context) => {
          await this.updateSessionStatus(context.sessionId, 'classified');
          this.gateway.emitProgress(context.sessionId, 'classification', 100);
        },
      },
      {
        name: 'validation',
        agent: this.validationAgent,
        onSuccess: async (result, context) => {
          await this.updateSessionStatus(context.sessionId, 'validated');
          this.gateway.emitProgress(context.sessionId, 'validation', 100);
        },
      },
      {
        name: 'suggestion',
        agent: this.suggestionAgent,
        condition: (context) => {
          const validationResult = context.results.get('validation');
          return validationResult?.warnings?.some(w => w.code === 'MISSING_MACHINES' || w.code === 'MISSING_PRODUCTS');
        },
      },
      {
        name: 'ux_approval',
        agent: this.uxApprovalAgent,
        onSuccess: async (result, context) => {
          await this.updateSessionStatus(context.sessionId, 'awaiting_approval');
          this.gateway.emitApprovalRequest(context.sessionId, result);
          // PAUSE WORKFLOW HERE - wait for user approval
          await this.waitForApproval(context.sessionId);
        },
      },
      {
        name: 'execution',
        agent: this.executionAgent,
        condition: (context) => {
          return context.results.get('approval_status') === 'approved';
        },
        onSuccess: async (result, context) => {
          await this.updateSessionStatus(context.sessionId, 'executing');
        },
      },
      {
        name: 'reconciliation',
        agent: this.reconciliationAgent,
        onSuccess: async (result, context) => {
          await this.updateSessionStatus(context.sessionId, 'completed');
        },
      },
      {
        name: 'learning',
        agent: this.learningAgent,
        onError: async (error, context) => {
          // Learning is optional - don't fail workflow if it fails
          console.error('Learning agent failed:', error);
        },
      },
    ];
  }

  async execute(
    input: FileUpload,
    context: WorkflowContext,
  ): Promise<ImportResult> {
    context.currentStep = 0;

    for (const step of this.steps) {
      try {
        // Check condition
        if (step.condition && !step.condition(context)) {
          console.log(`Skipping step ${step.name} (condition not met)`);
          continue;
        }

        // Get input for this step
        const stepInput = this.getStepInput(step.name, context);

        // Execute agent
        console.log(`Executing step ${step.name}...`);
        const result = await step.agent.execute(stepInput, context);

        // Store result
        context.results.set(step.name, result);

        // Call onSuccess hook
        if (step.onSuccess) {
          await step.onSuccess(result, context);
        }

        context.currentStep++;
      } catch (error) {
        console.error(`Step ${step.name} failed:`, error);
        context.errors.push(error);

        // Call onError hook
        if (step.onError) {
          await step.onError(error, context);
        } else {
          // Default: fail workflow
          throw error;
        }
      }
    }

    return {
      sessionId: context.sessionId,
      status: 'completed',
      results: Object.fromEntries(context.results),
      errors: context.errors,
    };
  }

  private getStepInput(stepName: string, context: WorkflowContext): any {
    switch (stepName) {
      case 'file_intake':
        return context.metadata.fileUpload;
      case 'classification':
        return context.results.get('file_intake');
      case 'validation':
        return {
          ...context.results.get('classification'),
          rows: context.results.get('file_intake').tables[0].rows,
        };
      case 'suggestion':
        return {
          validationReport: context.results.get('validation'),
          classificationResult: context.results.get('classification'),
        };
      case 'ux_approval':
        return {
          validationReport: context.results.get('validation'),
          suggestions: context.results.get('suggestion'),
        };
      case 'execution':
        return {
          actionPlan: context.results.get('ux_approval').actionPlan,
          rows: context.results.get('file_intake').tables[0].rows,
        };
      case 'reconciliation':
        return {
          executionResult: context.results.get('execution'),
          domain: context.results.get('classification').domain,
        };
      case 'learning':
        return {
          session: context,
        };
      default:
        return null;
    }
  }

  private async waitForApproval(sessionId: string): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (session.approval_status === 'approved' || session.approval_status === 'rejected') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000); // Check every second
    });
  }

  // ... other methods
}
```

---

## 5. Database Schema

### 5.1 Entity Relationship Diagram

```
┌─────────────────────┐
│   import_sessions   │
├─────────────────────┤
│ id (PK)             │
│ domain              │◄──────┐
│ status              │       │
│ template_id (FK)    │───────┼─────┐
│ uploaded_by (FK)    │       │     │
│ approved_by (FK)    │       │     │
│ ...                 │       │     │
└─────────────────────┘       │     │
         │                    │     │
         │ 1:N                │     │
         ▼                    │     │
┌─────────────────────┐       │     │
│ import_audit_log    │       │     │
├─────────────────────┤       │     │
│ id (PK)             │       │     │
│ session_id (FK)     │       │     │
│ action_type         │       │     │
│ table_name          │       │     │
│ before_state        │       │     │
│ after_state         │       │     │
└─────────────────────┘       │     │
                              │     │
┌─────────────────────┐       │     │
│ import_templates    │◄──────┘     │
├─────────────────────┤             │
│ id (PK)             │             │
│ name                │             │
│ domain              │             │
│ column_mapping      │             │
│ use_count           │             │
└─────────────────────┘             │
                                    │
┌─────────────────────┐             │
│ schema_registry     │◄────────────┘
├─────────────────────┤
│ id (PK)             │
│ domain              │
│ table_name          │
│ field_definitions   │
│ relationships       │
└─────────────────────┘
         │ 1:N
         ▼
┌─────────────────────┐
│ validation_rules    │
├─────────────────────┤
│ id (PK)             │
│ domain              │
│ rule_name           │
│ rule_type           │
│ rule_definition     │
│ severity            │
└─────────────────────┘
```

### 5.2 Migration Files

*See `/home/user/VendHub/backend/src/database/migrations/` for full migrations*

---

## 6. API Design

### 6.1 REST Endpoints

```typescript
// intelligent-import.controller.ts

@ApiTags('Intelligent Import')
@Controller('intelligent-import')
export class IntelligentImportController {

  /**
   * Upload file and start import workflow
   * POST /intelligent-import/upload
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadImportDto,
    @Request() req,
  ): Promise<{ sessionId: string; status: string }>;

  /**
   * Get import session details
   * GET /intelligent-import/sessions/:id
   */
  @Get('sessions/:id')
  async getSession(@Param('id') id: string): Promise<ImportSession>;

  /**
   * Approve/reject import
   * POST /intelligent-import/sessions/:id/approve
   */
  @Post('sessions/:id/approve')
  async approveImport(
    @Param('id') id: string,
    @Body() dto: ApprovalDto,
    @Request() req,
  ): Promise<ImportSession>;

  /**
   * Get all import sessions (with filters)
   * GET /intelligent-import/sessions
   */
  @Get('sessions')
  async getAllSessions(
    @Query() filters: ImportSessionFilters,
  ): Promise<ImportSession[]>;

  /**
   * Retry failed import
   * POST /intelligent-import/sessions/:id/retry
   */
  @Post('sessions/:id/retry')
  async retryImport(@Param('id') id: string): Promise<ImportSession>;

  /**
   * Get templates
   * GET /intelligent-import/templates
   */
  @Get('templates')
  async getTemplates(@Query('domain') domain?: string): Promise<ImportTemplate[]>;

  /**
   * Run reconciliation
   * POST /intelligent-import/reconcile
   */
  @Post('reconcile')
  async runReconciliation(
    @Body() dto: ReconciliationDto,
  ): Promise<ReconciliationReport>;
}
```

### 6.2 WebSocket Events

```typescript
// intelligent-import.gateway.ts

@WebSocketGateway({ namespace: '/intelligent-import' })
export class IntelligentImportGateway {

  /**
   * Client subscribes to session updates
   * subscribe:session { sessionId }
   */
  @SubscribeMessage('subscribe:session')
  handleSubscribeSession(client: Socket, sessionId: string);

  /**
   * Emit progress update
   * session:progress { sessionId, step, progress, message }
   */
  emitProgress(sessionId: string, step: string, progress: number);

  /**
   * Emit approval request
   * session:approval-request { sessionId, summary, diff, actions }
   */
  emitApprovalRequest(sessionId: string, data: ApprovalRequest);

  /**
   * Emit completion
   * session:completed { sessionId, result }
   */
  emitCompleted(sessionId: string, result: ImportResult);

  /**
   * Emit error
   * session:error { sessionId, error }
   */
  emitError(sessionId: string, error: Error);
}
```

---

## 7. Integration Points

### 7.1 With Existing Modules

| **Module** | **Integration Type** | **Purpose** |
|-----------|---------------------|-------------|
| `machines` | Read/Write | Check machine existence, create new machines |
| `transactions` | Write | Create transaction records |
| `nomenclature` | Read/Write | Check product existence, create new products |
| `inventory` | Read/Write | Update inventory levels |
| `users` | Read | Get user info for audit logs |
| `files` | Write | Store uploaded files in S3/MinIO |
| `websocket` | Pub/Sub | Real-time progress updates |
| `sales-import` | Read | Analyze historical imports for learning |

### 7.2 External Systems (Future)

- **Telegram Bot**: Send approval requests via Telegram
- **Email**: Notification system for completed imports
- **Slack/Discord**: Webhook integrations for alerts

---

## 8. Deployment Architecture

### 8.1 Production Setup

```
┌──────────────────────────────────────────────────────────┐
│                      Load Balancer                        │
└────────────────────┬─────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  NestJS App 1   │     │  NestJS App 2   │
│  (API Server)   │     │  (API Server)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
     ▼               ▼               ▼
┌─────────┐   ┌───────────┐   ┌──────────┐
│PostgreSQL│   │   Redis   │   │  MinIO   │
│ Primary  │   │ (Queue +  │   │ (Object  │
│          │   │  Cache)   │   │ Storage) │
└─────────┘   └───────────┘   └──────────┘
     │
     ▼
┌─────────┐
│PostgreSQL│
│ Replica  │
└─────────┘
```

### 8.2 Scaling Strategy

1. **Horizontal Scaling**: Run multiple NestJS instances behind load balancer
2. **Queue Workers**: Dedicated workers for Bull queue processing
3. **Database**: PostgreSQL with read replicas
4. **Caching**: Redis for session state and template caching
5. **File Storage**: S3-compatible storage with CDN

---

**End of Architecture Document**
