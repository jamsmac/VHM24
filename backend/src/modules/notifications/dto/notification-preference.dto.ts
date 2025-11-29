import { IsEnum, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationChannel } from '../entities/notification.entity';

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ example: true, description: 'Включено или отключено' })
  @IsBoolean()
  is_enabled: boolean;

  @ApiPropertyOptional({
    example: { quiet_hours_start: '22:00', quiet_hours_end: '08:00' },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class CreateNotificationPreferenceDto {
  @ApiProperty({ enum: NotificationType, example: NotificationType.TASK_ASSIGNED })
  @IsEnum(NotificationType)
  notification_type: NotificationType;

  @ApiProperty({ enum: NotificationChannel, example: NotificationChannel.TELEGRAM })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ example: true, description: 'Включено или отключено' })
  @IsBoolean()
  is_enabled: boolean;

  @ApiPropertyOptional({
    example: { quiet_hours_start: '22:00', quiet_hours_end: '08:00' },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
