import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { ImportSession } from './import-session.entity';
import { ActionType } from '../interfaces/common.interface';

/**
 * Import Audit Log
 *
 * Tracks all changes made by import system
 */
@Entity('import_audit_logs')
@Index(['session_id'])
@Index(['table_name', 'record_id'])
export class ImportAuditLog extends BaseEntity {
  @ApiProperty({ example: 'uuid' })
  @Column({ type: 'uuid' })
  session_id: string;

  @ManyToOne(() => ImportSession, (session) => session.audit_logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: ImportSession;

  @ApiProperty({ enum: ActionType })
  @Column({ type: 'enum', enum: ActionType })
  action_type: ActionType;

  @ApiProperty({ example: 'transactions' })
  @Column({ type: 'varchar', length: 100 })
  table_name: string;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  record_id: string | null;

  @ApiProperty({
    example: { amount: 1000, machine_id: 'old-uuid' },
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  before_state: Record<string, any> | null;

  @ApiProperty({
    example: { amount: 1500, machine_id: 'new-uuid' },
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  after_state: Record<string, any> | null;

  @ApiProperty({ example: '2025-11-17T10:05:00Z' })
  @Column({ type: 'timestamp with time zone', default: () => 'NOW()' })
  executed_at: Date;

  @ApiProperty({ example: 'uuid' })
  @Column({ type: 'uuid' })
  executed_by_user_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'executed_by_user_id' })
  executed_by: User;

  @ApiProperty({ example: { importRow: 10, originalValue: '1,000' }, nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
