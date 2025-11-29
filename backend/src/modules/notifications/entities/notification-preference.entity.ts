import { Entity, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationType, NotificationChannel } from './notification.entity';

/**
 * Настройки уведомлений пользователя
 * Определяет, какие типы уведомлений и по каким каналам получает пользователь
 */
@Entity('notification_preferences')
@Unique(['user_id', 'notification_type', 'channel'])
@Index(['user_id'])
export class NotificationPreference extends BaseEntity {
  @ApiProperty({ example: 'uuid', description: 'ID пользователя' })
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ enum: NotificationType, example: NotificationType.TASK_ASSIGNED })
  @Column({ type: 'enum', enum: NotificationType })
  notification_type: NotificationType;

  @ApiProperty({ enum: NotificationChannel, example: NotificationChannel.TELEGRAM })
  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @ApiProperty({ example: true, description: 'Включено или отключено' })
  @Column({ type: 'boolean', default: true })
  is_enabled: boolean;

  @ApiProperty({
    example: { quiet_hours_start: '22:00', quiet_hours_end: '08:00' },
    description: 'Дополнительные настройки (тихие часы, частота и т.д.)',
  })
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any> | null;
}
