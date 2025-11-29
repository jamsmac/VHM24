import { DataSource } from 'typeorm';
import { SchemaRegistryService } from '../engines/schema-registry.service';
import { RulesEngineService } from '../engines/rules-engine.service';
import { SchemaDefinition } from '../entities/schema-definition.entity';
import { ValidationRule } from '../entities/validation-rule.entity';

/**
 * Seed Intelligent Import System
 *
 * Populates database with default schemas and validation rules
 */
export async function seedIntelligentImport(dataSource: DataSource): Promise<void> {
  console.log('🌱 Seeding Intelligent Import System...');

  const schemaRepo = dataSource.getRepository(SchemaDefinition);
  const rulesRepo = dataSource.getRepository(ValidationRule);

  // Create service instances
  const schemaRegistry = new SchemaRegistryService(schemaRepo);
  const rulesEngine = new RulesEngineService(rulesRepo);

  try {
    // Seed schemas
    await schemaRegistry.seedDefaultSchemas();
    console.log('✅ Default schemas seeded');

    // Seed rules
    await rulesEngine.seedDefaultRules();
    console.log('✅ Default validation rules seeded');

    console.log('🎉 Intelligent Import System seeded successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

/**
 * Run seed script standalone
 */
if (require.main === module) {
  import('../../../config/typeorm.config').then(async (module) => {
    const dataSource = module.default;
    try {
      await dataSource.initialize();
      await seedIntelligentImport(dataSource);
      await dataSource.destroy();
      process.exit(0);
    } catch (error) {
      console.error('Seed script failed:', error);
      process.exit(1);
    }
  });
}
