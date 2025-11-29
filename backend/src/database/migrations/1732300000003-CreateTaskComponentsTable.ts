import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateTaskComponentsTable1732300000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Создаём enum для ролей компонентов в задачах
    await queryRunner.query(`
      CREATE TYPE component_role_enum AS ENUM (
        'old',
        'new',
        'target'
      );
    `);

    // 2. Создаём таблицу task_components
    await queryRunner.createTable(
      new Table({
        name: 'task_components',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'task_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'component_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'component_role_enum',
            isNullable: false,
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

    // 3. Создаём индексы
    await queryRunner.createIndex(
      'task_components',
      new TableIndex({
        name: 'IDX_task_components_task_id',
        columnNames: ['task_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_components',
      new TableIndex({
        name: 'IDX_task_components_component_id',
        columnNames: ['component_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_components',
      new TableIndex({
        name: 'IDX_task_components_role',
        columnNames: ['role'],
      }),
    );

    // Составной индекс для быстрого поиска комбинации задача+роль
    await queryRunner.createIndex(
      'task_components',
      new TableIndex({
        name: 'IDX_task_components_task_role',
        columnNames: ['task_id', 'role'],
      }),
    );

    // 4. Создаём внешние ключи
    await queryRunner.createForeignKey(
      'task_components',
      new TableForeignKey({
        name: 'FK_task_components_task',
        columnNames: ['task_id'],
        referencedTableName: 'tasks',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'task_components',
      new TableForeignKey({
        name: 'FK_task_components_component',
        columnNames: ['component_id'],
        referencedTableName: 'equipment_components',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT', // Не позволяем удалять компонент, если он привязан к задаче
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем FK
    await queryRunner.dropForeignKey('task_components', 'FK_task_components_component');
    await queryRunner.dropForeignKey('task_components', 'FK_task_components_task');

    // Удаляем индексы
    await queryRunner.dropIndex('task_components', 'IDX_task_components_task_role');
    await queryRunner.dropIndex('task_components', 'IDX_task_components_role');
    await queryRunner.dropIndex('task_components', 'IDX_task_components_component_id');
    await queryRunner.dropIndex('task_components', 'IDX_task_components_task_id');

    // Удаляем таблицу
    await queryRunner.dropTable('task_components');

    // Удаляем enum
    await queryRunner.query('DROP TYPE component_role_enum');
  }
}
