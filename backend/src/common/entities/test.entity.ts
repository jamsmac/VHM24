import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Test entity for demonstration purposes
 *
 * This entity demonstrates the standard VendHub pattern:
 * - Extends BaseEntity (provides id, created_at, updated_at, deleted_at)
 * - Uses snake_case for column names (PostgreSQL convention)
 * - Includes indexes for frequently queried fields
 */
@Entity('test_table')
@Index(['name'])
@Index(['created_at'])
export class TestEntity extends BaseEntity {
  /**
   * Name field for testing
   *
   * @example "Test Name"
   */
  @Column({ type: 'varchar', length: 100 })
  name: string;
}
