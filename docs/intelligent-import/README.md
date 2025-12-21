# Intelligent Import Documentation

> **Модуль**: `backend/src/modules/intelligent-import/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-21

---

## Обзор

Интеллектуальная система импорта данных с автоматической классификацией, валидацией и самообучением. Поддерживает множество форматов и доменов, использует 8-агентную архитектуру для обработки.

```
┌─────────────────────────────────────────────────────────────────────┐
│                 INTELLIGENT IMPORT SYSTEM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    8-AGENT PIPELINE                            │  │
│  │                                                                │  │
│  │  1. FileIntakeAgent ──► Parse Excel/CSV/JSON/XML              │  │
│  │          │                                                     │  │
│  │          ▼                                                     │  │
│  │  2. ClassificationAgent ──► Detect Domain + Column Mapping    │  │
│  │          │                                                     │  │
│  │          ▼                                                     │  │
│  │  3. ValidationAgent ──► Validate Against Schema               │  │
│  │          │                                                     │  │
│  │          ▼                                                     │  │
│  │  4. SuggestionAgent ──► Generate Action Plan                  │  │
│  │          │                                                     │  │
│  │          ▼                                                     │  │
│  │  5. UxApprovalAgent ──► Auto/Manual Approval                  │  │
│  │          │                                                     │  │
│  │          ▼                                                     │  │
│  │  6. ExecutionAgent ──► Insert/Update/Merge Records            │  │
│  │          │                                                     │  │
│  │          ▼                                                     │  │
│  │  7. ReconciliationAgent ──► Verify Data Integrity             │  │
│  │          │                                                     │  │
│  │          ▼                                                     │  │
│  │  8. LearningAgent ──► Save Template for Future Imports        │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  SUPPORTED FORMATS                             │  │
│  │  ├── Excel (.xlsx, .xls)                                      │  │
│  │  ├── CSV (.csv)                                               │  │
│  │  ├── JSON (.json)                                             │  │
│  │  └── XML (.xml)                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  SUPPORTED DOMAINS (14)                        │  │
│  │  sales, inventory, machines, equipment, hr, billing,          │  │
│  │  locations, nomenclature, tasks, transactions,                │  │
│  │  counterparties, recipes, opening_balances, purchase_history  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Enums

### DomainType

14 поддерживаемых доменов:

```typescript
export enum DomainType {
  SALES = 'sales',                       // Продажи
  INVENTORY = 'inventory',               // Инвентарь
  MACHINES = 'machines',                 // Аппараты
  EQUIPMENT = 'equipment',               // Оборудование
  HR = 'hr',                             // Кадры
  BILLING = 'billing',                   // Биллинг
  LOCATIONS = 'locations',               // Локации
  NOMENCLATURE = 'nomenclature',         // Номенклатура
  TASKS = 'tasks',                       // Задачи
  TRANSACTIONS = 'transactions',         // Транзакции
  COUNTERPARTIES = 'counterparties',     // Контрагенты
  RECIPES = 'recipes',                   // Рецепты
  OPENING_BALANCES = 'opening_balances', // Вступительные остатки
  PURCHASE_HISTORY = 'purchase_history', // История закупок
  UNKNOWN = 'unknown',                   // Неизвестный
}
```

### FileType

```typescript
export enum FileType {
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
}
```

### ImportSessionStatus

16 статусов сессии:

```typescript
export enum ImportSessionStatus {
  PENDING = 'pending',
  PARSING = 'parsing',
  PARSED = 'parsed',
  CLASSIFYING = 'classifying',
  CLASSIFIED = 'classified',
  VALIDATING = 'validating',
  VALIDATED = 'validated',
  SUGGESTING = 'suggesting',
  AWAITING_APPROVAL = 'awaiting_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXECUTING = 'executing',
  RECONCILING = 'reconciling',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
```

### ApprovalStatus

```typescript
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  AUTO_APPROVED = 'auto_approved',
}
```

### ActionType

