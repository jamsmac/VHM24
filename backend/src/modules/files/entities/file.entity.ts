import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('files')
@Index(['entity_type', 'entity_id'])
@Index(['category_code'])
@Index(['uploaded_by_user_id'])
export class File extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  original_filename: string;

  @Column({ type: 'varchar', length: 255 })
  stored_filename: string; // Имя файла на диске (UUID + extension)

  @Column({ type: 'varchar', length: 255 })
  file_path: string; // Полный путь к файлу

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'bigint' })
  file_size: number; // Размер в байтах

  @Column({ type: 'varchar', length: 50 })
  category_code: string; // from dictionaries: file_categories

  // Entity linkage (polymorphic)
  @Column({ type: 'varchar', length: 50 })
  entity_type: string; // task, machine, location, incident, etc.

  @Column({ type: 'varchar', length: 100 })
  entity_id: string; // UUID of related entity

  // Uploader
  @Column({ type: 'uuid' })
  uploaded_by_user_id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploaded_by: User;

  // Additional info
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[]; // Теги для поиска

  // Image-specific metadata
  @Column({ type: 'integer', nullable: true })
  image_width: number | null;

  @Column({ type: 'integer', nullable: true })
  image_height: number | null;

  // URL for access
  @Column({ type: 'text', nullable: true })
  url: string | null; // Public URL (generated on-demand)

  // Thumbnail (for images)
  @Column({ type: 'text', nullable: true })
  thumbnail_url: string | null;

  // Additional metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
