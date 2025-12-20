import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for sending SMS messages
 */
export class SendSmsDto {
  @ApiProperty({
    example: '+79001234567',
    description: 'Recipient phone number in E.164 format',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +79001234567)',
  })
  to: string;

  @ApiProperty({
    example: 'Your verification code is: 123456',
    description: 'SMS message content (max 1600 characters)',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    example: 'VendHub',
    description: 'Sender ID or phone number (optional, uses default if not provided)',
  })
  @IsString()
  @IsOptional()
  from?: string;
}

/**
 * DTO for bulk SMS sending
 */
export class BulkSmsDto {
  @ApiProperty({
    example: ['+79001234567', '+79009876543'],
    description: 'Array of recipient phone numbers in E.164 format',
  })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  to: string[];

  @ApiProperty({
    example: 'Important notification from VendHub',
    description: 'SMS message content',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}

/**
 * Response from SMS send operation
 */
export class SmsResponseDto {
  @ApiProperty({ example: 'SM1234567890abcdef' })
  messageId: string;

  @ApiProperty({ example: '+79001234567' })
  to: string;

  @ApiProperty({ example: 'queued' })
  status: string;

  @ApiProperty({ example: 1 })
  segmentCount: number;
}
