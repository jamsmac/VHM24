import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Directory } from './directory.entity';

/**
 * DirectoryStats entity - aggregated statistics per directory
 *
 * Maintains counters and metrics for each directory.
 * Updated automatically via database triggers when entries change.
 */
@Entity('directory_stats')
export class DirectoryStats {
  /**
   * Directory ID (also primary key)
   */
  @PrimaryColumn({ type: 'uuid' })
  directory_id: string;

  @OneToOne(() => Directory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'directory_id' })
  directory: Directory;

  /**
   * Total number of entries (including archived)
   */
  @Column({ type: 'integer', default: 0 })
  total_entries: number;

  /**
   * Number of active entries
   */
  @Column({ type: 'integer', default: 0 })
  active_entries: number;

  /**
   * Number of official (external source) entries
   */
  @Column({ type: 'integer', default: 0 })
  official_entries: number;

  /**
   * Number of local (manually added) entries
   */
  @Column({ type: 'integer', default: 0 })
  local_entries: number;

  /**
   * Last successful sync timestamp
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_sync_at: Date | null;

  /**
   * Last import timestamp
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_import_at: Date | null;

  /**
   * Average search time in milliseconds (for performance monitoring)
   */
  @Column({ type: 'numeric', nullable: true })
  avg_search_time_ms: number | null;

  /**
   * When stats were last updated
   */
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
