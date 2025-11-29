import { PartialType } from '@nestjs/swagger';
import { CreateOpeningBalanceDto } from './create-opening-balance.dto';
import { IsOptional, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOpeningBalanceDto extends PartialType(CreateOpeningBalanceDto) {
  @ApiPropertyOptional({ description: 'Общая стоимость (автоматически рассчитывается)' })
  @IsOptional()
  @IsNumber()
  total_cost?: number;
}