```typescript
export enum ActionType {
  INSERT = 'insert',   // Новая запись
  UPDATE = 'update',   // Обновление существующей
  MERGE = 'merge',     // Слияние с существующей
  SKIP = 'skip',       // Пропустить
  DELETE = 'delete',   // Удалить
}
```

### ValidationSeverity

```typescript
export enum ValidationSeverity {
  ERROR = 'error',     // Критическая ошибка
  WARNING = 'warning', // Предупреждение
  INFO = 'info',       // Информация
}
```

### RuleType

```typescript
export enum RuleType {
  RANGE = 'range',           // Диапазон значений
  REGEX = 'regex',           // Регулярное выражение
  ENUM = 'enum',             // Допустимые значения
  REQUIRED = 'required',     // Обязательное поле
  UNIQUE = 'unique',         // Уникальность
  FOREIGN_KEY = 'foreign_key', // Внешний ключ
  CUSTOM = 'custom',         // Кастомное правило
}
```

---

## Entities

### ImportSession Entity

```typescript
@Entity('import_sessions')
export class ImportSession extends BaseEntity {
  @Column({ type: 'enum', enum: DomainType })
  domain: DomainType;

  @Column({ type: 'enum', enum: ImportSessionStatus, default: ImportSessionStatus.PENDING })
  status: ImportSessionStatus;

  @Column({ type: 'uuid', nullable: true })
  template_id: string | null;

  @ManyToOne(() => ImportTemplate, { nullable: true })
  template: ImportTemplate | null;

  @Column({ type: 'jsonb', nullable: true })
  file_metadata: {
    filename: string;
    size: number;
    mimetype: string;
    encoding: string;
    checksum: string;
    rowCount: number;
    columnCount: number;
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  classification_result: {
    domain: DomainType;
    confidence: number;
    columnMapping: Record<string, any>;
    dataTypes: Record<string, string>;
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  validation_report: {
    totalRows: number;
    errorCount: number;
    warningCount: number;
    errors: ValidationError[];
    warnings: ValidationError[];
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  action_plan: {
    actions: Action[];
    summary: { insertCount: number; updateCount: number };
  } | null;

  @Column({ type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING })
  approval_status: ApprovalStatus;

  @Column({ type: 'uuid', nullable: true })
  approved_by_user_id: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  execution_result: {
    successCount: number;
    failureCount: number;
    duration: number;
  } | null;

  @Column({ type: 'uuid' })
  uploaded_by_user_id: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'uuid', nullable: true })
  file_id: string | null;

  @OneToMany(() => ImportAuditLog, (log) => log.session)
  audit_logs: ImportAuditLog[];
}
```

### ImportTemplate Entity

```typescript
@Entity('import_templates')
export class ImportTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'enum', enum: DomainType })
  domain: DomainType;

  @Column({ type: 'jsonb' })
  column_mapping: {
    [fileColumn: string]: {
      field: string | null;
      confidence: number;
      transform?: string | null;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  validation_overrides: {
    allowAutoApproval?: boolean;
    skipDuplicateCheck?: boolean;
  } | null;

  @Column({ type: 'integer', default: 0 })
  use_count: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_used_at: Date | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
```

---

## Agents

### 1. FileIntakeAgent

Парсинг файлов разных форматов:

```typescript
@Injectable()
export class FileIntakeAgent {
  async execute(fileUpload: FileUpload, context: AgentContext): Promise<ParsedFile>;
}

// Поддерживаемые парсеры
tools/parsers/
├── xlsx.parser.ts  // Excel
├── csv.parser.ts   // CSV
├── json.parser.ts  // JSON
└── xml.parser.ts   // XML
```

### 2. ClassificationAgent

Автоматическое определение домена и маппинг колонок:

```typescript
@Injectable()
export class ClassificationAgent {
  async execute(parsedFile: ParsedFile, context: AgentContext): Promise<ClassificationResult>;
}

interface ClassificationResult {
  domain: DomainType;
  confidence: number;           // 0.0 - 1.0
  columnMapping: ColumnMapping;
  dataTypes: Record<string, string>;
  relationships: Record<string, { table: string; field: string; type: string }>;
  suggestedTemplate?: string | null;
}
```

