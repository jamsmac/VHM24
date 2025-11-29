import { IsUUID, IsNumber, Min, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO для перемещения со склада оператору
 */
export class TransferWarehouseToOperatorDto {
  @ApiProperty({ example: 'uuid', description: 'ID оператора' })
  @IsUUID()
  operator_id: string;

  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @IsUUID()
  nomenclature_id: string;

  @ApiProperty({ example: 25.5, description: 'Количество для передачи' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({
    example: 'Выдано оператору для пополнения аппаратов',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO для возврата от оператора на склад
 */
export class TransferOperatorToWarehouseDto {
  @ApiProperty({ example: 'uuid', description: 'ID оператора' })
  @IsUUID()
  operator_id: string;

  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @IsUUID()
  nomenclature_id: string;

  @ApiProperty({ example: 5.5, description: 'Количество для возврата' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({
    example: 'Возврат неиспользованного товара',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO для пополнения аппарата оператором
 * Обычно вызывается автоматически при завершении задачи пополнения
 */
export class TransferOperatorToMachineDto {
  @ApiProperty({ example: 'uuid', description: 'ID оператора' })
  @IsUUID()
  operator_id: string;

  @ApiProperty({ example: 'uuid', description: 'ID аппарата' })
  @IsUUID()
  machine_id: string;

  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @IsUUID()
  nomenclature_id: string;

  @ApiProperty({ example: 10.5, description: 'Количество для пополнения' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({
    example: 'uuid',
    description: 'ID задачи пополнения',
  })
  @IsOptional()
  @IsUUID()
  task_id?: string;

  @ApiPropertyOptional({
    example: 'Пополнение по задаче #123',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: '2025-11-15T14:30:00Z',
    description:
      'Дата фактического выполнения операции (для ввода исторических данных). Если не указано, используется текущее время.',
  })
  @IsOptional()
  @IsDateString()
  operation_date?: string;
}

/**
 * DTO для изъятия из аппарата (просрочка, брак)
 */
export class TransferMachineToOperatorDto {
  @ApiProperty({ example: 'uuid', description: 'ID оператора' })
  @IsUUID()
  operator_id: string;

  @ApiProperty({ example: 'uuid', description: 'ID аппарата' })
  @IsUUID()
  machine_id: string;

  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @IsUUID()
  nomenclature_id: string;

  @ApiProperty({ example: 2.5, description: 'Количество для изъятия' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({
    example: 'Изъятие просроченного товара',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
