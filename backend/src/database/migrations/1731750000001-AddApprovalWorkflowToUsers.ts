import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddApprovalWorkflowToUsers1731750000001 implements MigrationInterface {
  name = 'AddApprovalWorkflowToUsers1731750000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Alter UserStatus enum to include new values
    await queryRunner.query(`
      ALTER TYPE "public"."users_status_enum"
      ADD VALUE 'pending' BEFORE 'active'
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."users_status_enum"
      ADD VALUE 'password_change_required' AFTER 'active'
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."users_status_enum"
      ADD VALUE 'rejected' AFTER 'suspended'
    `);

    // Add username column (unique, nullable)
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'username',
        type: 'varchar',
        length: '50',
        isNullable: true,
        comment: 'Unique username for login (generated on approval)',
      }),
    );

    // Add password_changed_by_user column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'password_changed_by_user',
        type: 'boolean',
        default: false,
        comment: 'Whether user has changed their password after first login',
      }),
    );

    // Add approved_by_id column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'approved_by_id',
        type: 'uuid',
        isNullable: true,
        comment: 'ID of admin/super_admin who approved this user',
      }),
    );

    // Add approved_at column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'approved_at',
        type: 'timestamp with time zone',
        isNullable: true,
        comment: 'Timestamp when user was approved',
      }),
    );

    // Add rejected_by_id column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'rejected_by_id',
        type: 'uuid',
        isNullable: true,
        comment: 'ID of admin/super_admin who rejected this user',
      }),
    );

    // Add rejected_at column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'rejected_at',
        type: 'timestamp with time zone',
        isNullable: true,
        comment: 'Timestamp when user was rejected',
      }),
    );

    // Add rejection_reason column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'rejection_reason',
        type: 'text',
        isNullable: true,
        comment: 'Reason for user rejection',
      }),
    );

    // Create index on username for faster lookups
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_username',
        columnNames: ['username'],
        where: 'username IS NOT NULL',
      }),
    );

    // Create index on status for finding pending users
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_status',
        columnNames: ['status'],
      }),
    );

    // Create index on approved_at for finding recently approved users
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_approved_at',
        columnNames: ['approved_at'],
      }),
    );

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "fk_users_approved_by_id"
      FOREIGN KEY ("approved_by_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "fk_users_rejected_by_id"
      FOREIGN KEY ("rejected_by_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
    `);

    // Update default status for existing users from 'active' to 'active' (no change)
    // New registrations will use 'pending' status by default
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "status"
      SET DEFAULT 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('users', 'fk_users_rejected_by_id');
    await queryRunner.dropForeignKey('users', 'fk_users_approved_by_id');

    // Drop indexes
    await queryRunner.dropIndex('users', 'idx_users_approved_at');
    await queryRunner.dropIndex('users', 'idx_users_status');
    await queryRunner.dropIndex('users', 'idx_users_username');

    // Drop columns
    await queryRunner.dropColumn('users', 'rejection_reason');
    await queryRunner.dropColumn('users', 'rejected_at');
    await queryRunner.dropColumn('users', 'rejected_by_id');
    await queryRunner.dropColumn('users', 'approved_at');
    await queryRunner.dropColumn('users', 'approved_by_id');
    await queryRunner.dropColumn('users', 'password_changed_by_user');
    await queryRunner.dropColumn('users', 'username');

    // Reset default status
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "status"
      SET DEFAULT 'active'
    `);

    // Note: Cannot easily remove enum values in PostgreSQL, so we leave them
    // The old 'pending', 'password_change_required', 'rejected' values will remain unused
  }
}