### 3. ValidationAgent

Валидация данных против схемы:

```typescript
@Injectable()
export class ValidationAgent {
  async execute(input: ValidationInput, context: AgentContext): Promise<ValidationReport>;
}

interface ValidationReport {
  totalRows: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  isValid: boolean;
  canProceed: boolean;  // true если нет критических ошибок
}
```

### 4. SuggestionAgent

Генерация плана действий:

```typescript
@Injectable()
export class SuggestionAgent {
  async execute(input: SuggestionInput, context: AgentContext): Promise<ActionPlan>;
}

interface ActionPlan {
  actions: Action[];
  summary: {
    insertCount: number;
    updateCount: number;
    mergeCount: number;
    skipCount: number;
    deleteCount: number;
  };
  estimatedDuration: number; // seconds
  risks: string[];
}
```

### 5. UxApprovalAgent

Подготовка данных для UI и решение об авто-одобрении:

```typescript
@Injectable()
export class UxApprovalAgent {
  async execute(input: ApprovalInput, context: AgentContext): Promise<ApprovalRequest>;
}

interface ApprovalRequest {
  autoApprove: boolean;
  summary: ImportSummary;
  previewData: Record<string, unknown>[];
  warnings: string[];
  requiresManualReview: boolean;
}
```

### 6. ExecutionAgent

Выполнение плана действий:

```typescript
@Injectable()
export class ExecutionAgent {
  async execute(actionPlan: ActionPlan, context: AgentContext): Promise<ExecutionResult>;
}

interface ExecutionResult {
  successCount: number;
  failureCount: number;
  results: {
    action: Action;
    success: boolean;
    result?: unknown;
    error?: string;
  }[];
  duration: number; // milliseconds
}
```

### 7. ReconciliationAgent

Проверка целостности данных после импорта:

```typescript
@Injectable()
export class ReconciliationAgent {
  async execute(input: ReconciliationInput, context: AgentContext): Promise<ReconciliationReport>;
}

interface ReconciliationReport {
  domain: DomainType;
  gaps: { type: string; description: string; affectedRecords: number }[];
  inconsistencies: { type: string; description: string; severity: ValidationSeverity }[];
  proposedCorrections: Action[];
}
```

### 8. LearningAgent

Сохранение шаблона для будущих импортов:

```typescript
@Injectable()
export class LearningAgent {
  async execute(input: { sessionId: string }, context: AgentContext): Promise<void>;
}
```

---

## Import Workflow

Главный оркестратор пайплайна:

```typescript
@Injectable()
export class ImportWorkflow {
  /**
   * Запустить импорт
   */
  async execute(
    fileUpload: FileUpload,
    userId: string,
    onProgress?: (status: ImportSessionStatus, progress: number, message: string) => void,
  ): Promise<ImportResult>;

  /**
   * Одобрить импорт
   */
  async approve(sessionId: string, userId: string): Promise<ImportResult>;

  /**
   * Отклонить импорт
   */
  async reject(sessionId: string, userId: string, reason: string): Promise<void>;
}

interface ImportResult {
  sessionId: string;
  status: ImportSessionStatus;
  message: string;
}
```

---

## Прогресс выполнения

```
Status                   | Progress | Message
-------------------------|----------|---------------------------
PARSING                  | 10%      | Parsing file...
CLASSIFYING              | 25%      | Classifying data...
VALIDATING               | 40%      | Validating data...
SUGGESTING               | 55%      | Generating action plan...
AWAITING_APPROVAL        | 70%      | Awaiting approval...
EXECUTING                | 85%      | Executing actions...
RECONCILING              | 95%      | Reconciling data...
COMPLETED                | 100%     | Import completed
```

---

## Validators

### IntegrityValidator

```typescript
tools/validators/integrity.validator.ts
- Проверка ссылочной целостности (foreign keys)
- Проверка уникальности
- Проверка обязательных полей
```

### AnomalyDetector

```typescript
tools/validators/anomaly.detector.ts
- Обнаружение выбросов (outliers)
- Обнаружение дубликатов
- Обнаружение аномальных паттернов
```

