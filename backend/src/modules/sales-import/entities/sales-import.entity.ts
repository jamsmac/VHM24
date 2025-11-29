import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

export enum ImportFileType {
  EXCEL = 'excel',
  CSV = 'csv',
}

/**
 * Sales Import
 * Tracks Excel/CSV imports of sales data
 */
@Entity('sales_imports')
export class SalesImport extends BaseEntity {
  @ApiProperty({ example: 'user-uuid', description: 'User who uploaded' })
  @Column({ type: 'uuid' })
  uploaded_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploaded_by: User;

  @ApiProperty({ example: 'sales_report_2025-11-14.xlsx' })
  @Column({ type: 'varchar', length: 500 })
  filename: string;

  @ApiProperty({ enum: ImportFileType, example: ImportFileType.EXCEL })
  @Column({ type: 'enum', enum: ImportFileType })
  file_type: ImportFileType;

  @ApiProperty({ example: 'file-uuid' })
  @Column({ type: 'uuid', nullable: true })
  file_id: string | null;

  @ApiProperty({ enum: ImportStatus, default: ImportStatus.PENDING })
  @Column({ type: 'enum', enum: ImportStatus, default: ImportStatus.PENDING })
  status: ImportStatus;

  @ApiProperty({ example: 150 })
  @Column({ type: 'integer', default: 0 })
  total_rows: number;

  @ApiProperty({ example: 145 })
  @Column({ type: 'integer', default: 0 })
  success_rows: number;

  @ApiProperty({ example: 5 })
  @Column({ type: 'integer', default: 0 })
  failed_rows: number;

  @ApiProperty({
    example: { errors: ['Row 10: Invalid machine ID', 'Row 25: Missing date'] },
  })
  @Column({ type: 'jsonb', nullable: true })
  errors: Record<string, any> | null;

  @ApiProperty({
    example: { total_amount: 50000, transactions_created: 145 },
  })
  @Column({ type: 'jsonb', nullable: true })
  summary: Record<string, any> | null;

  @ApiProperty({ example: '2025-11-14T10:00:00Z' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  started_at: Date | null;

  @ApiProperty({ example: '2025-11-14T10:05:00Z' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  @ApiProperty({ example: 'Processing completed successfully' })
  @Column({ type: 'text', nullable: true })
  message: string | null;
}
