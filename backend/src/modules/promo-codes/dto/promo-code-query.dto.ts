import { IsOptional, IsEnum, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PromoCodeType, PromoCodeStatus } from '../enums';

export class PromoCodeQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Search by code or name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PromoCodeStatus })
  @IsOptional()
  @IsEnum(PromoCodeStatus)
  status?: PromoCodeStatus;

  @ApiPropertyOptional({ enum: PromoCodeType })
  @IsOptional()
  @IsEnum(PromoCodeType)
  type?: PromoCodeType;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsUUID('4')
  organization_id?: string;

  @ApiPropertyOptional({
    description: 'Filter: only active (not expired, not paused)',
    default: false,
  })
  @IsOptional()
  active_only?: boolean;

  @ApiPropertyOptional({ description: 'Sort field', default: 'created_at' })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 'DESC' })
  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC';
}
