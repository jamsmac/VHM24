import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DomainType } from '../interfaces/common.interface';

/**
 * Schema Definition
 *
 * Registry of table schemas for different domains
 */
@Entity('schema_definitions')
@Index(['domain', 'table_name'], { unique: true })
export class SchemaDefinition extends BaseEntity {
  @ApiProperty({ enum: DomainType })
  @Column({ type: 'enum', enum: DomainType })
  domain: DomainType;

  @ApiProperty({ example: 'transactions' })
  @Column({ type: 'varchar', length: 100 })
  table_name: string;

  @ApiProperty({
    example: [
      {
        name: 'sale_date',
        type: 'date',
        required: true,
        synonyms: ['date', 'Date', 'Дата', 'дата', 'transaction_date'],
      },
      {
        name: 'machine_number',
        type: 'string',
        required: true,
        synonyms: ['machine', 'Machine', 'Аппарат', 'аппарат'],
      },
      {
        name: 'amount',
        type: 'number',
        required: true,
        synonyms: ['sum', 'total', 'Сумма', 'сумма'],
        validation: { min: 0, max: 1000000 },
      },
    ],
  })
  @Column({ type: 'jsonb' })
  field_definitions: Record<string, any>;

  @ApiProperty({
    example: {
      machine_number: { table: 'machines', field: 'machine_number', type: 'string' },
      nomenclature_id: { table: 'nomenclature', field: 'id', type: 'uuid' },
    },
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  relationships: Record<string, any> | null;

  @ApiProperty({ example: 'v1.0' })
  @Column({ type: 'varchar', length: 20, default: 'v1.0' })
  version: string;

  @ApiProperty({ example: true, default: true })
  @Column({ type: 'boolean', default: true })
  active: boolean;
}
