import { IsOptional, IsUUID, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../entities/commission-calculation.entity';

/**
 * DTO for marking a commission calculation as paid
 */
export class MarkPaidDto {
  @ApiPropertyOptional({
    description: 'ID of the payment transaction (for audit trail)',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  payment_transaction_id?: string;

  @ApiPropertyOptional({
    description: 'Date when payment was made (defaults to now)',
    example: '2025-11-15T10:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  payment_date?: string;
}

/**
 * DTO for updating payment details
 */
export class UpdatePaymentDto {
  @ApiPropertyOptional({
    description: 'Update payment status',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Payment due date',
    example: '2025-12-15',
  })
  @IsOptional()
  @IsDateString()
  payment_due_date?: string;

  @ApiPropertyOptional({
    description: 'Payment transaction ID',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  payment_transaction_id?: string;

  @ApiPropertyOptional({
    description: 'Payment date',
    example: '2025-11-15T10:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  payment_date?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Payment processed via bank transfer',
  })
  @IsOptional()
  notes?: string;
}
