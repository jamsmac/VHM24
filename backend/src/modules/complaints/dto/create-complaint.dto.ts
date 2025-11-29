import {
  IsEnum,
  IsUUID,
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplaintType } from '../entities/complaint.entity';

/**
 * DTO для создания жалобы (публичный endpoint через QR-код)
 */
export class CreateComplaintDto {
  @ApiProperty({ enum: ComplaintType, example: ComplaintType.PRODUCT_QUALITY })
  @IsEnum(ComplaintType)
  complaint_type: ComplaintType;

  @ApiProperty({ example: 'uuid', description: 'ID аппарата' })
  @IsUUID()
  machine_id: string;

  @ApiProperty({ example: 'Кофе был холодным' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: 'Иван Иванов' })
  @IsOptional()
  @IsString()
  customer_name?: string;

  @ApiPropertyOptional({ example: '+79991234567' })
  @IsOptional()
  @IsString()
  customer_phone?: string;

  @ApiPropertyOptional({ example: 'client@example.com' })
  @IsOptional()
  @IsEmail()
  customer_email?: string;

  @ApiPropertyOptional({ example: 5, description: 'Оценка 1-5' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO для создания жалобы через QR-код (публичный endpoint)
 */
export class CreatePublicComplaintDto {
  @ApiProperty({ example: 'QR-1234-ABCD', description: 'QR-код аппарата' })
  @IsString()
  qr_code: string;

  @ApiProperty({ enum: ComplaintType, example: ComplaintType.PRODUCT_QUALITY })
  @IsEnum(ComplaintType)
  complaint_type: ComplaintType;

  @ApiProperty({ example: 'Кофе был холодным' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: 'Иван Иванов' })
  @IsOptional()
  @IsString()
  customer_name?: string;

  @ApiPropertyOptional({ example: '+79991234567' })
  @IsOptional()
  @IsString()
  customer_phone?: string;

  @ApiPropertyOptional({ example: 'client@example.com' })
  @IsOptional()
  @IsEmail()
  customer_email?: string;

  @ApiPropertyOptional({ example: 5, description: 'Оценка 1-5' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO для обработки жалобы (внутренний endpoint)
 */
export class HandleComplaintDto {
  @ApiProperty({ example: 'Возврат денег выполнен' })
  @IsString()
  response: string;

  @ApiPropertyOptional({ example: 150.0, description: 'Сумма возврата' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refund_amount?: number;

  @ApiPropertyOptional({ example: 'uuid', description: 'ID транзакции возврата' })
  @IsOptional()
  @IsUUID()
  refund_transaction_id?: string;
}
