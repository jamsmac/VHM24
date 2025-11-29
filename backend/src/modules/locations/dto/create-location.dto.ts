import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsNumber,
  IsObject,
  IsDateString,
  MinLength,
  IsPhoneNumber,
  Min,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationStatus } from '../entities/location.entity';
import { IsDictionaryCode } from '@/common/validators';

export class CreateLocationDto {
  @ApiProperty({ example: 'Офис "Сити Плаза"' })
  @IsString()
  @MinLength(2, { message: 'Название должно содержать минимум 2 символа' })
  name: string;

  @ApiProperty({ example: 'office', description: 'Код из справочника location_types' })
  @IsString()
  @IsDictionaryCode('location_types')
  type_code: string;

  @ApiPropertyOptional({ enum: LocationStatus, default: LocationStatus.ACTIVE })
  @IsOptional()
  @IsEnum(LocationStatus)
  status?: LocationStatus;

  @ApiPropertyOptional({ example: 'Большой офис с высокой проходимостью' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Ташкент' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'ул. Амира Темура, д. 15' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ example: '100000' })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiPropertyOptional({ example: 41.3111 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 69.2797 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 'Иван Иванов' })
  @IsOptional()
  @IsString()
  contact_person?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsPhoneNumber('UZ')
  contact_phone?: string;

  @ApiPropertyOptional({ example: 'contact@example.com' })
  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @ApiPropertyOptional({ example: 500000, description: 'Аренда в месяц (сум)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthly_rent?: number;

  @ApiPropertyOptional({ example: 'uuid' })
  @IsOptional()
  @IsUUID()
  contractor_id?: string;

  @ApiPropertyOptional({ example: 1000, description: 'Примерное количество людей в день' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_traffic?: number;

  @ApiPropertyOptional({
    example: {
      monday: { from: '09:00', to: '18:00' },
      tuesday: { from: '09:00', to: '18:00' },
    },
  })
  @IsOptional()
  @IsObject()
  working_hours?: Record<string, any>;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  contract_start_date?: string;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  contract_end_date?: string;

  @ApiPropertyOptional({ example: 'Договор №123 от 01.01.2024' })
  @IsOptional()
  @IsString()
  contract_notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