### SchemaValidator

```typescript
tools/validators/schema.validator.ts
- Валидация типов данных
- Валидация форматов
- Валидация диапазонов
```

---

## Engines

### SchemaRegistryService

```typescript
@Injectable()
export class SchemaRegistryService {
  async getSchema(domain: DomainType): Promise<SchemaDefinition>;
  async registerSchema(definition: SchemaDefinition): Promise<void>;
}
```

### RulesEngineService

```typescript
@Injectable()
export class RulesEngineService {
  async applyRules(data: Record<string, unknown>[], rules: ValidationRule[]): Promise<ValidationResult>;
}
```

---

## API Endpoints

### Запустить импорт

```http
POST /api/intelligent-import/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: data.xlsx
```

**Response:**
```json
{
  "sessionId": "uuid",
  "status": "awaiting_approval",
  "message": "Import ready for approval"
}
```

### Получить статус сессии

```http
GET /api/intelligent-import/sessions/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "domain": "sales",
  "status": "awaiting_approval",
  "file_metadata": {
    "filename": "sales_2025.xlsx",
    "rowCount": 150,
    "columnCount": 6
  },
  "classification_result": {
    "domain": "sales",
    "confidence": 0.95,
    "columnMapping": {
      "Дата": { "field": "sale_date", "confidence": 1.0 },
      "Аппарат": { "field": "machine_number", "confidence": 0.98 }
    }
  },
  "validation_report": {
    "totalRows": 150,
    "errorCount": 5,
    "warningCount": 10,
    "isValid": true,
    "canProceed": true
  },
  "action_plan": {
    "summary": {
      "insertCount": 140,
      "updateCount": 5,
      "skipCount": 5
    }
  },
  "approval_status": "pending"
}
```

### Одобрить импорт

```http
POST /api/intelligent-import/sessions/:id/approve
Authorization: Bearer <token>
```

### Отклонить импорт

```http
POST /api/intelligent-import/sessions/:id/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Некорректные данные"
}
```

### Получить список шаблонов

```http
GET /api/intelligent-import/templates?domain=sales
Authorization: Bearer <token>
```

---

## WebSocket Events

Реал-тайм прогресс через WebSocket:

```typescript
// intelligent-import.gateway.ts
@WebSocketGateway()
export class IntelligentImportGateway {
  @SubscribeMessage('subscribe_session')
  handleSubscribe(client: Socket, sessionId: string);
}

// Events
interface ProgressEvent {
  sessionId: string;
  status: ImportSessionStatus;
  progress: number;
  message: string;
}
```

---

## Interfaces

### FileMetadata

```typescript
interface FileMetadata {
  filename: string;
  size: number;
  mimetype: string;
  encoding: string;
  checksum: string;
  rowCount: number;
  columnCount: number;
}
```

### ColumnMapping

```typescript
interface ColumnMapping {
  [fileColumn: string]: {
    field: string | null;
    confidence: number;
    transform?: string | null;
  };
}
```

### Action

```typescript
interface Action {
  type: ActionType;
  table: string;
  data: Record<string, unknown>;
  conditions?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-INT-01 | 4 формата файлов (Excel, CSV, JSON, XML) |
| REQ-INT-02 | 14 поддерживаемых доменов |
| REQ-INT-03 | 16 статусов сессии |
| REQ-INT-10 | 8-агентная архитектура |
| REQ-INT-11 | Автоматическая классификация домена |
| REQ-INT-12 | Автоматический маппинг колонок |
| REQ-INT-13 | Confidence scoring |
| REQ-INT-20 | Валидация против схемы |
| REQ-INT-21 | Обнаружение аномалий |
| REQ-INT-22 | Проверка ссылочной целостности |
| REQ-INT-30 | Генерация плана действий |
| REQ-INT-31 | Авто/ручное одобрение |
| REQ-INT-32 | Сохранение шаблонов для обучения |
| REQ-INT-40 | WebSocket прогресс |
| REQ-INT-41 | Reconciliation после импорта |
