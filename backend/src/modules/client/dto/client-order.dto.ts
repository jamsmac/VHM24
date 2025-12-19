import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientOrderStatus, PaymentProvider } from '../entities/client-order.entity';

/**
 * Order item in create order request
 */
export class OrderItemDto {
  @ApiProperty({ description: 'Product/nomenclature ID' })
  @IsUUID()
  product_id: string;

  @ApiProperty({ description: 'Quantity', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit price override (if allowed)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unit_price?: number;
}

/**
 * DTO for creating a client order
 */
export class CreateClientOrderDto {
  @ApiProperty({ description: 'Machine ID to order from' })
  @IsUUID()
  machine_id: string;

  @ApiProperty({ type: [OrderItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  payment_provider: PaymentProvider;

  @ApiPropertyOptional({ description: 'Points to redeem for discount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  redeem_points?: number;

  @ApiPropertyOptional({ description: 'Promo code to apply' })
  @IsOptional()
  @IsString()
  promo_code?: string;
}

/**
 * Response DTO for order with payment info
 */
export class ClientOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ClientOrderStatus })
  status: ClientOrderStatus;

  @ApiProperty()
  total_amount: number;

  @ApiProperty()
  discount_amount: number;

  @ApiProperty()
  final_amount: number;

  @ApiProperty()
  points_earned: number;

  @ApiProperty()
  points_redeemed: number;

  @ApiProperty({ enum: PaymentProvider })
  payment_provider: PaymentProvider;

  @ApiPropertyOptional({ description: 'Payment URL for redirect' })
  payment_url?: string;

  @ApiPropertyOptional({ description: 'Machine info' })
  machine?: {
    id: string;
    name: string;
    machine_number: string;
  };

  @ApiProperty()
  created_at: Date;

  @ApiPropertyOptional()
  paid_at?: Date;
}

/**
 * Query params for order list
 */
export class ClientOrderQueryDto {
  @ApiPropertyOptional({ enum: ClientOrderStatus })
  @IsOptional()
  @IsEnum(ClientOrderStatus)
  status?: ClientOrderStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
