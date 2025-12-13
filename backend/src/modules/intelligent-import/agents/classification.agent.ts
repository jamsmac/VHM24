import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAgent, AgentContext, AgentStatus } from '../interfaces/agent.interface';
import {
  ParsedFile,
  ClassificationResult,
  DomainType,
  ColumnMapping,
} from '../interfaces/common.interface';
import { SchemaRegistryService, SchemaField } from '../engines/schema-registry.service';
import { ImportTemplate } from '../entities/import-template.entity';

/**
 * Classification Agent
 *
 * Detects data domain and maps file columns to database fields
 */
@Injectable()
export class ClassificationAgent implements IAgent<ParsedFile, ClassificationResult> {
  private readonly logger = new Logger(ClassificationAgent.name);
  readonly name = 'ClassificationAgent';
  private status: AgentStatus = AgentStatus.IDLE;

  constructor(
    private readonly schemaRegistry: SchemaRegistryService,
    @InjectRepository(ImportTemplate)
    private readonly templateRepo: Repository<ImportTemplate>,
  ) {}

  /**
   * Execute classification
   */
  async execute(input: ParsedFile, _context: AgentContext): Promise<ClassificationResult> {
    this.status = AgentStatus.RUNNING;

    try {
      const table = input.tables[0]; // Primary table
      this.logger.log(`Classifying data with ${table.headers.length} columns`);

      // Step 1: Detect domain
      const domain = await this.detectDomain(table.headers, table.rows.slice(0, 10));
      this.logger.log(`Detected domain: ${domain}`);

      // Step 2: Get schema for domain
      const schema = await this.schemaRegistry.getSchema(domain);

      // Step 3: Map columns to schema fields
      const columnMapping = await this.mapColumns(table.headers, schema.fields);
      this.logger.log(`Mapped ${Object.keys(columnMapping).length} columns`);

      // Step 4: Infer data types
      const dataTypes = this.inferDataTypes(table.rows, columnMapping);

      // Step 5: Find matching template
      const suggestedTemplate = await this.findMatchingTemplate(domain, columnMapping);

      // Step 6: Calculate overall confidence
      const confidence = this.calculateConfidence(columnMapping);
      this.logger.log(`Confidence: ${(confidence * 100).toFixed(1)}%`);

      this.status = AgentStatus.COMPLETED;

      return {
        domain,
        confidence,
        columnMapping,
        dataTypes,
        relationships: schema.relationships,
        suggestedTemplate,
      };
    } catch (error) {
      this.status = AgentStatus.FAILED;
      this.logger.error(`Classification failed:`, error);
      throw error;
    }
  }

