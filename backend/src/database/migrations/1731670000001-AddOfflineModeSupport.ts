import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddOfflineModeSupport1731670000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add operation_date to tasks table
    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'operation_date',
        type: 'timestamp with time zone',
        isNullable: true,
        comment:
          'Дата фактического выполнения операции (может отличаться от completed_at при вводе исторических данных)',
      }),
    );

    // Add pending_photos flag to tasks table
    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'pending_photos',
        type: 'boolean',
        default: false,
        comment: 'Задача завершена, но фото еще не загружены',
      }),
    );

    // Add offline_completed flag to tasks table
    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'offline_completed',
        type: 'boolean',
        default: false,
        comment: 'Задача выполнена в офлайн-режиме',
      }),
    );

    // Add index for pending_photos for quick lookup of incomplete tasks
    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'IDX_tasks_pending_photos',
        columnNames: ['pending_photos'],
      }),
    );

    // Add operation_date to inventory_movements table
    await queryRunner.addColumn(
      'inventory_movements',
      new TableColumn({
        name: 'operation_date',
        type: 'timestamp with time zone',
        isNullable: true,
        comment:
          'Дата фактического выполнения операции (может отличаться от created_at при вводе исторических данных)',
      }),
    );

    // Add index for operation_date for filtering historical data
    await queryRunner.createIndex(
      'inventory_movements',
      new TableIndex({
        name: 'IDX_inventory_movements_operation_date',
        columnNames: ['operation_date'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('inventory_movements', 'IDX_inventory_movements_operation_date');
    await queryRunner.dropIndex('tasks', 'IDX_tasks_pending_photos');

    // Drop columns from inventory_movements
    await queryRunner.dropColumn('inventory_movements', 'operation_date');

    // Drop columns from tasks
    await queryRunner.dropColumn('tasks', 'offline_completed');
    await queryRunner.dropColumn('tasks', 'pending_photos');
    await queryRunner.dropColumn('tasks', 'operation_date');
  }
}
