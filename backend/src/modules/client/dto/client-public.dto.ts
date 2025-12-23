import { IsString, IsOptional, IsUUID, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query params for public locations list
 */
export class PublicLocationsQueryDto {
  @ApiPropertyOptional({ description: 'Search by name or address' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'User latitude for distance calculation' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'User longitude for distance calculation' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 50;
}

/**
 * Response DTO for public location
 */
export class PublicLocationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  lat?: number;

  @ApiPropertyOptional()
  lng?: number;

  @ApiPropertyOptional({ description: 'Distance in km if coordinates provided' })
  distance_km?: number;

  @ApiProperty({ description: 'Number of active machines at this location' })
  machine_count: number;

  @ApiPropertyOptional({ description: 'Working hours by day of week' })
  working_hours?: {
    monday?: { from: string; to: string };
    tuesday?: { from: string; to: string };
    wednesday?: { from: string; to: string };
    thursday?: { from: string; to: string };
    friday?: { from: string; to: string };
    saturday?: { from: string; to: string };
    sunday?: { from: string; to: string };
  };
}

/**
 * Query params for public menu (machine products)
 */
export class PublicMenuQueryDto {
  @ApiProperty({ description: 'Machine ID' })
  @IsUUID()
  machine_id: string;

  @ApiPropertyOptional({ description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;
}

/**
 * Response DTO for menu item
 */
export class MenuItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional()
  image_url?: string;

  @ApiProperty()
  is_available: boolean;

  @ApiPropertyOptional({ description: 'Current stock level' })
  stock?: number;

  @ApiPropertyOptional({ description: 'Loyalty points earned per purchase' })
  points_earned?: number;
}

/**
 * QR code resolution request
 */
export class QrResolveDto {
  @ApiProperty({
    description: 'QR code content (machine_number or full URL)',
    example: 'M-001',
  })
  @IsString()
  qr_code: string;
}

/**
 * QR code resolution response
 */
export class QrResolveResponseDto {
  @ApiProperty()
  machine_id: string;

  @ApiProperty()
  machine_number: string;

  @ApiProperty()
  machine_name: string;

  @ApiPropertyOptional()
  location?: PublicLocationResponseDto;

  @ApiProperty({ description: 'Whether machine is available for orders' })
  is_available: boolean;

  @ApiPropertyOptional({ description: 'Reason if not available' })
  unavailable_reason?: string;
}

/**
 * Cooperation request DTO
 */
export class CooperationRequestDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'My Company LLC' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ example: 'I want to install vending machines in my business center' })
  @IsString()
  message: string;
}
