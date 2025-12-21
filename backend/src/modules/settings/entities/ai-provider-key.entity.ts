import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { encryptedColumnTransformer } from '@common/utils/crypto.util';

/**
 * Supported AI providers
 */
export enum AiProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  PERPLEXITY = 'perplexity',
  GOOGLE = 'google',
  MISTRAL = 'mistral',
  CUSTOM = 'custom',
}

/**
 * AI provider key status
 */
export enum AiProviderKeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

/**
 * AI Provider API Key entity
 *
 * Stores encrypted API keys for various AI providers.
 * Allows dynamic management of AI service credentials without redeployment.
 *
 * SEC-CRYPTO-01: API keys are encrypted at rest using AES-256-GCM
 */
@Entity('ai_provider_keys')
@Index(['provider', 'is_default'], { unique: true, where: 'is_default = true AND deleted_at IS NULL' })
export class AiProviderKey extends BaseEntity {
  /**
   * AI provider type
   */
  @Column({
    type: 'enum',
    enum: AiProvider,
  })
  @Index()
  provider: AiProvider;

  /**
   * Human-readable name for this key configuration
   * e.g., "Production OpenAI Key", "Claude API for Import"
   */
  @Column({ type: 'varchar', length: 100 })
  name: string;

  /**
   * Encrypted API key
   * Uses AES-256-GCM encryption via encryptedColumnTransformer
   */
  @Column({
    type: 'varchar',
    length: 1000,
    transformer: encryptedColumnTransformer,
  })
  api_key: string;

  /**
   * Custom API endpoint (for custom providers or self-hosted models)
   * e.g., "https://api.custom-llm.com/v1"
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  api_endpoint: string | null;

  /**
   * Preferred model for this provider
   * e.g., "gpt-4-turbo", "claude-3-opus", "llama-3.1-70b"
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  model_preference: string | null;

  /**
   * Key status
   */
  @Column({
    type: 'enum',
    enum: AiProviderKeyStatus,
    default: AiProviderKeyStatus.ACTIVE,
  })
  @Index()
  status: AiProviderKeyStatus;

  /**
   * Whether this is the default key for the provider
   */
  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  /**
   * When this key was last used
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_used_at: Date | null;

  /**
   * Last error message if status is ERROR
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  last_error: string | null;

  /**
   * Number of times this key has been used
   */
  @Column({ type: 'integer', default: 0 })
  usage_count: number;

  /**
   * Rate limit (requests per minute), null for unlimited
   */
  @Column({ type: 'integer', nullable: true })
  rate_limit: number | null;

  /**
   * Additional metadata (organization ID, project ID, etc.)
   */
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  /**
   * Description or notes about this key
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;
}
