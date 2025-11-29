import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum StockTakeStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('stock_takes')
@Index(['warehouse_id', 'status'])
export class StockTake extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  stock_take_number: string;

  @Column({ type: 'uuid' })
  warehouse_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: StockTakeStatus, default: StockTakeStatus.PLANNED })
  status: StockTakeStatus;

  @Column({ type: 'date' })
  scheduled_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  supervisor_id: string | null;

  @Column({ type: 'simple-array', nullable: true })
  team_members: string[] | null; // User IDs

  @Column({ type: 'simple-array', nullable: true })
  zones_to_count: string[] | null; // Zone IDs

  @Column({ type: 'boolean', default: false })
  is_full_inventory: boolean;

  @Column({ type: 'integer', default: 0 })
  items_counted: number;

  @Column({ type: 'integer', default: 0 })
  discrepancies_found: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  results: {
    total_value?: number;
    adjustment_value?: number;
    accuracy_percentage?: number;
    items_with_issues?: Array<{
      product_id: string;
      expected: number;
      actual: number;
      difference: number;
    }>;
  };

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
