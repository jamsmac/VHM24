import { IsString, IsBoolean, IsEnum, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TelegramBotMode } from '../entities/telegram-settings.entity';

export class UpdateTelegramSettingsDto {
  @ApiProperty({
    description: 'Telegram bot token',
    required: false,
  })
  @IsString()
  @IsOptional()
  bot_token?: string;

  @ApiProperty({
    description: 'Bot username',
    required: false,
  })
  @IsString()
  @IsOptional()
  bot_username?: string;

  @ApiProperty({
    description: 'Bot mode (polling or webhook)',
    enum: TelegramBotMode,
    required: false,
  })
  @IsEnum(TelegramBotMode)
  @IsOptional()
  mode?: TelegramBotMode;

  @ApiProperty({
    description: 'Webhook URL (required if mode is webhook)',
    required: false,
  })
  @IsString()
  @IsOptional()
  webhook_url?: string;

  @ApiProperty({
    description: 'Is bot active',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({
    description: 'Send notifications via Telegram',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  send_notifications?: boolean;

  @ApiProperty({
    description: 'Default notification preferences for new users',
    required: false,
  })
  @IsObject()
  @IsOptional()
  default_notification_preferences?: {
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
