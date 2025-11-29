import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DomainType, RuleType, ValidationSeverity } from '../interfaces/common.interface';

/**
 * Validation Rule
 *
 * Business logic rules for data validation
 */
@Entity('validation_rules')
@Index(['domain', 'active'])
export class ValidationRule extends BaseEntity {
  @ApiProperty({ enum: DomainType })
  @Column({ type: 'enum', enum: DomainType })
  domain: DomainType;

  @ApiProperty({ example: 'amount_positive' })
  @Column({ type: 'varchar', length: 100 })
  rule_name: string;

  @ApiProperty({ enum: RuleType })
  @Column({ type: 'enum', enum: RuleType })
  rule_type: RuleType;

  @ApiProperty({
    example: {
      field: 'amount',
      operator: 'greater_than',
      value: 0,
      message: 'Amount must be positive',
    },
  })
  @Column({ type: 'jsonb' })
  rule_definition: Record<string, any>;

  @ApiProperty({ enum: ValidationSeverity })
  @Column({ type: 'enum', enum: ValidationSeverity, default: ValidationSeverity.ERROR })
  severity: ValidationSeverity;

  @ApiProperty({ example: true, default: true })
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @ApiProperty({ example: 1, default: 1 })
  @Column({ type: 'integer', default: 1 })
  priority: number;
}
