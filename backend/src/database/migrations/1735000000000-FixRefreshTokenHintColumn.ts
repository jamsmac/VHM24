import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix refresh_token_hint column - ensure it exists
 *
 * This is a hotfix migration to ensure the column exists
 * Uses IF NOT EXISTS to be idempotent
 */
export class FixRefreshTokenHintColumn1735000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column exists
    const result = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_sessions' AND column_name = 'refresh_token_hint'
    `);

    if (result.length === 0) {
      console.log('🔧 Adding missing refresh_token_hint column...');

      // Add the column
      await queryRunner.query(`
        ALTER TABLE user_sessions
        ADD COLUMN refresh_token_hint VARCHAR(16)
      `);

      // Add comment
      await queryRunner.query(`
        COMMENT ON COLUMN user_sessions.refresh_token_hint
        IS 'First 16 chars of SHA-256 hash for fast O(1) token lookup'
      `);

      // Create index if not exists
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hint
        ON user_sessions (refresh_token_hint)
        WHERE is_active = true
      `);

      console.log('✅ refresh_token_hint column added successfully');
    } else {
      console.log('✅ refresh_token_hint column already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This is a fix migration, down is no-op
    console.log('FixRefreshTokenHintColumn down() - no action needed');
  }
}
