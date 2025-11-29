import { IsString, IsOptional, IsDateString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WriteoffMachineDto {
  @ApiProperty({
    example: 'Аппарат выработал свой ресурс и не подлежит ремонту',
    description: 'Причина списания',
  })
  @IsString()
  @MinLength(10, { message: 'Укажите детальную причину списания (минимум 10 символов)' })
  disposal_reason: string;

  @ApiPropertyOptional({
    example: '2025-11-16',
    description: 'Дата списания (если не указана, используется текущая дата)',
  })
  @IsOptional()
  @IsDateString()
  disposal_date?: string;
}
