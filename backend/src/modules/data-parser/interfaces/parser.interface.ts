/**
 * Data Parser Framework Interfaces
 *
 * Core interfaces for universal data parsing with support for
 * multiple formats and intelligent error recovery
 */

export enum FileFormat {
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
  PDF = 'pdf',
  TEXT = 'txt',
}

export interface ParsedData<T = Record<string, unknown>> {
  data: T[];
  metadata: ParseMetadata;
  warnings: ParseWarning[];
  errors: ParseError[];
  statistics: ParseStatistics;
}

export interface ParseMetadata {
  fileName?: string;
  fileSize?: number;
  format: FileFormat;
  encoding?: string;
  createdAt?: Date;
  parsedAt: Date;
  sheets?: string[]; // For Excel files
  headers?: string[];
  rowCount?: number;
  columnCount?: number;
}

export interface ParseWarning {
  row?: number;
  column?: string;
  type: 'data_type' | 'missing_value' | 'format' | 'range' | 'duplicate';
  message: string;
  value?: unknown;
  suggestion?: string;
}

export interface ParseError {
  row?: number;
  column?: string;
  type: 'critical' | 'recoverable' | 'validation';
  message: string;
  value?: unknown;
  stack?: string;
}

export interface ParseStatistics {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  skippedRows: number;
  processingTimeMs: number;
  memoryUsedMb?: number;
  dataQualityScore?: number; // 0-100
}

export interface ValidationResult<T = Record<string, unknown>> {
  isValid: boolean;
  data: T[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

export interface ValidationError {
  field: string;
  value: unknown;
  rule: string;
  message: string;
  row?: number;
}

export interface ValidationWarning {
  field: string;
  value: unknown;
  type: string;
  message: string;
  row?: number;
}

export interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  fields: Record<string, FieldValidationStats>;
}

export interface FieldValidationStats {
  total: number;
  valid: number;
  invalid: number;
  null: number;
  unique: number;
  dataTypes: Record<string, number>;
}

export interface TransformedData<T = Record<string, unknown>> {
  data: T[];
  transformations: TransformationLog[];
  originalCount: number;
  transformedCount: number;
}

export interface TransformationLog {
  field: string;
  type: 'rename' | 'convert' | 'calculate' | 'merge' | 'split' | 'clean';
  from: unknown;
  to: unknown;
  count: number;
}

export interface ParserOptions {
  encoding?: string;
  delimiter?: string; // For CSV
  headers?: boolean | string[];
  skipRows?: number;
  maxRows?: number;
  dateFormat?: string;
  numberFormat?: string;
  locale?: string;
  timezone?: string;
  strict?: boolean; // Fail on first error
  autoDetect?: boolean; // Auto-detect format and structure
  recoverCorrupted?: boolean; // Try to recover corrupted data
}

export interface DataParser<T = Record<string, unknown>> {
  // Core parsing capabilities
  parse(input: Buffer | string, options?: ParserOptions): Promise<ParsedData<T>>;
  validate(data: ParsedData<T>, schema?: unknown): ValidationResult;
  transform(data: ParsedData<T>, rules?: unknown): TransformedData<T>;

  // Format detection and recovery
  detectFormat(input: Buffer): FileFormat;
  tryRecoverCorruptedData(input: Buffer): Promise<ParsedData<T> | null>;

  // Utilities
  getSupportedFormats(): FileFormat[];
  canParse(format: FileFormat): boolean;
}
