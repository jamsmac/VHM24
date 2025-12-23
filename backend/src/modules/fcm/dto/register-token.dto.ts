import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DeviceType {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

export class RegisterFcmTokenDto {
  @ApiProperty({
    description: 'FCM device token',
    example: 'fMRcN0...token',
  })
  @IsString()
  @MaxLength(500)
  token: string;

  @ApiPropertyOptional({
    enum: DeviceType,
    description: 'Device type',
    example: DeviceType.ANDROID,
  })
  @IsOptional()
  @IsEnum(DeviceType)
  device_type?: DeviceType;

  @ApiPropertyOptional({
    description: 'Device name for identification',
    example: 'Samsung Galaxy S21',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  device_name?: string;
}

export class SendFcmNotificationDto {
  @ApiProperty({ description: 'User ID to send notification to' })
  @IsString()
  user_id: string;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Notification body' })
  @IsString()
  @MaxLength(1000)
  body: string;

  @ApiPropertyOptional({ description: 'URL to open when notification is clicked' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'Custom data payload' })
  @IsOptional()
  data?: Record<string, string>;
}

export class SubscribeToTopicDto {
  @ApiProperty({ description: 'Topic name to subscribe to' })
  @IsString()
  @MaxLength(100)
  topic: string;
}
