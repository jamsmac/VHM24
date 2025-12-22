import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * Add refresh_token_hint column to user_sessions table
 *
 * This migration addresses HIGH-002 security/performance issue:
 * - Previous: findSessionByRefreshToken() loaded ALL active sessions
 *   and performed O(n) bcrypt comparisons
 * - After: O(1) index lookup using token hint, then bcrypt only for matches
 *
 * The hint is first 16 characters of SHA-256 hash of the refresh token,
 * allowing fast indexed lookup before expensive bcrypt comparison.
 */
export class AddRefreshTokenHintToUserSessions1734900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add refresh_token_hint column
    await queryRunner.addColumn(
      'user_sessions',
      new TableColumn({
        name: 'refresh_token_hint',
        type: 'varchar',
        length: '16',
        isNullable: true,
        comment: 'First 16 chars of SHA-256 hash for fast O(1) token lookup',
      }),
    );

    // Create index for fast lookup
    await queryRunner.createIndex(
      'user_sessions',
      new TableIndex({
        name: 'idx_user_sessions_token_hint',
        columnNames: ['refresh_token_hint'],
        where: 'is_active = true',
      }),
    );

    // Log migration info
    console.log('✅ Added refresh_token_hint column to user_sessions');
    console.log('   - Existing sessions will have NULL hint until next refresh');
    console.log('   - New sessions will automatically get hint on creation');
    console.log('   - Backward compatibility: fallback lookup for NULL hints');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.dropIndex('user_sessions', 'idx_user_sessions_token_hint');

    // Drop column
    await queryRunner.dropColumn('user_sessions', 'refresh_token_hint');

    console.log('✅ Removed refresh_token_hint column from user_sessions');
  }
}
