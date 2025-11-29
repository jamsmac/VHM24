import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Inline keyboard button for Telegram messages
 */
export class InlineKeyboardButton {
  @ApiProperty({
    description: 'Button text',
    example: 'View Details',
  })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Callback data sent when button is pressed',
    example: 'view_machine_42',
    required: false,
  })
  @IsOptional()
  @IsString()
  callback_data?: string;

  @ApiProperty({
    description: 'URL to open when button is pressed',
    example: 'https://example.com',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  url?: string;
}

export class SendTelegramMessageDto {
  @ApiProperty({
    description: 'User ID to send message to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({
    description: 'Message text to send',
    example: 'Your machine #42 is offline',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Optional inline keyboard buttons (2D array of buttons)',
    required: false,
    type: 'array',
    items: { type: 'array', items: { $ref: '#/components/schemas/InlineKeyboardButton' } },
    example: [
      [{ text: 'View Details', callback_data: 'view_machine_42' }],
      [{ text: 'Dismiss', callback_data: 'dismiss' }],
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Array)
  inline_keyboard?: InlineKeyboardButton[][];
}
