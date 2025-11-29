import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribePushDto {
  @ApiProperty({
    example: 'https://fcm.googleapis.com/fcm/send/...',
    description: 'Push service endpoint',
  })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({
    example: { p256dh: 'BKsX...', auth: 'Abc123...' },
    description: 'Encryption keys',
  })
  @IsNotEmpty()
  keys: {
    p256dh: string;
    auth: string;
  };

  @ApiProperty({
    example: 'Chrome 120 on Windows',
    description: 'User agent string',
    required: false,
  })
  @IsString()
  @IsOptional()
  user_agent?: string;
}

export class SendPushNotificationDto {
  @ApiProperty({
    example: 'user-uuid',
    description: 'User ID to send notification to',
  })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ example: 'New Task Assigned', description: 'Title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'You have a new task for machine M-001',
    description: 'Message body',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    example: '/tasks/abc-123',
    description: 'URL to navigate when clicked',
    required: false,
  })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiProperty({
    example: '/icon.png',
    description: 'Notification icon URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({
    example: { task_id: 'abc-123' },
    description: 'Additional data',
    required: false,
  })
  @IsOptional()
  data?: Record<string, any>;
}
