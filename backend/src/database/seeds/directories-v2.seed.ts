import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed basic directories for VHM24
 *
 * Run with: npx ts-node -r tsconfig-paths/register src/database/seeds/directories-v2.seed.ts
 */

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

const directories = [
  {
    slug: 'countries',
    name_ru: 'Страны',
    name_en: 'Countries',
    description_ru: 'Справочник стран мира',
    description_en: 'World countries directory',
    directory_type: 'external',
    scope: 'global',
    is_hierarchical: false,
    fields: [
      { code: 'name', name_ru: 'Название', name_en: 'Name', field_type: 'text', is_required: true, is_searchable: true },
      { code: 'iso_code', name_ru: 'ISO код', name_en: 'ISO Code', field_type: 'text', is_required: true, is_unique: true },
      { code: 'iso_code_3', name_ru: 'ISO код (3)', name_en: 'ISO Code (3)', field_type: 'text', is_unique: true },
      { code: 'phone_code', name_ru: 'Телефонный код', name_en: 'Phone Code', field_type: 'text' },
    ],
    entries: [
      { data: { name: 'Россия', iso_code: 'RU', iso_code_3: 'RUS', phone_code: '+7' } },
      { data: { name: 'Узбекистан', iso_code: 'UZ', iso_code_3: 'UZB', phone_code: '+998' } },
      { data: { name: 'Казахстан', iso_code: 'KZ', iso_code_3: 'KAZ', phone_code: '+7' } },
      { data: { name: 'Кыргызстан', iso_code: 'KG', iso_code_3: 'KGZ', phone_code: '+996' } },
      { data: { name: 'Таджикистан', iso_code: 'TJ', iso_code_3: 'TJK', phone_code: '+992' } },
    ],
  },
  {
    slug: 'currencies',
    name_ru: 'Валюты',
    name_en: 'Currencies',
    description_ru: 'Справочник валют',
    description_en: 'Currencies directory',
    directory_type: 'external',
    scope: 'global',
    is_hierarchical: false,
    fields: [
      { code: 'name', name_ru: 'Название', name_en: 'Name', field_type: 'text', is_required: true, is_searchable: true },
      { code: 'code', name_ru: 'Код валюты', name_en: 'Currency Code', field_type: 'text', is_required: true, is_unique: true },
      { code: 'symbol', name_ru: 'Символ', name_en: 'Symbol', field_type: 'text' },
      { code: 'decimal_places', name_ru: 'Знаков после запятой', name_en: 'Decimal Places', field_type: 'number' },
    ],
    entries: [
      { data: { name: 'Российский рубль', code: 'RUB', symbol: '₽', decimal_places: 2 } },
      { data: { name: 'Узбекский сум', code: 'UZS', symbol: 'сум', decimal_places: 2 } },
      { data: { name: 'Доллар США', code: 'USD', symbol: '$', decimal_places: 2 } },
      { data: { name: 'Евро', code: 'EUR', symbol: '€', decimal_places: 2 } },
      { data: { name: 'Казахстанский тенге', code: 'KZT', symbol: '₸', decimal_places: 2 } },
    ],
  },
  {
    slug: 'units_of_measure',
    name_ru: 'Единицы измерения',
    name_en: 'Units of Measure',
    description_ru: 'Справочник единиц измерения',
    description_en: 'Units of measure directory',
    directory_type: 'internal',
    scope: 'global',
    is_hierarchical: false,
    fields: [
      { code: 'name', name_ru: 'Название', name_en: 'Name', field_type: 'text', is_required: true, is_searchable: true },
      { code: 'short_name', name_ru: 'Сокращение', name_en: 'Abbreviation', field_type: 'text', is_required: true },
      { code: 'category', name_ru: 'Категория', name_en: 'Category', field_type: 'select', options: [
        { value: 'weight', label: 'Вес' },
        { value: 'volume', label: 'Объём' },
        { value: 'quantity', label: 'Количество' },
        { value: 'length', label: 'Длина' },
      ]},
      { code: 'base_multiplier', name_ru: 'Множитель к базовой', name_en: 'Base Multiplier', field_type: 'decimal' },
    ],
    entries: [
      { data: { name: 'Штука', short_name: 'шт', category: 'quantity', base_multiplier: 1 } },
      { data: { name: 'Килограмм', short_name: 'кг', category: 'weight', base_multiplier: 1 } },
      { data: { name: 'Грамм', short_name: 'г', category: 'weight', base_multiplier: 0.001 } },
      { data: { name: 'Литр', short_name: 'л', category: 'volume', base_multiplier: 1 } },
      { data: { name: 'Миллилитр', short_name: 'мл', category: 'volume', base_multiplier: 0.001 } },
      { data: { name: 'Упаковка', short_name: 'уп', category: 'quantity', base_multiplier: 1 } },
      { data: { name: 'Коробка', short_name: 'кор', category: 'quantity', base_multiplier: 1 } },
    ],
  },
  {
    slug: 'product_categories',
    name_ru: 'Категории товаров',
    name_en: 'Product Categories',
    description_ru: 'Иерархический справочник категорий товаров',
    description_en: 'Hierarchical product categories directory',
    directory_type: 'internal',
    scope: 'organization',
    is_hierarchical: true,
    fields: [
      { code: 'name', name_ru: 'Название', name_en: 'Name', field_type: 'text', is_required: true, is_searchable: true },
      { code: 'code', name_ru: 'Код', name_en: 'Code', field_type: 'text', is_unique: true },
      { code: 'icon', name_ru: 'Иконка', name_en: 'Icon', field_type: 'text' },
      { code: 'color', name_ru: 'Цвет', name_en: 'Color', field_type: 'text' },
    ],
    entries: [
      { data: { name: 'Напитки', code: 'drinks', icon: 'cup', color: '#3B82F6' } },
      { data: { name: 'Снеки', code: 'snacks', icon: 'cookie', color: '#F59E0B' } },
      { data: { name: 'Кофе', code: 'coffee', icon: 'coffee', color: '#6B7280' } },
    ],
  },
  {
    slug: 'machine_types',
    name_ru: 'Типы автоматов',
    name_en: 'Machine Types',
    description_ru: 'Справочник типов вендинговых автоматов',
    description_en: 'Vending machine types directory',
    directory_type: 'internal',
    scope: 'global',
    is_hierarchical: false,
    fields: [
      { code: 'name', name_ru: 'Название', name_en: 'Name', field_type: 'text', is_required: true, is_searchable: true },
      { code: 'code', name_ru: 'Код', name_en: 'Code', field_type: 'text', is_required: true, is_unique: true },
      { code: 'description', name_ru: 'Описание', name_en: 'Description', field_type: 'textarea' },
      { code: 'max_products', name_ru: 'Макс. товаров', name_en: 'Max Products', field_type: 'number' },
      { code: 'supports_cash', name_ru: 'Поддержка наличных', name_en: 'Cash Support', field_type: 'boolean' },
      { code: 'supports_card', name_ru: 'Поддержка карт', name_en: 'Card Support', field_type: 'boolean' },
    ],
    entries: [
      { data: { name: 'Кофейный автомат', code: 'coffee', description: 'Автомат для приготовления кофе', max_products: 20, supports_cash: true, supports_card: true } },
      { data: { name: 'Снековый автомат', code: 'snack', description: 'Автомат для продажи снеков', max_products: 60, supports_cash: true, supports_card: true } },
      { data: { name: 'Комбинированный автомат', code: 'combo', description: 'Автомат для кофе и снеков', max_products: 80, supports_cash: true, supports_card: true } },
      { data: { name: 'Автомат напитков', code: 'beverage', description: 'Автомат для холодных напитков', max_products: 40, supports_cash: true, supports_card: true } },
    ],
  },
  {
    slug: 'task_types',
    name_ru: 'Типы задач',
    name_en: 'Task Types',
    description_ru: 'Справочник типов задач для операторов',
    description_en: 'Operator task types directory',
    directory_type: 'internal',
    scope: 'global',
    is_hierarchical: false,
    fields: [
      { code: 'name', name_ru: 'Название', name_en: 'Name', field_type: 'text', is_required: true, is_searchable: true },
      { code: 'code', name_ru: 'Код', name_en: 'Code', field_type: 'text', is_required: true, is_unique: true },
      { code: 'icon', name_ru: 'Иконка', name_en: 'Icon', field_type: 'text' },
      { code: 'color', name_ru: 'Цвет', name_en: 'Color', field_type: 'text' },
      { code: 'requires_photo_before', name_ru: 'Фото до', name_en: 'Photo Before', field_type: 'boolean' },
      { code: 'requires_photo_after', name_ru: 'Фото после', name_en: 'Photo After', field_type: 'boolean' },
      { code: 'affects_inventory', name_ru: 'Влияет на остатки', name_en: 'Affects Inventory', field_type: 'boolean' },
    ],
    entries: [
      { data: { name: 'Пополнение', code: 'refill', icon: 'package-plus', color: '#10B981', requires_photo_before: true, requires_photo_after: true, affects_inventory: true } },
      { data: { name: 'Инкассация', code: 'collection', icon: 'banknote', color: '#3B82F6', requires_photo_before: true, requires_photo_after: true, affects_inventory: false } },
      { data: { name: 'Обслуживание', code: 'maintenance', icon: 'wrench', color: '#F59E0B', requires_photo_before: true, requires_photo_after: true, affects_inventory: false } },
      { data: { name: 'Проверка', code: 'inspection', icon: 'search', color: '#8B5CF6', requires_photo_before: false, requires_photo_after: true, affects_inventory: false } },
      { data: { name: 'Ремонт', code: 'repair', icon: 'hammer', color: '#EF4444', requires_photo_before: true, requires_photo_after: true, affects_inventory: false } },
      { data: { name: 'Мойка', code: 'cleaning', icon: 'sparkles', color: '#06B6D4', requires_photo_before: true, requires_photo_after: true, affects_inventory: false } },
    ],
  },
];

