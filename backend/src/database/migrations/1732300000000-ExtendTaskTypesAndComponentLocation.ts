import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendTaskTypesAndComponentLocation1732300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Расширяем TaskType enum новыми типами задач
    await queryRunner.query(`
      ALTER TYPE task_type_enum ADD VALUE IF NOT EXISTS 'inspection';
      ALTER TYPE task_type_enum ADD VALUE IF NOT EXISTS 'replace_hopper';
      ALTER TYPE task_type_enum ADD VALUE IF NOT EXISTS 'replace_grinder';
      ALTER TYPE task_type_enum ADD VALUE IF NOT EXISTS 'replace_brew_unit';
      ALTER TYPE task_type_enum ADD VALUE IF NOT EXISTS 'replace_mixer';
    `);

    // 2. Создаём enum для типов местоположения компонентов
    await queryRunner.query(`
      CREATE TYPE component_location_type_enum AS ENUM (
        'machine',
        'warehouse',
        'washing',
        'drying',
        'repair'
      );
    `);

    // 3. Модифицируем таблицу equipment_components
    // Убираем обязательность machine_id
    await queryRunner.query(`
      ALTER TABLE equipment_components
      ALTER COLUMN machine_id DROP NOT NULL;
    `);

    // Изменяем поведение FK при удалении машины
    await queryRunner.query(`
      ALTER TABLE equipment_components
      DROP CONSTRAINT IF EXISTS "FK_equipment_components_machine";
    `);

    await queryRunner.query(`
      ALTER TABLE equipment_components
      ADD CONSTRAINT "FK_equipment_components_machine"
      FOREIGN KEY ("machine_id")
      REFERENCES machines(id)
      ON DELETE SET NULL;
    `);

    // Добавляем поля для отслеживания местоположения
    await queryRunner.query(`
      ALTER TABLE equipment_components
      ADD COLUMN current_location_type component_location_type_enum
      NOT NULL DEFAULT 'warehouse';
    `);

    await queryRunner.query(`
      ALTER TABLE equipment_components
      ADD COLUMN current_location_ref VARCHAR(100) NULL;
    `);

    // Создаём индекс для поиска по местоположению
    await queryRunner.query(`
      CREATE INDEX "IDX_equipment_components_location_type"
      ON equipment_components(current_location_type);
    `);

    // 4. Обновляем существующие записи
    // Компоненты с machine_id получают location_type = 'machine'
    await queryRunner.query(`
      UPDATE equipment_components
      SET
        current_location_type = 'machine',
        current_location_ref = machine_id::varchar
      WHERE machine_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Откат изменений в обратном порядке

    // 1. Удаляем индекс
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_equipment_components_location_type";
    `);

    // 2. Удаляем новые колонки
    await queryRunner.query(`
      ALTER TABLE equipment_components DROP COLUMN IF EXISTS current_location_ref;
    `);

    await queryRunner.query(`
      ALTER TABLE equipment_components DROP COLUMN IF EXISTS current_location_type;
    `);

    // 3. Восстанавливаем обязательность machine_id
    // ВНИМАНИЕ: Это может не сработать, если есть NULL значения
    await queryRunner.query(`
      ALTER TABLE equipment_components
      ALTER COLUMN machine_id SET NOT NULL;
    `);

    // Восстанавливаем FK
    await queryRunner.query(`
      ALTER TABLE equipment_components
      DROP CONSTRAINT IF EXISTS "FK_equipment_components_machine";
    `);

    await queryRunner.query(`
      ALTER TABLE equipment_components
      ADD CONSTRAINT "FK_equipment_components_machine"
      FOREIGN KEY ("machine_id")
      REFERENCES machines(id)
      ON DELETE CASCADE;
    `);

    // 4. Удаляем enum
    await queryRunner.query(`
      DROP TYPE IF EXISTS component_location_type_enum;
    `);

    // 5. Откат расширения TaskType enum невозможен в PostgreSQL
    // Новые значения останутся в enum, но не будут использоваться
    console.log(
      'WARNING: Cannot remove values from task_type_enum. ' +
        'New values will remain but will not be used.',
    );
  }
}
