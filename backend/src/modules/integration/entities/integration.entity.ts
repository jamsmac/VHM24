import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { IntegrationLog } from './integration-log.entity';
import { encryptedColumnTransformer } from '../../../common/utils/crypto.util';

export enum IntegrationType {
  PAYMENT_GATEWAY = 'payment_gateway',
  ERP = 'erp',
  ACCOUNTING = 'accounting',
  CRM = 'crm',
  EMAIL = 'email',
  SMS = 'sms',
  SHIPPING = 'shipping',
  INVENTORY = 'inventory',
  API = 'api',
  WEBHOOK = 'webhook',
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  TESTING = 'testing',
}

@Entity('integrations')
export class Integration extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'enum', enum: IntegrationType })
  type: IntegrationType;

  @Column({ type: 'varchar', length: 100 })
  provider: string; // e.g., 'stripe', 'paypal', '1C', 'quickbooks'

  @Column({ type: 'enum', enum: IntegrationStatus, default: IntegrationStatus.INACTIVE })
  status: IntegrationStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  api_endpoint: string | null;

  /**
   * API key - encrypted at rest using AES-256-GCM
   * SEC-CRYPTO-01: Sensitive credentials encryption
   */
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    transformer: encryptedColumnTransformer,
  })
  api_key: string | null;

  /**
   * API secret - encrypted at rest using AES-256-GCM
   * SEC-CRYPTO-01: Sensitive credentials encryption
   */
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    transformer: encryptedColumnTransformer,
  })
  api_secret: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  webhook_url: string | null;

  /**
   * Webhook secret - encrypted at rest using AES-256-GCM
   * SEC-CRYPTO-01: Sensitive credentials encryption
   */
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    transformer: encryptedColumnTransformer,
  })
  webhook_secret: string | null;

  @Column({ type: 'integer', default: 0 })
  sync_interval_minutes: number; // 0 = manual only

  @Column({ type: 'timestamp', nullable: true })
  last_sync_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  next_sync_at: Date | null;

  @Column({ type: 'boolean', default: false })
  auto_sync_enabled: boolean;

  @Column({ type: 'jsonb', default: {} })
  config: {
    timeout?: number;
    retry_attempts?: number;
    rate_limit?: number;
    custom_headers?: Record<string, string>;
    mapping?: Record<string, unknown>;
    [key: string]: unknown;
  };

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    version?: string;
    last_error?: string;
    stats?: {
      total_calls?: number;
      successful_calls?: number;
      failed_calls?: number;
    };
    [key: string]: unknown;
  };

  @OneToMany(() => IntegrationLog, (log) => log.integration)
  logs: IntegrationLog[];
}
