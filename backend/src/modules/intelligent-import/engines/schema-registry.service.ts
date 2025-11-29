import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchemaDefinition } from '../entities/schema-definition.entity';
import { DomainType } from '../interfaces/common.interface';

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'uuid' | 'enum';
  required: boolean;
  synonyms?: string[];
  validation?: Record<string, unknown>;
  defaultValue?: unknown;
  description?: string;
}

export interface SchemaRelationship {
  table: string;
  field: string;
  type: 'string' | 'uuid';
  cascade?: boolean;
}

/**
 * Schema Registry Service
 *
 * Manages dynamic schemas for different data domains.
 * Provides field definitions, synonyms, and relationships.
 */
@Injectable()
export class SchemaRegistryService {
  private readonly logger = new Logger(SchemaRegistryService.name);

  constructor(
    @InjectRepository(SchemaDefinition)
    private readonly schemaRepo: Repository<SchemaDefinition>,
  ) {}

  /**
   * Get schema for a domain
   */
  async getSchema(domain: DomainType): Promise<{
    domain: DomainType;
    fields: SchemaField[];
    relationships: Record<string, SchemaRelationship>;
  }> {
    const schema = await this.schemaRepo.findOne({
      where: { domain, active: true },
    });

    if (!schema) {
      throw new NotFoundException(`Schema for domain "${domain}" not found`);
    }

    return {
      domain: schema.domain,
      fields: schema.field_definitions as SchemaField[],
      relationships: (schema.relationships || {}) as Record<string, SchemaRelationship>,
    };
  }

  /**
   * Find field by name or synonym
   */
  async findField(domain: DomainType, fieldName: string): Promise<SchemaField | null> {
    const schema = await this.getSchema(domain);

    // Exact match
    const exactMatch = schema.fields.find((f) => f.name.toLowerCase() === fieldName.toLowerCase());
    if (exactMatch) return exactMatch;

    // Synonym match
    const synonymMatch = schema.fields.find((f) =>
      f.synonyms?.some((s) => s.toLowerCase() === fieldName.toLowerCase()),
    );
    if (synonymMatch) return synonymMatch;

    return null;
  }

  /**
   * Get all fields for a domain
   */
  async getFields(domain: DomainType): Promise<SchemaField[]> {
    const schema = await this.getSchema(domain);
    return schema.fields;
  }

  /**
   * Get relationships for a domain
   */
  async getRelationships(domain: DomainType): Promise<Record<string, SchemaRelationship>> {
    const schema = await this.getSchema(domain);
    return schema.relationships;
  }

  /**
   * Create or update schema
   */
  async upsertSchema(
    domain: DomainType,
    tableName: string,
    fields: SchemaField[],
    relationships?: Record<string, SchemaRelationship>,
  ): Promise<SchemaDefinition> {
    const existing = await this.schemaRepo.findOne({
      where: { domain, table_name: tableName },
    });

    if (existing) {
      existing.field_definitions = fields as unknown as Record<string, unknown>;
      existing.relationships = relationships as unknown as Record<string, unknown>;
      existing.updated_at = new Date();
      return await this.schemaRepo.save(existing);
    }

    const newSchema = this.schemaRepo.create({
      domain,
      table_name: tableName,
      field_definitions: fields as unknown as Record<string, unknown>,
      relationships: relationships as unknown as Record<string, unknown>,
    });

    return await this.schemaRepo.save(newSchema);
  }

  /**
   * Seed default schemas for all domains
   */
  async seedDefaultSchemas(): Promise<void> {
    // SALES domain schema
    await this.upsertSchema(
      DomainType.SALES,
      'transactions',
      [
        {
          name: 'sale_date',
          type: 'date',
          required: true,
          synonyms: ['date', 'Date', 'Дата', 'дата', 'transaction_date'],
          description: 'Date of the sale',
        },
        {
          name: 'machine_number',
          type: 'string',
          required: true,
          synonyms: ['machine', 'Machine', 'Аппарат', 'аппарат', 'machine_id'],
          description: 'Machine identifier',
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          synonyms: ['sum', 'total', 'Сумма', 'сумма', 'Amount'],
          validation: { min: 0, max: 1000000 },
          description: 'Sale amount',
        },
        {
          name: 'payment_method',
          type: 'enum',
          required: false,
          synonyms: ['payment', 'Payment', 'Способ оплаты', 'способ оплаты'],
          validation: { enum: ['cash', 'card', 'qr', 'mobile', 'online'] },
          defaultValue: 'cash',
          description: 'Payment method',
        },
        {
          name: 'product_name',
          type: 'string',
          required: false,
          synonyms: ['product', 'Product', 'Товар', 'товар', 'nomenclature'],
          description: 'Product name',
        },
        {
          name: 'quantity',
          type: 'number',
          required: false,
          synonyms: ['qty', 'Количество', 'количество', 'Quantity'],
          validation: { min: 1 },
          defaultValue: 1,
          description: 'Quantity sold',
        },
      ],
      {
        machine_number: {
          table: 'machines',
          field: 'machine_number',
          type: 'string',
        },
        product_name: {
          table: 'nomenclature',
          field: 'name',
          type: 'string',
        },
      },
    );

    // INVENTORY domain schema
    await this.upsertSchema(
      DomainType.INVENTORY,
      'inventory',
      [
        {
          name: 'machine_number',
          type: 'string',
          required: true,
          synonyms: ['machine', 'Machine', 'Аппарат'],
        },
        {
          name: 'product_name',
          type: 'string',
          required: true,
          synonyms: ['product', 'Product', 'Товар', 'nomenclature'],
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          synonyms: ['qty', 'Количество', 'stock'],
          validation: { min: 0 },
        },
        {
          name: 'date',
          type: 'date',
          required: false,
          synonyms: ['Date', 'Дата', 'inventory_date'],
        },
      ],
      {
        machine_number: {
          table: 'machines',
          field: 'machine_number',
          type: 'string',
        },
        product_name: {
          table: 'nomenclature',
          field: 'name',
          type: 'string',
        },
      },
    );

    // MACHINES domain schema
    await this.upsertSchema(
      DomainType.MACHINES,
      'machines',
      [
        {
          name: 'machine_number',
          type: 'string',
          required: true,
          synonyms: ['number', 'Machine Number', 'Номер аппарата'],
        },
        {
          name: 'name',
          type: 'string',
          required: true,
          synonyms: ['Name', 'Название', 'machine_name'],
        },
        {
          name: 'location',
          type: 'string',
          required: false,
          synonyms: ['Location', 'Локация', 'place'],
        },
        {
          name: 'status',
          type: 'enum',
          required: false,
          validation: {
            enum: ['active', 'low_stock', 'error', 'maintenance', 'offline', 'disabled'],
          },
          defaultValue: 'active',
        },
      ],
      {
        location: {
          table: 'locations',
          field: 'name',
          type: 'string',
        },
      },
    );

    this.logger.log('Default schemas seeded successfully');
  }
}
