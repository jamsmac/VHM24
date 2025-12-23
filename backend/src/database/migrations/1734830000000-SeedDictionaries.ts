import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to seed system dictionaries
 * This ensures dictionaries are always present regardless of startup script
 */
export class SeedDictionaries1734830000000 implements MigrationInterface {
  name = 'SeedDictionaries1734830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if dictionaries already exist
    const existingCount = await queryRunner.query(
      `SELECT COUNT(*) as count FROM dictionaries`,
    );

    if (parseInt(existingCount[0].count) > 0) {
      console.log('Dictionaries already exist, skipping seed');
      return;
    }

    console.log('Seeding dictionaries...');

    // Insert location_types dictionary
    await queryRunner.query(`
      INSERT INTO dictionaries (id, code, name_ru, name_en, description, is_system, is_active, sort_order, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'location_types',
        'Типы локаций',
        'Location Types',
        'Классификация точек размещения',
        true,
        true,
        50,
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO NOTHING
    `);

    // Get the dictionary ID
    const locationTypesDict = await queryRunner.query(
      `SELECT id FROM dictionaries WHERE code = 'location_types'`,
    );

    if (locationTypesDict.length > 0) {
      const dictId = locationTypesDict[0].id;

      // Insert location type items
      const locationTypes = [
        { code: 'office', value_ru: 'Офис', value_en: 'Office', sort_order: 1 },
        { code: 'factory', value_ru: 'Производство', value_en: 'Factory', sort_order: 2 },
        { code: 'shopping_center', value_ru: 'ТРЦ', value_en: 'Shopping Center', sort_order: 3 },
        { code: 'metro', value_ru: 'Метро', value_en: 'Metro', sort_order: 4 },
        { code: 'university', value_ru: 'ВУЗ', value_en: 'University', sort_order: 5 },
        { code: 'hospital', value_ru: 'Больница', value_en: 'Hospital', sort_order: 6 },
        { code: 'airport', value_ru: 'Аэропорт', value_en: 'Airport', sort_order: 7 },
        { code: 'other', value_ru: 'Прочее', value_en: 'Other', sort_order: 8 },
      ];

      for (const item of locationTypes) {
        await queryRunner.query(`
          INSERT INTO dictionary_items (id, dictionary_id, code, value_ru, value_en, is_active, sort_order, created_at, updated_at)
          VALUES (
            gen_random_uuid(),
            '${dictId}',
            '${item.code}',
            '${item.value_ru}',
            '${item.value_en}',
            true,
            ${item.sort_order},
            NOW(),
            NOW()
          )
          ON CONFLICT DO NOTHING
        `);
      }
    }

    // Insert machine_types dictionary
    await queryRunner.query(`
      INSERT INTO dictionaries (id, code, name_ru, name_en, description, is_system, is_active, sort_order, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'machine_types',
        'Типы аппаратов',
        'Machine Types',
        'Классификация вендинговых автоматов',
        true,
        true,
        13,
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO NOTHING
    `);

    const machineTypesDict = await queryRunner.query(
      `SELECT id FROM dictionaries WHERE code = 'machine_types'`,
    );

    if (machineTypesDict.length > 0) {
      const dictId = machineTypesDict[0].id;

      const machineTypes = [
        { code: 'coffee_machine', value_ru: 'Кофейный автомат', value_en: 'Coffee Machine', sort_order: 1 },
        { code: 'snack_machine', value_ru: 'Снековый автомат', value_en: 'Snack Machine', sort_order: 2 },
        { code: 'combo_machine', value_ru: 'Комбо автомат', value_en: 'Combo Machine', sort_order: 3 },
        { code: 'drink_machine', value_ru: 'Автомат напитков', value_en: 'Drink Machine', sort_order: 4 },
      ];

      for (const item of machineTypes) {
        await queryRunner.query(`
          INSERT INTO dictionary_items (id, dictionary_id, code, value_ru, value_en, is_active, sort_order, created_at, updated_at)
          VALUES (
            gen_random_uuid(),
            '${dictId}',
            '${item.code}',
            '${item.value_ru}',
            '${item.value_en}',
            true,
            ${item.sort_order},
            NOW(),
            NOW()
          )
          ON CONFLICT DO NOTHING
        `);
      }
    }

    // Insert file_categories dictionary
    await queryRunner.query(`
      INSERT INTO dictionaries (id, code, name_ru, name_en, description, is_system, is_active, sort_order, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'file_categories',
        'Категории файлов',
        'File Categories',
        'Классификация загруженных файлов',
        true,
        true,
        60,
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO NOTHING
    `);

    const fileCategoriesDict = await queryRunner.query(
      `SELECT id FROM dictionaries WHERE code = 'file_categories'`,
    );

    if (fileCategoriesDict.length > 0) {
      const dictId = fileCategoriesDict[0].id;

      const fileCategories = [
        { code: 'task_photo_before', value_ru: 'Фото ДО (задача)', value_en: 'Task Photo Before', sort_order: 1 },
        { code: 'task_photo_after', value_ru: 'Фото ПОСЛЕ (задача)', value_en: 'Task Photo After', sort_order: 2 },
        { code: 'machine_photo', value_ru: 'Фото аппарата', value_en: 'Machine Photo', sort_order: 3 },
        { code: 'component_photo', value_ru: 'Фото компонента', value_en: 'Component Photo', sort_order: 4 },
        { code: 'incident_photo', value_ru: 'Фото инцидента', value_en: 'Incident Photo', sort_order: 5 },
        { code: 'complaint_photo', value_ru: 'Фото жалобы', value_en: 'Complaint Photo', sort_order: 6 },
        { code: 'document', value_ru: 'Документ', value_en: 'Document', sort_order: 7 },
        { code: 'sales_import', value_ru: 'Импорт продаж', value_en: 'Sales Import', sort_order: 8 },
      ];

      for (const item of fileCategories) {
        await queryRunner.query(`
          INSERT INTO dictionary_items (id, dictionary_id, code, value_ru, value_en, is_active, sort_order, created_at, updated_at)
          VALUES (
            gen_random_uuid(),
            '${dictId}',
            '${item.code}',
            '${item.value_ru}',
            '${item.value_en}',
            true,
            ${item.sort_order},
            NOW(),
            NOW()
          )
          ON CONFLICT DO NOTHING
        `);
      }
    }

