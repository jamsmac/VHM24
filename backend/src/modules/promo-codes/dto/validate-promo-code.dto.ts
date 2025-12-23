import { IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidatePromoCodeDto {
  @ApiProperty({
    description: 'Promo code to validate',
    example: 'SUMMER2024',
  })
  @IsString()
  code: string;

  @ApiPropertyOptional({
    description: 'Order amount to calculate discount',
    example: 100000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order_amount?: number;

  @ApiPropertyOptional({
    description: 'Machine ID for location-specific promos',
  })
  @IsOptional()
  @IsUUID('4')
  machine_id?: string;

  @ApiPropertyOptional({
    description: 'Location ID for location-specific promos',
  })
  @IsOptional()
  @IsUUID('4')
  location_id?: string;

  @ApiPropertyOptional({
    description: 'Product IDs in the order',
    type: [String],
  })
  @IsOptional()
  @IsUUID('4', { each: true })
  product_ids?: string[];
}

export class ValidatePromoCodeResponseDto {
  @ApiProperty({ description: 'Is the promo code valid' })
  valid: boolean;

  @ApiPropertyOptional({ description: 'Error message if invalid' })
  error?: string;

  @ApiPropertyOptional({ description: 'Promo code ID' })
  promo_code_id?: string;

  @ApiPropertyOptional({ description: 'Type of discount' })
  type?: string;

  @ApiPropertyOptional({ description: 'Discount value' })
  value?: number;

  @ApiPropertyOptional({ description: 'Calculated discount amount' })
  discount_amount?: number;

  @ApiPropertyOptional({ description: 'Bonus points to be awarded (for loyalty_bonus type)' })
  bonus_points?: number;

  @ApiPropertyOptional({ description: 'Promo code description' })
  description?: string;
}
