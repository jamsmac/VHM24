import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DirectoryEntry } from './directory-entry.entity';

/**
 * DirectoryEntryFile entity - file attachments for entries
 *
 * Links directory entries to uploaded files. Each file belongs
 * to a specific field in the entry (for FILE/IMAGE field types).
 */
@Entity('directory_entry_files')
@Index(['entry_id'])
@Index(['entry_id', 'field_code'])
@Index(['file_id'])
export class DirectoryEntryFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Parent entry
   */
  @Column({ type: 'uuid' })
  entry_id: string;

  @ManyToOne(() => DirectoryEntry, (entry) => entry.files, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'entry_id' })
  entry: DirectoryEntry;

  /**
   * Field code this file belongs to
   */
  @Column({ type: 'varchar', length: 100 })
  field_code: string;

  /**
   * Reference to the files table
   */
  @Column({ type: 'uuid' })
  file_id: string;

  /**
   * Display order for multiple files in same field
   */
  @Column({ type: 'integer', default: 0 })
  sort_order: number;

  /**
   * Optional caption/description
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  caption: string | null;

  /**
   * Is this the primary/main file for the field
   */
  @Column({ type: 'boolean', default: false })
  is_primary: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
