import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateHopperTypesTable1732300000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создаём таблицу hopper_types
    await queryRunner.createTable(
      new Table({
        name: 'hopper_types',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'name_en',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'requires_refrigeration',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'shelf_life_days',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'typical_capacity_kg',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: true,
          },
          {
            name: 'unit_of_measure',
            type: 'varchar',
            length: '20',
            default: "'kg'",
            isNullable: false,
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

    // Создаём индексы
    await queryRunner.createIndex(
      'hopper_types',
      new TableIndex({
        name: 'IDX_hopper_types_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'hopper_types',
      new TableIndex({
        name: 'IDX_hopper_types_category',
        columnNames: ['category'],
      }),
    );

    // Заполняем начальными данными (минимум 8 типов согласно REQ-ASSET-BH-01)
    await queryRunner.query(`
      INSERT INTO hopper_types (code, name, name_en, category, typical_capacity_kg, unit_of_measure, description)
      VALUES
        ('milk_powder', 'Сухое молоко', 'Milk Powder', 'dairy', 2.0, 'kg', 'Сухое молоко для приготовления напитков'),
        ('sugar', 'Сахар', 'Sugar', 'sweeteners', 3.0, 'kg', 'Сахарный песок'),
        ('tea_fruit', 'Чай фруктовый', 'Fruit Tea', 'tea', 1.5, 'kg', 'Растворимый фруктовый чай'),
        ('tea_lemon', 'Чай лимонный', 'Lemon Tea', 'tea', 1.5, 'kg', 'Растворимый чай с лимоном'),
        ('chocolate', 'Горячий шоколад', 'Hot Chocolate', 'chocolate', 2.0, 'kg', 'Растворимый горячий шоколад'),
        ('coffee_instant', 'Растворимый кофе', 'Instant Coffee', 'coffee', 1.0, 'kg', 'Сублимированный растворимый кофе'),
        ('creamer', 'Сливки', 'Creamer', 'dairy', 2.0, 'kg', 'Сухие сливки'),
        ('cappuccino_mix', 'Смесь Капучино', 'Cappuccino Mix', 'coffee', 2.0, 'kg', 'Готовая смесь для капучино'),
        ('cocoa', 'Какао', 'Cocoa', 'chocolate', 2.0, 'kg', 'Какао-порошок'),
        ('milk_substitute', 'Молочный ингредиент', 'Milk Substitute', 'dairy', 2.0, 'kg', 'Заменитель молока')
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем индексы
    await queryRunner.dropIndex('hopper_types', 'IDX_hopper_types_category');
    await queryRunner.dropIndex('hopper_types', 'IDX_hopper_types_code');

    // Удаляем таблицу
    await queryRunner.dropTable('hopper_types');
  }
}
