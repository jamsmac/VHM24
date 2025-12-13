import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO для разрешения несовпадения.
 */
export class ResolveMismatchDto {
  @ApiPropertyOptional({
    example: 'Разница возникла из-за округления',
    description: 'Комментарий при разрешении',
  })
  @IsOptional()
  @IsString()
  resolution_notes?: string;
}
