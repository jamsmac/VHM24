/**
 * Common Interfaces for Intelligent Import System
 */

export interface FileUpload {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  size: number;
}

export interface AgentContext {
  sessionId: string;
  userId: string;
}

export enum DomainType {
  SALES = 'sales',
  INVENTORY = 'inventory',
  MACHINES = 'machines',
  EQUIPMENT = 'equipment',
  HR = 'hr',
  BILLING = 'billing',
  LOCATIONS = 'locations',
  NOMENCLATURE = 'nomenclature',
  TASKS = 'tasks',
  TRANSACTIONS = 'transactions',
  COUNTERPARTIES = 'counterparties',
  RECIPES = 'recipes',
  OPENING_BALANCES = 'opening_balances',
  PURCHASE_HISTORY = 'purchase_history',
  UNKNOWN = 'unknown',
}

export enum FileType {
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
}

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

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  AUTO_APPROVED = 'auto_approved',
}

export enum ActionType {
  INSERT = 'insert',
  UPDATE = 'update',
  MERGE = 'merge',
  SKIP = 'skip',
  DELETE = 'delete',
}

export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export enum RuleType {
  RANGE = 'range',
  REGEX = 'regex',
  ENUM = 'enum',
  REQUIRED = 'required',
  UNIQUE = 'unique',
  FOREIGN_KEY = 'foreign_key',
  CUSTOM = 'custom',
}

export interface FileMetadata {
  filename: string;
  size: number;
  mimetype: string;
  encoding: string;
  checksum: string;
  rowCount: number;
  columnCount: number;
}

export interface RawTable {
  headers: string[];
  rows: unknown[][];
  metadata?: Record<string, unknown>;
}

export interface ParsedFile {
  fileType: FileType;
  tables: RawTable[];
  metadata: FileMetadata;
}

export interface ColumnMapping {
  [fileColumn: string]: {
    field: string | null;
    confidence: number;
    transform?: string | null;
  };
}

export interface ClassificationResult {
  domain: DomainType;
  confidence: number;
  columnMapping: ColumnMapping;
  dataTypes: Record<string, string>;
  relationships: Record<
    string,
    {
      table: string;
      field: string;
      type: 'string' | 'uuid';
      cascade?: boolean;
    }
  >;
  suggestedTemplate?: string | null;
}

export interface ValidationError {
  rowIndex: number;
  field: string;
  value: unknown;
  code: string;
  message: string;
  severity: ValidationSeverity;
}

export interface ValidationReport {
  totalRows: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  isValid: boolean;
  canProceed: boolean;
}

export interface Action {
  type: ActionType;
  table: string;
  data: Record<string, unknown>;
  conditions?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ActionPlan {
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

export interface ImportSummary {
  domain: DomainType;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newEntities: { type: string; count: number }[];
  updatedEntities: { type: string; count: number }[];
  warnings: string[];
  estimatedChanges: string; // Human-readable summary
}

export interface ExecutionResult {
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

export interface ReconciliationReport {
  domain: DomainType;
  gaps: {
    type: string;
    description: string;
    affectedRecords: number;
  }[];
  inconsistencies: {
    type: string;
    description: string;
    severity: ValidationSeverity;
  }[];
  proposedCorrections: Action[];
}
