import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddCryptoSecurityFieldsToTelegramUsers1731700000002 implements MigrationInterface {
  name = 'AddCryptoSecurityFieldsToTelegramUsers1731700000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add verification_code_generated_at column
    await queryRunner.addColumn(
      'telegram_users',
      new TableColumn({
        name: 'verification_code_generated_at',
        type: 'timestamp with time zone',
        isNullable: true,
        comment: 'Timestamp when verification code was generated (used for 15-minute expiration)',
      }),
    );

    // Add verification_attempts_count column
    await queryRunner.addColumn(
      'telegram_users',
      new TableColumn({
        name: 'verification_attempts_count',
        type: 'integer',
        default: 0,
        comment: 'Counter for verification attempts (max 5 per 15 minutes)',
      }),
    );

    // Add verification_attempts_reset_at column
    await queryRunner.addColumn(
      'telegram_users',
      new TableColumn({
        name: 'verification_attempts_reset_at',
        type: 'timestamp with time zone',
        isNullable: true,
        comment: 'Timestamp when verification attempts counter will reset',
      }),
    );

    // Create index for faster lookups of records needing cleanup
    await queryRunner.createIndex(
      'telegram_users',
      new TableIndex({
        name: 'idx_telegram_users_verification_code_generated_at',
        columnNames: ['verification_code_generated_at'],
      }),
    );

    // Add table comment
    await queryRunner.query(`
      COMMENT ON COLUMN telegram_users.verification_code_generated_at IS 'Timestamp when verification code was generated for 15-minute expiration check';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN telegram_users.verification_attempts_count IS 'Counter for failed verification attempts (resets after VERIFICATION_ATTEMPT_WINDOW_MINUTES)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN telegram_users.verification_attempts_reset_at IS 'Timestamp when verification attempts counter will reset to 0';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex(
      'telegram_users',
      'idx_telegram_users_verification_code_generated_at',
    );

    // Drop columns
    await queryRunner.dropColumn('telegram_users', 'verification_attempts_reset_at');
    await queryRunner.dropColumn('telegram_users', 'verification_attempts_count');
    await queryRunner.dropColumn('telegram_users', 'verification_code_generated_at');
  }
}
