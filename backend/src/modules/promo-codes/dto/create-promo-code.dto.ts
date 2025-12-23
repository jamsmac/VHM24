import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  IsArray,
  IsUUID,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PromoCodeType, PromoCodeStatus } from '../enums';

export class CreatePromoCodeDto {
  @ApiProperty({
    description: 'Unique promo code (uppercase letters and numbers)',
    example: 'SUMMER2024',
  })
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Code must contain only uppercase letters, numbers, underscores, and hyphens',
  })
  code: string;

  @ApiProperty({
    enum: PromoCodeType,
    description: 'Type of discount: percentage, fixed_amount, or loyalty_bonus',
    example: PromoCodeType.PERCENTAGE,
  })
  @IsEnum(PromoCodeType)
  type: PromoCodeType;

  @ApiProperty({
    description: 'Discount value (percentage 0-100 or fixed amount in UZS, or bonus points)',
    example: 15,
  })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({
    description: 'Start date of validity',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  valid_from: string;

  @ApiPropertyOptional({
    description: 'End date of validity (null = unlimited)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  valid_until?: string;

  @ApiPropertyOptional({
    enum: PromoCodeStatus,
    default: PromoCodeStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(PromoCodeStatus)
  status?: PromoCodeStatus;

  @ApiPropertyOptional({
    description: 'Maximum total uses (null = unlimited)',
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  max_uses?: number;

  @ApiPropertyOptional({
    description: 'Maximum uses per user',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  max_uses_per_user?: number;

  @ApiPropertyOptional({
    description: 'Minimum order amount to apply promo',
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimum_order_amount?: number;

  @ApiPropertyOptional({
    description: 'Maximum discount amount (for percentage type)',
    example: 100000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximum_discount?: number;

  @ApiPropertyOptional({
    description: 'List of product IDs this promo applies to (null = all)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  applicable_products?: string[];

  @ApiPropertyOptional({
    description: 'List of location IDs this promo applies to (null = all)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  applicable_locations?: string[];

  @ApiPropertyOptional({
    description: 'List of machine IDs this promo applies to (null = all)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  applicable_machines?: string[];

  @ApiPropertyOptional({
    description: 'Human-readable name',
    example: 'Summer Sale 2024',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the promo',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Organization ID (for multi-tenant)',
  })
  @IsOptional()
  @IsUUID('4')
  organization_id?: string;
}