export async function seedDirectoriesV2(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    for (const dir of directories) {
      const directoryId = uuidv4();
      const now = new Date();

      // Insert directory
      await queryRunner.query(
        `INSERT INTO directories (id, slug, name_ru, name_en, description_ru, description_en, directory_type, scope, is_hierarchical, is_active, version, created_at, updated_at, created_by_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, 1, $10, $10, $11)
         ON CONFLICT (slug) DO NOTHING`,
        [
          directoryId,
          dir.slug,
          dir.name_ru,
          dir.name_en,
          dir.description_ru,
          dir.description_en,
          dir.directory_type,
          dir.scope,
          dir.is_hierarchical,
          now,
          SYSTEM_USER_ID,
        ],
      );

      // Get actual directory ID (in case of conflict)
      const [dirRow] = await queryRunner.query(
        `SELECT id FROM directories WHERE slug = $1`,
        [dir.slug],
      );
      const actualDirId = dirRow?.id || directoryId;

      // Insert fields
      for (let i = 0; i < dir.fields.length; i++) {
        const field = dir.fields[i];
        const fieldId = uuidv4();

        await queryRunner.query(
          `INSERT INTO directory_fields (id, directory_id, code, name_ru, name_en, field_type, is_required, is_unique, is_searchable, is_active, sort_order, options, created_at, updated_at, created_by_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11, $12, $12, $13)
           ON CONFLICT (directory_id, code) DO NOTHING`,
          [
            fieldId,
            actualDirId,
            field.code,
            field.name_ru,
            field.name_en || null,
            field.field_type,
            field.is_required || false,
            field.is_unique || false,
            field.is_searchable !== false,
            i,
            field.options ? JSON.stringify(field.options) : null,
            now,
            SYSTEM_USER_ID,
          ],
        );
      }

      // Insert entries
      if (dir.entries) {
        for (const entry of dir.entries) {
          const entryId = uuidv4();

          await queryRunner.query(
            `INSERT INTO directory_entries (id, directory_id, data, origin, status, version, created_at, updated_at, created_by_id)
             VALUES ($1, $2, $3, 'official', 'active', 1, $4, $4, $5)
             ON CONFLICT DO NOTHING`,
            [
              entryId,
              actualDirId,
              JSON.stringify(entry.data),
              now,
              SYSTEM_USER_ID,
            ],
          );
        }
      }

      console.log(`Seeded directory: ${dir.slug}`);
    }

    await queryRunner.commitTransaction();
    console.log('Directories seed completed successfully');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Directories seed failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// Run as standalone script
if (require.main === module) {
  const { AppDataSource } = require('../../config/typeorm.config');

  AppDataSource.initialize()
    .then(async (dataSource: DataSource) => {
      await seedDirectoriesV2(dataSource);
      await dataSource.destroy();
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error('Failed to initialize data source:', error);
      process.exit(1);
    });
}
