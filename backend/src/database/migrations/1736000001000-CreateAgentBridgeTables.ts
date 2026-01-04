import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAgentBridgeTables1736000001000 implements MigrationInterface {
  name = 'CreateAgentBridgeTables1736000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "agent_session_status_enum" AS ENUM (
        'running',
        'waiting',
        'idle',
        'error',
        'completed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "agent_type_enum" AS ENUM (
        'claude_code',
        'gemini_cli',
        'cursor',
        'opencode',
        'custom'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "progress_status_enum" AS ENUM (
        'started',
        'in_progress',
        'completed',
        'failed',
        'blocked'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "progress_category_enum" AS ENUM (
        'analysis',
        'code_generation',
        'testing',
        'fix',
        'documentation',
        'refactoring',
        'other'
      )
    `);

    // Create agent_sessions table
    await queryRunner.createTable(
      new Table({
        name: 'agent_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'session_id',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'agent_type',
            type: 'agent_type_enum',
            default: "'claude_code'",
          },
          {
            name: 'status',
            type: 'agent_session_status_enum',
            default: "'idle'",
          },
          {
            name: 'current_task',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'working_directory',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'profile',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'attached_mcps',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'last_activity_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'messages_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'proposals_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'files_changed_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'jsonb',
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

    // Create agent_progress table
    await queryRunner.createTable(
      new Table({
        name: 'agent_progress',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'session_id',
            type: 'uuid',
          },
          {
            name: 'task_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'progress_status_enum',
            default: "'in_progress'",
          },
          {
            name: 'category',
            type: 'progress_category_enum',
            default: "'other'",
          },
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'files_changed',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'lines_added',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'lines_removed',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'duration_ms',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'proposal_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
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

    // Create indexes for agent_sessions
    await queryRunner.createIndex(
      'agent_sessions',
      new TableIndex({
        name: 'IDX_agent_sessions_session_id',
        columnNames: ['session_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'agent_sessions',
      new TableIndex({
        name: 'IDX_agent_sessions_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'agent_sessions',
      new TableIndex({
        name: 'IDX_agent_sessions_agent_type',
        columnNames: ['agent_type'],
      }),
    );

    // Create indexes for agent_progress
    await queryRunner.createIndex(
      'agent_progress',
      new TableIndex({
        name: 'IDX_agent_progress_session_id',
        columnNames: ['session_id'],
      }),
    );

    await queryRunner.createIndex(
      'agent_progress',
      new TableIndex({
        name: 'IDX_agent_progress_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'agent_progress',
      new TableIndex({
        name: 'IDX_agent_progress_category',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'agent_progress',
      new TableIndex({
        name: 'IDX_agent_progress_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'agent_progress',
      new TableForeignKey({
        name: 'FK_agent_progress_session',
        columnNames: ['session_id'],
        referencedTableName: 'agent_sessions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('agent_progress', 'FK_agent_progress_session');

    // Drop indexes
    await queryRunner.dropIndex('agent_progress', 'IDX_agent_progress_created_at');
    await queryRunner.dropIndex('agent_progress', 'IDX_agent_progress_category');
    await queryRunner.dropIndex('agent_progress', 'IDX_agent_progress_status');
    await queryRunner.dropIndex('agent_progress', 'IDX_agent_progress_session_id');
    await queryRunner.dropIndex('agent_sessions', 'IDX_agent_sessions_agent_type');
    await queryRunner.dropIndex('agent_sessions', 'IDX_agent_sessions_status');
    await queryRunner.dropIndex('agent_sessions', 'IDX_agent_sessions_session_id');

    // Drop tables
    await queryRunner.dropTable('agent_progress');
    await queryRunner.dropTable('agent_sessions');

    // Drop enum types
    await queryRunner.query('DROP TYPE "progress_category_enum"');
    await queryRunner.query('DROP TYPE "progress_status_enum"');
    await queryRunner.query('DROP TYPE "agent_type_enum"');
    await queryRunner.query('DROP TYPE "agent_session_status_enum"');
  }
}
