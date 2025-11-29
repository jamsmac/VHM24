import { IsEnum, IsUUID, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType, example: NotificationType.TASK_ASSIGNED })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ enum: NotificationChannel, example: NotificationChannel.TELEGRAM })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiPropertyOptional({
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiProperty({ example: 'uuid', description: 'ID получателя' })
  @IsUUID()
  recipient_id: string;

  @ApiProperty({ example: 'Новая задача назначена' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Вам назначена задача пополнения для аппарата M-001' })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    example: { task_id: 'uuid', machine_id: 'uuid' },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({ example: '/tasks/uuid' })
  @IsOptional()
  @IsString()
  action_url?: string;
}

/**
 * DTO для массовой отправки уведомлений
 */
export class BulkNotificationDto {
  @ApiProperty({ enum: NotificationType, example: NotificationType.DAILY_REPORT })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ enum: NotificationChannel, example: NotificationChannel.TELEGRAM })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ example: ['uuid1', 'uuid2'], description: 'ID получателей' })
  @IsUUID(undefined, { each: true })
  recipient_ids: string[];

  @ApiProperty({ example: 'Ежедневный отчет' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Сводка по задачам за день' })
  @IsString()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
