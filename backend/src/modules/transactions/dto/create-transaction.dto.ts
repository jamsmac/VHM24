import {
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType, PaymentMethod, ExpenseCategory } from '../entities/transaction.entity';

// Maximum transaction amount in UZS (10 billion)
const MAX_TRANSACTION_AMOUNT = 10_000_000_000;

export class CreateTransactionDto {
  @ApiProperty({ enum: TransactionType, example: TransactionType.SALE })
  @IsEnum(TransactionType)
  transaction_type: TransactionType;

  @ApiProperty({ example: 150.5, description: 'Сумма транзакции (0 - 10,000,000,000 UZS)' })
  @IsNumber()
  @Min(0, { message: 'Amount must be non-negative' })
  @Max(MAX_TRANSACTION_AMOUNT, { message: 'Amount exceeds maximum allowed value' })
  amount: number;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  @ApiPropertyOptional({ example: 'uuid', description: 'ID аппарата' })
  @IsOptional()
  @IsUUID()
  machine_id?: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'ID пользователя' })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({ example: '2025-11-14T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  transaction_date?: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'ID рецепта (для продаж)' })
  @IsOptional()
  @IsUUID()
  recipe_id?: string;

  @ApiPropertyOptional({ example: 1, description: 'Количество (для продаж)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    enum: ExpenseCategory,
    example: ExpenseCategory.PURCHASE,
  })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  expense_category?: ExpenseCategory;

  @ApiPropertyOptional({ example: 'uuid', description: 'ID задачи инкассации' })
  @IsOptional()
  @IsUUID()
  collection_task_id?: string;

  @ApiPropertyOptional({ example: 'Описание транзакции' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: { invoice_number: 'INV-2024-001' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO для регистрации продажи
 */
export class RecordSaleDto {
  @ApiProperty({ example: 'uuid', description: 'ID аппарата' })
  @IsUUID()
  machine_id: string;

  @ApiProperty({ example: 'uuid', description: 'ID рецепта', required: false })
  @IsOptional()
  @IsUUID()
  recipe_id?: string;

  @ApiProperty({ example: 150.5, description: 'Сумма продажи (0.01 - 10,000,000,000 UZS)' })
  @IsNumber()
  @Min(0.01, { message: 'Sale amount must be positive' })
  @Max(MAX_TRANSACTION_AMOUNT, { message: 'Amount exceeds maximum allowed value' })
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO для регистрации инкассации
 */
export class RecordCollectionDto {
  @ApiProperty({ example: 'uuid', description: 'ID аппарата' })
  @IsUUID()
  machine_id: string;

  @ApiProperty({ example: 'uuid', description: 'ID оператора' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ example: 5000.5, description: 'Собранная сумма (0 - 10,000,000,000 UZS)' })
  @IsNumber()
  @Min(0, { message: 'Collection amount must be non-negative' })
  @Max(MAX_TRANSACTION_AMOUNT, { message: 'Amount exceeds maximum allowed value' })
  amount: number;

  @ApiPropertyOptional({ example: 'uuid', description: 'ID задачи инкассации' })
  @IsOptional()
  @IsUUID()
  collection_task_id?: string;

  @ApiPropertyOptional({ example: 'Инкассация за неделю' })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO для регистрации расхода
 */
export class RecordExpenseDto {
  @ApiProperty({ example: 15000, description: 'Сумма расхода (0.01 - 10,000,000,000 UZS)' })
  @IsNumber()
  @Min(0.01, { message: 'Expense amount must be positive' })
  @Max(MAX_TRANSACTION_AMOUNT, { message: 'Amount exceeds maximum allowed value' })
  amount: number;

  @ApiProperty({ enum: ExpenseCategory, example: ExpenseCategory.PURCHASE })
  @IsEnum(ExpenseCategory)
  expense_category: ExpenseCategory;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  @ApiPropertyOptional({ example: 'uuid', description: 'ID пользователя' })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiProperty({ example: 'Закупка кофейных зерен' })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    example: { invoice_number: 'INV-2024-001', supplier: 'Coffee Beans Ltd' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
