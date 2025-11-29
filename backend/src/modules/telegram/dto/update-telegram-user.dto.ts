import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TelegramLanguage, TelegramUserStatus } from '../entities/telegram-user.entity';

export class UpdateTelegramUserDto {
  @ApiProperty({
    description: 'User language preference',
    enum: TelegramLanguage,
    required: false,
  })
  @IsEnum(TelegramLanguage)
  @IsOptional()
  language?: TelegramLanguage;

  @ApiProperty({
    description: 'User status',
    enum: TelegramUserStatus,
    required: false,
  })
  @IsEnum(TelegramUserStatus)
  @IsOptional()
  status?: TelegramUserStatus;

  @ApiProperty({
    description: 'Notification preferences',
    required: false,
    example: {
      machine_offline: true,
      low_stock: true,
      maintenance_due: false,
    },
  })
  @IsObject()
  @IsOptional()
  notification_preferences?: {
    machine_offline?: boolean;
    machine_online?: boolean;
    low_stock?: boolean;
    sales_milestone?: boolean;
    maintenance_due?: boolean;
    equipment_needs_maintenance?: boolean;
    equipment_low_stock?: boolean;
    equipment_washing_due?: boolean;
    payment_failed?: boolean;
    task_assigned?: boolean;
    task_completed?: boolean;
    custom?: boolean;
  };
}
