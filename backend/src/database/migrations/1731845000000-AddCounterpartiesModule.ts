import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class AddCounterpartiesModule1731845000000 implements MigrationInterface {
  name = 'AddCounterpartiesModule1731845000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create counterparties table
    await queryRunner.createTable(
      new Table({
        name: 'counterparties',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['supplier', 'landlord', 'service', 'other'],
            default: "'other'",
          },
          {
            name: 'inn',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'bank_account',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'bank_name',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'bank_mfo',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'phone_secondary',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'contact_person',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'contact_person_position',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'total_purchases',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'total_payments',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'last_transaction_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
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

    // Create indexes for counterparties
    await queryRunner.createIndex(
      'counterparties',
      new TableIndex({
        name: 'IDX_counterparties_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'counterparties',
      new TableIndex({
        name: 'IDX_counterparties_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'counterparties',
      new TableIndex({
        name: 'IDX_counterparties_inn',
        columnNames: ['inn'],
      }),
    );

    await queryRunner.createIndex(
      'counterparties',
      new TableIndex({
        name: 'IDX_counterparties_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'counterparties',
      new TableIndex({
        name: 'IDX_counterparties_is_active',
        columnNames: ['is_active'],
      }),
    );

    // Add counterparty_id column to transactions table
    await queryRunner.addColumn(
      'transactions',
      new TableColumn({
        name: 'counterparty_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Create foreign key for counterparty_id in transactions
    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        name: 'FK_transactions_counterparty',
        columnNames: ['counterparty_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'counterparties',
        onDelete: 'SET NULL',
      }),
    );

    // Add index for counterparty_id in transactions
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_counterparty_id',
        columnNames: ['counterparty_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key and index from transactions
    await queryRunner.dropIndex('transactions', 'IDX_transactions_counterparty_id');
    await queryRunner.dropForeignKey('transactions', 'FK_transactions_counterparty');
    await queryRunner.dropColumn('transactions', 'counterparty_id');

    // Drop counterparties table indexes
    await queryRunner.dropIndex('counterparties', 'IDX_counterparties_is_active');
    await queryRunner.dropIndex('counterparties', 'IDX_counterparties_type');
    await queryRunner.dropIndex('counterparties', 'IDX_counterparties_inn');
    await queryRunner.dropIndex('counterparties', 'IDX_counterparties_code');
    await queryRunner.dropIndex('counterparties', 'IDX_counterparties_organization_id');

    // Drop counterparties table
    await queryRunner.dropTable('counterparties');
  }
}
