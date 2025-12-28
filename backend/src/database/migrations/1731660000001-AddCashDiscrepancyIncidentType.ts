import { MigrationInterface, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('AddCashDiscrepancyIncidentType1731660000001');

export class AddCashDiscrepancyIncidentType1731660000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // TypeORM creates enums with pattern: tablename_columnname_enum
    // Check if the incidents table and enum exist first
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'incidents_incident_type_enum'
      );
    `);

    if (!enumExists[0]?.exists) {
      // Also check for legacy enum name without table prefix
      const legacyEnumExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'incident_type'
        );
      `);

      if (legacyEnumExists[0]?.exists) {
        // Use legacy enum name
        await queryRunner.query(`
          ALTER TYPE incident_type ADD VALUE IF NOT EXISTS 'cash_discrepancy';
        `);
        logger.log('Added cash_discrepancy to legacy incident_type enum');
      } else {
        // Enum doesn't exist - incidents table likely not created yet
        // This migration will be a no-op; the enum value is already in the entity
        // and will be included when TypeORM creates the table
        logger.log(
          'incidents_incident_type_enum does not exist yet. ' +
            'Skipping - cash_discrepancy is already defined in the entity.',
        );
      }
      return;
    }

    // Add CASH_DISCREPANCY to the TypeORM-generated enum
    await queryRunner.query(`
      ALTER TYPE incidents_incident_type_enum ADD VALUE IF NOT EXISTS 'cash_discrepancy';
    `);
    logger.log('Added cash_discrepancy to incidents_incident_type_enum');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type, which is complex
    // For now, we'll leave the value in the enum even on rollback
    logger.log('Rollback note: cash_discrepancy enum value will remain in database');
  }
}
