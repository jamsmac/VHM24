import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateRecipeSnapshotsTable1731680000003 implements MigrationInterface {
  name = 'CreateRecipeSnapshotsTable1731680000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create recipe_snapshots table
    await queryRunner.createTable(
      new Table({
        name: 'recipe_snapshots',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'recipe_id',
            type: 'uuid',
          },
          {
            name: 'version',
            type: 'integer',
          },
          {
            name: 'snapshot',
            type: 'jsonb',
          },
          {
            name: 'valid_from',
            type: 'timestamp with time zone',
          },
          {
            name: 'valid_to',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'created_by_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'change_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'checksum',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'recipe_snapshots',
      new TableIndex({
        name: 'idx_recipe_snapshots_recipe_version',
        columnNames: ['recipe_id', 'version'],
      }),
    );

    await queryRunner.createIndex(
      'recipe_snapshots',
      new TableIndex({
        name: 'idx_recipe_snapshots_valid_from',
        columnNames: ['valid_from'],
      }),
    );

    await queryRunner.createIndex(
      'recipe_snapshots',
      new TableIndex({
        name: 'idx_recipe_snapshots_valid_to',
        columnNames: ['valid_to'],
      }),
    );

    // Foreign key to recipes
    await queryRunner.createForeignKey(
      'recipe_snapshots',
      new TableForeignKey({
        name: 'fk_recipe_snapshots_recipe',
        columnNames: ['recipe_id'],
        referencedTableName: 'recipes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Foreign key to users (created_by)
    await queryRunner.createForeignKey(
      'recipe_snapshots',
      new TableForeignKey({
        name: 'fk_recipe_snapshots_created_by',
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Add recipe_snapshot_id and recipe_version to transactions table
    await queryRunner.query(`
      ALTER TABLE transactions
      ADD COLUMN recipe_snapshot_id UUID,
      ADD COLUMN recipe_version INTEGER;
    `);

    // Create index on recipe_snapshot_id
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'idx_transactions_recipe_snapshot',
        columnNames: ['recipe_snapshot_id'],
      }),
    );

    // Foreign key to recipe_snapshots
    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        name: 'fk_transactions_recipe_snapshot',
        columnNames: ['recipe_snapshot_id'],
        referencedTableName: 'recipe_snapshots',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE recipe_snapshots IS 'Версии рецептов для исторической точности отчетов';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN recipe_snapshots.version IS 'Номер версии (инкрементальный)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN recipe_snapshots.valid_from IS 'Когда версия стала активной';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN recipe_snapshots.valid_to IS 'Когда версия была заменена (NULL = текущая)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN recipe_snapshots.checksum IS 'SHA-256 checksum для проверки целостности';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN transactions.recipe_snapshot_id IS 'Версия рецепта на момент продажи (для исторической точности)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.dropForeignKey('transactions', 'fk_transactions_recipe_snapshot');
    await queryRunner.dropForeignKey('recipe_snapshots', 'fk_recipe_snapshots_created_by');
    await queryRunner.dropForeignKey('recipe_snapshots', 'fk_recipe_snapshots_recipe');

    // Drop indexes
    await queryRunner.dropIndex('transactions', 'idx_transactions_recipe_snapshot');
    await queryRunner.dropIndex('recipe_snapshots', 'idx_recipe_snapshots_valid_to');
    await queryRunner.dropIndex('recipe_snapshots', 'idx_recipe_snapshots_valid_from');
    await queryRunner.dropIndex('recipe_snapshots', 'idx_recipe_snapshots_recipe_version');

    // Drop columns from transactions
    await queryRunner.query(`
      ALTER TABLE transactions
      DROP COLUMN recipe_version,
      DROP COLUMN recipe_snapshot_id;
    `);

    // Drop table
    await queryRunner.dropTable('recipe_snapshots', true);
  }
}
