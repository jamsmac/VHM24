/**
 * Agent Interfaces
 *
 * Base interfaces for all agents in the intelligent import system
 */

export interface AgentContext {
  sessionId: string;
  userId: string;
  metadata?: Record<string, unknown>;
  abortSignal?: AbortSignal;
}

export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Base Agent Interface
 */
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

/**
 * File Upload Input
 */
export interface FileUpload {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  size: number;
}

import { DomainType, ColumnMapping } from './common.interface';

/**
 * Schema with fields and relationships
 */
export interface DataSchema {
  domain: DomainType;
  fields: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'uuid' | 'enum';
    required: boolean;
    synonyms?: string[];
    validation?: Record<string, unknown>;
    defaultValue?: unknown;
    description?: string;
  }>;
  relationships: Record<
    string,
    {
      table: string;
      field: string;
      type: 'string' | 'uuid';
      cascade?: boolean;
    }
  >;
}

/**
 * Classified Data (output of Classification Agent)
 */
export interface ClassifiedData {
  domain: DomainType;
  schema: DataSchema;
  columnMapping: ColumnMapping;
  rows: Record<string, unknown>[];
  confidence: number;
  suggestedTemplate?: string | null;
}
