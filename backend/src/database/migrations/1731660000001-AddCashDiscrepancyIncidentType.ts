import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCashDiscrepancyIncidentType1731660000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add CASH_DISCREPANCY to incident_type enum
    await queryRunner.query(`
      ALTER TYPE incident_type ADD VALUE IF NOT EXISTS 'cash_discrepancy';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type, which is complex
    // For now, we'll leave the value in the enum even on rollback
    console.log('Rollback note: cash_discrepancy enum value will remain in database');
  }
}
