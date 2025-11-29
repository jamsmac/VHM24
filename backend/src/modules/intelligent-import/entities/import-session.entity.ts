import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { ImportTemplate } from './import-template.entity';
import { ImportAuditLog } from './import-audit-log.entity';
import { DomainType, ImportSessionStatus, ApprovalStatus } from '../interfaces/common.interface';

/**
 * Import Session
 *
 * Tracks an intelligent import session from upload to completion
 */
@Entity('import_sessions')
export class ImportSession extends BaseEntity {
  @ApiProperty({ enum: DomainType })
  @Column({ type: 'enum', enum: DomainType })
  domain: DomainType;

  @ApiProperty({ enum: ImportSessionStatus })
  @Column({
    type: 'enum',
    enum: ImportSessionStatus,
    default: ImportSessionStatus.PENDING,
  })
  status: ImportSessionStatus;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  template_id: string | null;

  @ManyToOne(() => ImportTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template: ImportTemplate | null;

  @ApiProperty({
    example: {
      filename: 'sales_2025-11.xlsx',
      size: 52000,
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      encoding: 'utf-8',
      checksum: 'sha256:abc123...',
      rowCount: 150,
      columnCount: 6,
    },
  })
  @Column({ type: 'jsonb', nullable: true })
  file_metadata: Record<string, any> | null;

  @ApiProperty({
    example: {
      domain: 'sales',
      confidence: 0.95,
      columnMapping: { Date: 'sale_date', Machine: 'machine_number' },
      dataTypes: { sale_date: 'date', machine_number: 'string' },
    },
  })
  @Column({ type: 'jsonb', nullable: true })
  classification_result: Record<string, any> | null;

  @ApiProperty({
    example: {
      totalRows: 150,
      errorCount: 5,
      warningCount: 10,
      errors: [],
      warnings: [],
    },
  })
  @Column({ type: 'jsonb', nullable: true })
  validation_report: Record<string, any> | null;

  @ApiProperty({
    example: {
      actions: [],
      summary: { insertCount: 140, updateCount: 0 },
    },
  })
  @Column({ type: 'jsonb', nullable: true })
  action_plan: Record<string, any> | null;

  @ApiProperty({ enum: ApprovalStatus })
  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approval_status: ApprovalStatus;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  approved_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_user_id' })
  approved_by: User | null;

  @ApiProperty({ example: '2025-11-17T12:00:00Z', nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  approved_at: Date | null;

  @ApiProperty({
    example: {
      successCount: 145,
      failureCount: 5,
      duration: 5000,
    },
  })
  @Column({ type: 'jsonb', nullable: true })
  execution_result: Record<string, any> | null;

  @ApiProperty({ example: 'uuid' })
  @Column({ type: 'uuid' })
  uploaded_by_user_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploaded_by: User;

  @ApiProperty({ example: '2025-11-17T10:00:00Z', nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  started_at: Date | null;

  @ApiProperty({ example: '2025-11-17T10:05:00Z', nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  @ApiProperty({ example: 'Import completed successfully', nullable: true })
  @Column({ type: 'text', nullable: true })
  message: string | null;

  @ApiProperty({ example: 'file-uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  file_id: string | null;

  @OneToMany(() => ImportAuditLog, (log) => log.session)
  audit_logs: ImportAuditLog[];
}
