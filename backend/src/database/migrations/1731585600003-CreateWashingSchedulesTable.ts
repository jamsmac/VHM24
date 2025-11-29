import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateWashingSchedulesTable1731585600003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create washing_frequency enum
    await queryRunner.query(`
      CREATE TYPE washing_frequency_enum AS ENUM (
        'daily',
        'weekly',
        'biweekly',
        'monthly',
        'custom'
      );
    `);

    // Create washing_schedules table
    await queryRunner.createTable(
      new Table({
        name: 'washing_schedules',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'machine_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'frequency',
            type: 'washing_frequency_enum',
            isNullable: false,
          },
          {
            name: 'interval_days',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'component_types',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'instructions',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'last_wash_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'next_wash_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'last_washed_by_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'last_wash_task_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'auto_create_tasks',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'notification_days_before',
            type: 'integer',
            default: 1,
            isNullable: false,
          },
          {
            name: 'required_materials',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'estimated_duration_minutes',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
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
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
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
      'washing_schedules',
      new TableIndex({
        name: 'IDX_washing_schedules_machine_id',
        columnNames: ['machine_id'],
      }),
    );

    await queryRunner.createIndex(
      'washing_schedules',
      new TableIndex({
        name: 'IDX_washing_schedules_next_wash_date',
        columnNames: ['next_wash_date'],
      }),
    );

    // Create foreign key to machines table
    await queryRunner.createForeignKey(
      'washing_schedules',
      new TableForeignKey({
        name: 'FK_washing_schedules_machine',
        columnNames: ['machine_id'],
        referencedTableName: 'machines',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('washing_schedules', 'FK_washing_schedules_machine');

    // Drop indexes
    await queryRunner.dropIndex('washing_schedules', 'IDX_washing_schedules_next_wash_date');
    await queryRunner.dropIndex('washing_schedules', 'IDX_washing_schedules_machine_id');

    // Drop table
    await queryRunner.dropTable('washing_schedules');

    // Drop enum
    await queryRunner.query('DROP TYPE washing_frequency_enum');
  }
}
