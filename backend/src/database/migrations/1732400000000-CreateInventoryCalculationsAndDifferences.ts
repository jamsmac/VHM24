import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Sprint 4: Inventory Calculations and Differences
 *
 * Creates tables for:
 * - REQ-STK-CALC-02: Actual inventory counts (фактические остатки)
 * - REQ-STK-CALC-04: Difference thresholds (пороги расхождений)
 *
 * Tables:
 * 1. inventory_actual_counts - хранение фактических замеров остатков
 * 2. inventory_difference_thresholds - настройка порогов для расхождений
 */
export class CreateInventoryCalculationsAndDifferences1732400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================================================================
    // 1. inventory_actual_counts - Фактические остатки (REQ-STK-CALC-02)
    // =========================================================================
    await queryRunner.createTable(
      new Table({
        name: 'inventory_actual_counts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'deleted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          // Nomenclature reference
          {
            name: 'nomenclature_id',
            type: 'uuid',
            isNullable: false,
          },
          // Level identification
          {
            name: 'level_type',
            type: 'enum',
            enum: ['WAREHOUSE', 'OPERATOR', 'MACHINE'],
            isNullable: false,
          },
          {
            name: 'level_ref_id',
            type: 'uuid',
            isNullable: false,
            comment: 'warehouse_id OR operator_id OR machine_id depending on level_type',
          },
          // Count details
          {
            name: 'counted_at',
            type: 'timestamp with time zone',
            isNullable: false,
            comment: 'Дата и время фактического замера',
          },
          {
            name: 'counted_by_user_id',
            type: 'uuid',
            isNullable: false,
            comment: 'Пользователь, который провёл инвентаризацию',
          },
          {
            name: 'actual_quantity',
            type: 'decimal',
            precision: 15,
            scale: 3,
            isNullable: false,
            comment: 'Фактическое количество',
          },
          {
            name: 'unit_of_measure',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'Единица измерения',
          },
          // Additional info
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
            comment: 'Примечания к замеру',
          },
          {
            name: 'session_id',
            type: 'uuid',
            isNullable: true,
            comment: 'ID сессии инвентаризации (для группировки замеров)',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Дополнительные метаданные (фото, координаты, и т.д.)',
          },
        ],
      }),
      true,
    );

    // Indexes for inventory_actual_counts
    await queryRunner.createIndex(
      'inventory_actual_counts',
      new TableIndex({
        name: 'IDX_actual_counts_nomenclature',
        columnNames: ['nomenclature_id'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_actual_counts',
      new TableIndex({
        name: 'IDX_actual_counts_level',
        columnNames: ['level_type', 'level_ref_id'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_actual_counts',
      new TableIndex({
        name: 'IDX_actual_counts_counted_at',
        columnNames: ['counted_at'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_actual_counts',
      new TableIndex({
        name: 'IDX_actual_counts_session',
        columnNames: ['session_id'],
      }),
    );

    // Composite index for quick lookups
    await queryRunner.createIndex(
      'inventory_actual_counts',
      new TableIndex({
        name: 'IDX_actual_counts_lookup',
        columnNames: ['nomenclature_id', 'level_type', 'level_ref_id', 'counted_at'],
      }),
    );

    // Foreign keys for inventory_actual_counts
    await queryRunner.createForeignKey(
      'inventory_actual_counts',
      new TableForeignKey({
        name: 'FK_actual_counts_nomenclature',
        columnNames: ['nomenclature_id'],
        referencedTableName: 'nomenclature',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'inventory_actual_counts',
      new TableForeignKey({
        name: 'FK_actual_counts_counted_by',
        columnNames: ['counted_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // =========================================================================
    // 2. inventory_difference_thresholds - Пороги расхождений (REQ-STK-CALC-04, REQ-ANL-05)
    // =========================================================================
    await queryRunner.createTable(
      new Table({
        name: 'inventory_difference_thresholds',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'deleted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          // Threshold scope
          {
            name: 'threshold_type',
            type: 'enum',
            enum: ['NOMENCLATURE', 'CATEGORY', 'LOCATION', 'MACHINE', 'OPERATOR', 'GLOBAL'],
            isNullable: false,
            comment:
              'Тип порога: по товару, категории, локации, аппарату, оператору или глобальный',
          },
          {
            name: 'reference_id',
            type: 'uuid',
            isNullable: true,
            comment:
              'ID объекта (nomenclature_id, location_id, machine_id, operator_id) или NULL для GLOBAL',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
            comment: 'Название правила',
          },
          // Threshold values
          {
            name: 'threshold_abs',
            type: 'decimal',
            precision: 15,
            scale: 3,
            isNullable: true,
            comment: 'Абсолютное значение порога (если NULL - не применяется)',
          },
          {
            name: 'threshold_rel',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
            comment: 'Относительное значение порога в процентах (если NULL - не применяется)',
          },
          {
            name: 'severity_level',
            type: 'enum',
            enum: ['INFO', 'WARNING', 'CRITICAL'],
            default: "'WARNING'",
            isNullable: false,
            comment: 'Уровень серьёзности при превышении',
          },
          // Actions on threshold breach
          {
            name: 'create_incident',
            type: 'boolean',
            default: false,
            isNullable: false,
            comment: 'Создавать ли инцидент при превышении',
          },
          {
            name: 'create_task',
            type: 'boolean',
            default: false,
            isNullable: false,
            comment: 'Создавать ли задачу на разбор при превышении',
          },
          {
            name: 'notify_users',
            type: 'jsonb',
            isNullable: true,
            comment: 'Список user_id для уведомлений: ["uuid1", "uuid2"]',
          },
          {
            name: 'notify_roles',
            type: 'jsonb',
            isNullable: true,
            comment: 'Список ролей для уведомлений: ["ADMIN", "MANAGER"]',
          },
          // Status
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'priority',
            type: 'integer',
            default: 0,
            isNullable: false,
            comment: 'Приоритет применения (больше = выше приоритет)',
          },
          // Metadata
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_by_user_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Indexes for inventory_difference_thresholds
    await queryRunner.createIndex(
      'inventory_difference_thresholds',
      new TableIndex({
        name: 'IDX_thresholds_type',
        columnNames: ['threshold_type'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_difference_thresholds',
      new TableIndex({
        name: 'IDX_thresholds_reference',
        columnNames: ['reference_id'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_difference_thresholds',
      new TableIndex({
        name: 'IDX_thresholds_active',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_difference_thresholds',
      new TableIndex({
        name: 'IDX_thresholds_priority',
        columnNames: ['priority', 'is_active'],
      }),
    );

    // Foreign key for created_by
    await queryRunner.createForeignKey(
      'inventory_difference_thresholds',
      new TableForeignKey({
        name: 'FK_thresholds_created_by',
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Insert default global threshold
    await queryRunner.query(`
      INSERT INTO inventory_difference_thresholds (
        threshold_type,
        reference_id,
        name,
        threshold_abs,
        threshold_rel,
        severity_level,
        create_incident,
        create_task,
        is_active,
        priority,
        description
      ) VALUES (
        'GLOBAL',
        NULL,
        'Глобальный порог расхождений по умолчанию',
        NULL,
        10.00,
        'WARNING',
        false,
        false,
        true,
        0,
        'Применяется ко всем товарам, если не настроены специфичные пороги. Превышение 10% считается предупреждением.'
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.dropForeignKey('inventory_difference_thresholds', 'FK_thresholds_created_by');
    await queryRunner.dropForeignKey('inventory_actual_counts', 'FK_actual_counts_counted_by');
    await queryRunner.dropForeignKey('inventory_actual_counts', 'FK_actual_counts_nomenclature');

    // Drop tables
    await queryRunner.dropTable('inventory_difference_thresholds');
    await queryRunner.dropTable('inventory_actual_counts');
  }
}
