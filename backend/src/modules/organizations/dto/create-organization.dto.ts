import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsEnum,
  IsEmail,
  IsNumber,
  IsObject,
  MaxLength,
  MinLength,
  Matches,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { OrganizationType, OrganizationSettings } from '../entities/organization.entity';

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'VendHub Tashkent',
    description: 'Organization name',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'vendhub-tashkent',
    description: 'Unique URL-friendly identifier (slug)',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({
    example: 'franchise',
    description: 'Organization type',
    enum: OrganizationType,
  })
  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;

  @ApiPropertyOptional({
    example: 'uuid',
    description: 'Parent organization ID',
  })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiPropertyOptional({
    example: { timezone: 'Asia/Tashkent', currency: 'UZS' },
    description: 'Organization settings',
  })
  @IsOptional()
  @IsObject()
  settings?: OrganizationSettings;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the organization is active',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    example: '+998901234567',
    description: 'Contact phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    example: 'contact@vendhub.uz',
    description: 'Contact email',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    example: 'Tashkent, Mirzo Ulugbek district',
    description: 'Physical address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    description: 'Organization logo URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_url?: string;

  @ApiPropertyOptional({
    example: '123456789',
    description: 'Tax identification number (INN)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tax_id?: string;

  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Contract start date',
  })
  @IsOptional()
  @IsDateString()
  contract_start_date?: string;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Contract end date',
  })
  @IsOptional()
  @IsDateString()
  contract_end_date?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Commission percentage for franchise (0-100)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commission_rate?: number;
}
