import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';

/**
 * FCM Token entity for storing Firebase Cloud Messaging device tokens
 */
@Entity('fcm_tokens')
export class FcmToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 500 })
  @Index()
  token: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  device_type: string; // 'android', 'ios', 'web'

  @Column({ type: 'varchar', length: 100, nullable: true })
  device_name: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_used_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