    // Insert product_categories dictionary
    await queryRunner.query(`
      INSERT INTO dictionaries (id, code, name_ru, name_en, description, is_system, is_active, sort_order, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'product_categories',
        'Категории товаров',
        'Product Categories',
        'Категории для классификации товаров',
        true,
        true,
        1,
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO NOTHING
    `);

    const productCategoriesDict = await queryRunner.query(
      `SELECT id FROM dictionaries WHERE code = 'product_categories'`,
    );

    if (productCategoriesDict.length > 0) {
      const dictId = productCategoriesDict[0].id;

      const categories = [
        { code: 'hot_drinks', value_ru: 'Напитки горячие', value_en: 'Hot Drinks', sort_order: 1 },
        { code: 'cold_drinks', value_ru: 'Напитки холодные', value_en: 'Cold Drinks', sort_order: 2 },
        { code: 'snacks', value_ru: 'Снеки', value_en: 'Snacks', sort_order: 3 },
        { code: 'consumables', value_ru: 'Расходники', value_en: 'Consumables', sort_order: 4 },
        { code: 'ingredients', value_ru: 'Ингредиенты', value_en: 'Ingredients', sort_order: 5 },
      ];

      for (const item of categories) {
        await queryRunner.query(`
          INSERT INTO dictionary_items (id, dictionary_id, code, value_ru, value_en, is_active, sort_order, created_at, updated_at)
          VALUES (
            gen_random_uuid(),
            '${dictId}',
            '${item.code}',
            '${item.value_ru}',
            '${item.value_en}',
            true,
            ${item.sort_order},
            NOW(),
            NOW()
          )
          ON CONFLICT DO NOTHING
        `);
      }
    }

    // Insert units_of_measure dictionary
    await queryRunner.query(`
      INSERT INTO dictionaries (id, code, name_ru, name_en, description, is_system, is_active, sort_order, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'units_of_measure',
        'Единицы измерения',
        'Units of Measure',
        'Единицы измерения для товаров и ингредиентов',
        true,
        true,
        2,
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO NOTHING
    `);

    const unitsDict = await queryRunner.query(
      `SELECT id FROM dictionaries WHERE code = 'units_of_measure'`,
    );

    if (unitsDict.length > 0) {
      const dictId = unitsDict[0].id;

      const units = [
        { code: 'pcs', value_ru: 'штук', value_en: 'pieces', sort_order: 1 },
        { code: 'kg', value_ru: 'килограмм', value_en: 'kilograms', sort_order: 2 },
        { code: 'g', value_ru: 'грамм', value_en: 'grams', sort_order: 3 },
        { code: 'l', value_ru: 'литр', value_en: 'liters', sort_order: 4 },
        { code: 'ml', value_ru: 'миллилитр', value_en: 'milliliters', sort_order: 5 },
        { code: 'pack', value_ru: 'упаковка', value_en: 'package', sort_order: 6 },
      ];

      for (const item of units) {
        await queryRunner.query(`
          INSERT INTO dictionary_items (id, dictionary_id, code, value_ru, value_en, is_active, sort_order, created_at, updated_at)
          VALUES (
            gen_random_uuid(),
            '${dictId}',
            '${item.code}',
            '${item.value_ru}',
            '${item.value_en}',
            true,
            ${item.sort_order},
            NOW(),
            NOW()
          )
          ON CONFLICT DO NOTHING
        `);
      }
    }

    // Insert recipe_types dictionary
    await queryRunner.query(`
      INSERT INTO dictionaries (id, code, name_ru, name_en, description, is_system, is_active, sort_order, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'recipe_types',
        'Типы рецептов',
        'Recipe Types',
        'Классификация рецептов напитков',
        true,
        true,
        3,
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO NOTHING
    `);

    const recipeTypesDict = await queryRunner.query(
      `SELECT id FROM dictionaries WHERE code = 'recipe_types'`,
    );

    if (recipeTypesDict.length > 0) {
      const dictId = recipeTypesDict[0].id;

      const types = [
        { code: 'primary', value_ru: 'Основной', value_en: 'Primary', sort_order: 1 },
        { code: 'alternative', value_ru: 'Альтернативный', value_en: 'Alternative', sort_order: 2 },
        { code: 'test', value_ru: 'Тестовый', value_en: 'Test', sort_order: 3 },
      ];

      for (const item of types) {
        await queryRunner.query(`
          INSERT INTO dictionary_items (id, dictionary_id, code, value_ru, value_en, is_active, sort_order, created_at, updated_at)
          VALUES (
            gen_random_uuid(),
            '${dictId}',
            '${item.code}',
            '${item.value_ru}',
            '${item.value_en}',
            true,
            ${item.sort_order},
            NOW(),
            NOW()
          )
          ON CONFLICT DO NOTHING
        `);
      }
    }

    console.log('Dictionaries seeded successfully');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Don't delete dictionaries on rollback - they may be in use
    console.log('Skipping dictionary deletion on rollback');
  }
}
