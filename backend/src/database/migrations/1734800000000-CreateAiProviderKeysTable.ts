import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the ai_provider_keys table for storing encrypted AI provider API keys
 *
 * Supports multiple AI providers with encrypted key storage,
 * usage tracking, and default key selection per provider.
 */
export class CreateAiProviderKeysTable1734800000000 implements MigrationInterface {
  name = 'CreateAiProviderKeysTable1734800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_provider') THEN
          CREATE TYPE ai_provider AS ENUM (
            'openai',
            'anthropic',
            'perplexity',
            'google',
            'mistral',
            'custom'
          );
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_provider_key_status') THEN
          CREATE TYPE ai_provider_key_status AS ENUM (
            'active',
            'inactive',
            'error'
          );
        END IF;
      END$$;
    `);

    // Create ai_provider_keys table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_provider_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider ai_provider NOT NULL,
        name VARCHAR(100) NOT NULL,
        api_key VARCHAR(1000) NOT NULL,
        api_endpoint VARCHAR(500),
        model_preference VARCHAR(100),
        status ai_provider_key_status DEFAULT 'active',
        is_default BOOLEAN DEFAULT false,
        last_used_at TIMESTAMP WITH TIME ZONE,
        last_error VARCHAR(500),
        usage_count INTEGER DEFAULT 0,
        rate_limit INTEGER,
        metadata JSONB DEFAULT '{}',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      );
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_provider_keys_provider
      ON ai_provider_keys(provider);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_provider_keys_status
      ON ai_provider_keys(status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_provider_keys_deleted_at
      ON ai_provider_keys(deleted_at);
    `);

    // Partial unique index for default key per provider
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_provider_keys_default_per_provider
      ON ai_provider_keys(provider)
      WHERE is_default = true AND deleted_at IS NULL;
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE ai_provider_keys IS 'Encrypted API keys for AI providers (OpenAI, Claude, etc.)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN ai_provider_keys.api_key IS 'AES-256-GCM encrypted API key';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ai_provider_keys;`);
    await queryRunner.query(`DROP TYPE IF EXISTS ai_provider_key_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS ai_provider;`);
  }
}
