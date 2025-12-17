import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum ApiKeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

@Entity('api_keys')
export class ApiKey extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  key_hash: string; // Hashed API key

  @Column({ type: 'varchar', length: 16, unique: true })
  key_prefix: string; // First 8 chars for identification

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'enum', enum: ApiKeyStatus, default: ApiKeyStatus.ACTIVE })
  status: ApiKeyStatus;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_used_at: Date | null;

  @Column({ type: 'integer', default: 0 })
  usage_count: number;

  @Column({ type: 'integer', nullable: true })
  rate_limit: number | null; // Requests per minute

  @Column({ type: 'jsonb', default: [] })
  scopes: string[]; // Permissions: ['read:products', 'write:orders', etc.]

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    ip_whitelist?: string[];
    allowed_origins?: string[];
    description?: string;
    [key: string]: unknown;
  };
}
