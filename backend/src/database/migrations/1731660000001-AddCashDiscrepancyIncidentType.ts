import { MigrationInterface, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('AddCashDiscrepancyIncidentType1731660000001');

export class AddCashDiscrepancyIncidentType1731660000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add CASH_DISCREPANCY to incident_type enum
    await queryRunner.query(`
      ALTER TYPE incident_type ADD VALUE IF NOT EXISTS 'cash_discrepancy';
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type, which is complex
    // For now, we'll leave the value in the enum even on rollback
    logger.log('Rollback note: cash_discrepancy enum value will remain in database');
  }
}
