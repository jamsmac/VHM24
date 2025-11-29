import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateComponentMovementsTable1732300000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Создаём enum для типов перемещений
    await queryRunner.query(`
      CREATE TYPE movement_type_enum AS ENUM (
        'install',
        'remove',
        'send_to_wash',
        'return_from_wash',
        'send_to_drying',
        'return_from_drying',
        'move_to_warehouse',
        'move_to_machine',
        'send_to_repair',
        'return_from_repair'
      );
    `);

    // 2. Создаём таблицу component_movements
    await queryRunner.createTable(
      new Table({
        name: 'component_movements',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'component_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'from_location_type',
            type: 'component_location_type_enum',
            isNullable: false,
          },
          {
            name: 'from_location_ref',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'to_location_type',
            type: 'component_location_type_enum',
            isNullable: false,
          },
          {
            name: 'to_location_ref',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'movement_type',
            type: 'movement_type_enum',
            isNullable: false,
          },
          {
            name: 'related_machine_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'task_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'performed_by_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'moved_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'comment',
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

    // 3. Создаём индексы
    await queryRunner.createIndex(
      'component_movements',
      new TableIndex({
        name: 'IDX_component_movements_component_id',
        columnNames: ['component_id'],
      }),
    );

    await queryRunner.createIndex(
      'component_movements',
      new TableIndex({
        name: 'IDX_component_movements_moved_at',
        columnNames: ['moved_at'],
      }),
    );

    await queryRunner.createIndex(
      'component_movements',
      new TableIndex({
        name: 'IDX_component_movements_movement_type',
        columnNames: ['movement_type'],
      }),
    );

    await queryRunner.createIndex(
      'component_movements',
      new TableIndex({
        name: 'IDX_component_movements_related_machine_id',
        columnNames: ['related_machine_id'],
      }),
    );

    await queryRunner.createIndex(
      'component_movements',
      new TableIndex({
        name: 'IDX_component_movements_task_id',
        columnNames: ['task_id'],
      }),
    );

    // 4. Создаём внешние ключи
    await queryRunner.createForeignKey(
      'component_movements',
      new TableForeignKey({
        name: 'FK_component_movements_component',
        columnNames: ['component_id'],
        referencedTableName: 'equipment_components',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'component_movements',
      new TableForeignKey({
        name: 'FK_component_movements_machine',
        columnNames: ['related_machine_id'],
        referencedTableName: 'machines',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'component_movements',
      new TableForeignKey({
        name: 'FK_component_movements_task',
        columnNames: ['task_id'],
        referencedTableName: 'tasks',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'component_movements',
      new TableForeignKey({
        name: 'FK_component_movements_user',
        columnNames: ['performed_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем FK
    await queryRunner.dropForeignKey('component_movements', 'FK_component_movements_user');
    await queryRunner.dropForeignKey('component_movements', 'FK_component_movements_task');
    await queryRunner.dropForeignKey('component_movements', 'FK_component_movements_machine');
    await queryRunner.dropForeignKey('component_movements', 'FK_component_movements_component');

    // Удаляем индексы
    await queryRunner.dropIndex('component_movements', 'IDX_component_movements_task_id');
    await queryRunner.dropIndex(
      'component_movements',
      'IDX_component_movements_related_machine_id',
    );
    await queryRunner.dropIndex('component_movements', 'IDX_component_movements_movement_type');
    await queryRunner.dropIndex('component_movements', 'IDX_component_movements_moved_at');
    await queryRunner.dropIndex('component_movements', 'IDX_component_movements_component_id');

    // Удаляем таблицу
    await queryRunner.dropTable('component_movements');

    // Удаляем enum
    await queryRunner.query('DROP TYPE movement_type_enum');
  }
}
