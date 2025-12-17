import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum AccessDecision {
  ALLOW = 'allow',
  DENY = 'deny',
}

export enum AccessType {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  EXECUTE = 'execute',
}

@Entity('access_control_logs')
@Index(['user_id', 'created_at'])
@Index(['resource_type', 'decision'])
export class AccessControlLog extends BaseEntity {
  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 200 })
  user_email: string;

  @Column({ type: 'varchar', length: 100 })
  resource_type: string; // e.g., 'machine', 'transaction', 'report'

  @Column({ type: 'uuid', nullable: true })
  resource_id: string | null;

  @Column({ type: 'enum', enum: AccessType })
  access_type: AccessType;

  @Column({ type: 'enum', enum: AccessDecision })
  decision: AccessDecision;

  @Column({ type: 'text', nullable: true })
  reason: string | null; // Reason for denial

  @Column({ type: 'varchar', length: 100, nullable: true })
  ip_address: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  endpoint: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  http_method: string | null;

  @Column({ type: 'jsonb', default: {} })
  user_permissions: string[];

  @Column({ type: 'jsonb', default: {} })
  required_permissions: string[];

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    request_params?: Record<string, unknown>;
    user_role?: string;
    [key: string]: unknown;
  };
}
