import { Entity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DomainType } from '../interfaces/common.interface';

/**
 * Import Template
 *
 * Stores learned column mappings and configurations for reuse
 */
@Entity('import_templates')
export class ImportTemplate extends BaseEntity {
  @ApiProperty({ example: 'Sales Report from Vendor X' })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({ enum: DomainType })
  @Column({ type: 'enum', enum: DomainType })
  domain: DomainType;

  @ApiProperty({
    example: {
      Дата: { field: 'sale_date', confidence: 1.0, transform: null },
      Аппарат: { field: 'machine_number', confidence: 1.0, transform: null },
      Сумма: { field: 'amount', confidence: 1.0, transform: 'parseFloat' },
    },
  })
  @Column({ type: 'jsonb' })
  column_mapping: Record<string, any>;

  @ApiProperty({
    example: { allowAutoApproval: true, skipDuplicateCheck: false },
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  validation_overrides: Record<string, any> | null;

  @ApiProperty({ example: 25, default: 0 })
  @Column({ type: 'integer', default: 0 })
  use_count: number;

  @ApiProperty({ example: '2025-11-17T10:00:00Z', nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_used_at: Date | null;

  @ApiProperty({ example: true, default: true })
  @Column({ type: 'boolean', default: true })
  active: boolean;
}
