import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum EncryptionStatus {
  PENDING = 'pending',
  ENCRYPTED = 'encrypted',
  DECRYPTED = 'decrypted',
  FAILED = 'failed',
}

@Entity('data_encryption')
@Index(['entity_type', 'entity_id'])
export class DataEncryption extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  entity_type: string; // e.g., 'user', 'complaint', 'payment'

  @Column({ type: 'uuid' })
  entity_id: string;

  @Column({ type: 'varchar', length: 100 })
  field_name: string; // e.g., 'phone', 'email', 'card_number'

  @Column({ type: 'text' })
  encrypted_value: string;

  @Column({ type: 'varchar', length: 100 })
  encryption_algorithm: string; // e.g., 'AES-256-GCM'

  @Column({ type: 'varchar', length: 100, nullable: true })
  key_version: string | null; // For key rotation

  @Column({ type: 'enum', enum: EncryptionStatus, default: EncryptionStatus.ENCRYPTED })
  status: EncryptionStatus;

  @Column({ type: 'timestamp', nullable: true })
  encrypted_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  encrypted_by_id: string | null;

  @Column({ type: 'timestamp', nullable: true })
  last_accessed_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  last_accessed_by_id: string | null;

  @Column({ type: 'integer', default: 0 })
  access_count: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    data_classification?: string; // e.g., 'PII', 'financial', 'medical'
    retention_period?: number; // days
    compliance_tags?: string[]; // e.g., ['GDPR', 'PCI-DSS']
    [key: string]: unknown;
  };
}
