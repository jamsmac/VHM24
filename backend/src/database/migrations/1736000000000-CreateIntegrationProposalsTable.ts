import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateIntegrationProposalsTable1736000000000 implements MigrationInterface {
  name = 'CreateIntegrationProposalsTable1736000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "integration_proposal_status_enum" AS ENUM (
        'pending',
        'approved',
        'rejected',
        'implemented',
        'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "integration_proposal_type_enum" AS ENUM (
        'api_integration',
        'documentation',
        'module_generation',
        'code_fix',
        'feature'
      )
    `);

    // Create table
    await queryRunner.createTable(
      new Table({
        name: 'integration_proposals',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'type',
            type: 'integration_proposal_type_enum',
          },
          {
            name: 'status',
            type: 'integration_proposal_status_enum',
            default: "'pending'",
          },
          {
            name: 'source_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'source_documentation',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'discovered_endpoints',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'proposed_files',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'generated_documentation',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ai_reasoning',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'confidence_score',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'implementation_log',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'approved_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'approved_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'implemented_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'integration_proposals',
      new TableIndex({
        name: 'IDX_integration_proposals_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'integration_proposals',
      new TableIndex({
        name: 'IDX_integration_proposals_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'integration_proposals',
      new TableIndex({
        name: 'IDX_integration_proposals_created_by',
        columnNames: ['created_by_id'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'integration_proposals',
      new TableForeignKey({
        name: 'FK_integration_proposals_created_by',
        columnNames: ['created_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'integration_proposals',
      new TableForeignKey({
        name: 'FK_integration_proposals_approved_by',
        columnNames: ['approved_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('integration_proposals', 'FK_integration_proposals_approved_by');
    await queryRunner.dropForeignKey('integration_proposals', 'FK_integration_proposals_created_by');

    // Drop indexes
    await queryRunner.dropIndex('integration_proposals', 'IDX_integration_proposals_created_by');
    await queryRunner.dropIndex('integration_proposals', 'IDX_integration_proposals_type');
    await queryRunner.dropIndex('integration_proposals', 'IDX_integration_proposals_status');

    // Drop table
    await queryRunner.dropTable('integration_proposals');

    // Drop enum types
    await queryRunner.query('DROP TYPE "integration_proposal_type_enum"');
    await queryRunner.query('DROP TYPE "integration_proposal_status_enum"');
  }
}