  /**
   * Validate input
   */
  async validateInput(input: ParsedFile): Promise<boolean> {
    if (!input.tables || input.tables.length === 0) {
      throw new Error('No tables found in parsed file');
    }

    if (input.tables[0].headers.length === 0) {
      throw new Error('No headers found in table');
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
   * Detect domain using rule-based approach
   */
  private async detectDomain(headers: string[], _sampleRows: unknown[][]): Promise<DomainType> {
    const headerLower = headers.map((h) => h.toLowerCase());

    // SALES domain indicators
    const salesKeywords = [
      'sale',
      'продажа',
      'amount',
      'сумма',
      'payment',
      'оплата',
      'transaction',
      'машина',
      'machine',
    ];
    const salesScore = salesKeywords.filter((kw) => headerLower.some((h) => h.includes(kw))).length;

    // INVENTORY domain indicators
    const inventoryKeywords = [
      'stock',
      'запас',
      'quantity',
      'количество',
      'product',
      'товар',
      'inventory',
      'остаток',
    ];
    const inventoryScore = inventoryKeywords.filter((kw) =>
      headerLower.some((h) => h.includes(kw)),
    ).length;

    // MACHINES domain indicators
    const machineKeywords = [
      'machine',
      'аппарат',
      'location',
      'локация',
      'status',
      'статус',
      'model',
      'модель',
    ];
    const machineScore = machineKeywords.filter((kw) =>
      headerLower.some((h) => h.includes(kw)),
    ).length;

    // Choose domain with highest score
    const scores = [
      { domain: DomainType.SALES, score: salesScore },
      { domain: DomainType.INVENTORY, score: inventoryScore },
      { domain: DomainType.MACHINES, score: machineScore },
    ];

    scores.sort((a, b) => b.score - a.score);

    if (scores[0].score === 0) {
      return DomainType.UNKNOWN; // No clear match
    }

    return scores[0].domain;
  }

  /**
   * Map file columns to schema fields
   */
  private async mapColumns(headers: string[], fields: SchemaField[]): Promise<ColumnMapping> {
    const mapping: ColumnMapping = {};

    for (const header of headers) {
      const match = this.findBestFieldMatch(header, fields);
      mapping[header] = match;
    }

    return mapping;
  }

  /**
   * Find best matching field for a header
   */
  private findBestFieldMatch(
    header: string,
    fields: SchemaField[],
  ): { field: string | null; confidence: number; transform?: string | null } {
    const headerLower = header.toLowerCase().trim();

    // 1. Exact match
    for (const field of fields) {
      if (field.name.toLowerCase() === headerLower) {
        return { field: field.name, confidence: 1.0, transform: null };
      }
    }

    // 2. Synonym match
    for (const field of fields) {
      if (field.synonyms?.some((s) => s.toLowerCase() === headerLower)) {
        return { field: field.name, confidence: 0.95, transform: null };
      }
    }

    // 3. Fuzzy match (Levenshtein distance)
    let bestMatch: { field: SchemaField; distance: number } | null = null;

    for (const field of fields) {
      const distance = this.calculateLevenshtein(headerLower, field.name.toLowerCase());

      if (distance < 5 && (!bestMatch || distance < bestMatch.distance)) {
        bestMatch = { field, distance };
      }

      // Also check synonyms
      for (const synonym of field.synonyms || []) {
        const synDistance = this.calculateLevenshtein(headerLower, synonym.toLowerCase());
        if (synDistance < 5 && (!bestMatch || synDistance < bestMatch.distance)) {
          bestMatch = { field, distance: synDistance };
        }
      }
    }

    if (bestMatch) {
      const confidence = 1 - bestMatch.distance / 10;
      return {
        field: bestMatch.field.name,
        confidence: Math.max(0.5, confidence),
        transform: null,
      };
    }

    // 4. No match found
    return { field: null, confidence: 0, transform: null };
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private calculateLevenshtein(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Infer data types from sample rows
   */
  private inferDataTypes(rows: unknown[][], columnMapping: ColumnMapping): Record<string, string> {
    const dataTypes: Record<string, string> = {};

    const headers = Object.keys(columnMapping);

    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const header = headers[colIndex];
      const values = rows.slice(0, 10).map((row) => row[colIndex]); // Sample first 10 rows

      dataTypes[header] = this.inferType(values);
    }

    return dataTypes;
  }

  /**
   * Infer type from sample values
   */
  private inferType(values: unknown[]): string {
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== '');

    if (nonNullValues.length === 0) {
      return 'string';
    }

    // Check if all are numbers
    const allNumbers = nonNullValues.every((v) => !isNaN(parseFloat(String(v))));
    if (allNumbers) {
      return 'number';
    }

    // Check if all are dates
    const allDates = nonNullValues.every((v) => {
      const date = new Date(String(v));
      return !isNaN(date.getTime());
    });
    if (allDates) {
      return 'date';
    }

    // Check if all are booleans
    const allBooleans = nonNullValues.every(
      (v) =>
        String(v).toLowerCase() === 'true' ||
        String(v).toLowerCase() === 'false' ||
        v === 0 ||
        v === 1,
    );
    if (allBooleans) {
      return 'boolean';
    }

    return 'string';
  }

  /**
   * Find matching template from previous imports
   */
  private async findMatchingTemplate(
    domain: DomainType,
    columnMapping: ColumnMapping,
  ): Promise<string | null> {
    const templates = await this.templateRepo.find({
      where: { domain, active: true },
      order: { use_count: 'DESC' },
      take: 10,
    });

    for (const template of templates) {
      const similarity = this.calculateMappingSimilarity(columnMapping, template.column_mapping);

      if (similarity > 0.8) {
        // 80% similarity threshold
        this.logger.log(
          `Found matching template: ${template.name} (${(similarity * 100).toFixed(1)}% similarity)`,
        );
        return template.id;
      }
    }

    return null;
  }

  /**
   * Calculate similarity between two column mappings
   */
  private calculateMappingSimilarity(mapping1: ColumnMapping, mapping2: ColumnMapping): number {
    const keys1 = Object.keys(mapping1);
    const keys2 = Object.keys(mapping2);

    const commonKeys = keys1.filter((k) => keys2.includes(k));

    if (commonKeys.length === 0) {
      return 0;
    }

    let matchCount = 0;
    for (const key of commonKeys) {
      if (mapping1[key].field === mapping2[key].field) {
        matchCount++;
      }
    }

    return matchCount / Math.max(keys1.length, keys2.length);
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(columnMapping: ColumnMapping): number {
    const confidences = Object.values(columnMapping).map((m) => m.confidence);

    if (confidences.length === 0) {
      return 0;
    }

    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }
}
