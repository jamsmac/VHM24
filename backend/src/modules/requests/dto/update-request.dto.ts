import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RequestPriority } from '../entities/request.entity';

/**
 * DTO для обновления заявки.
 *
 * Примечание: позиции обновляются отдельными методами.
 */
export class UpdateRequestDto {
  @ApiPropertyOptional({
    enum: RequestPriority,
    description: 'Приоритет заявки',
  })
  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @ApiPropertyOptional({ description: 'Комментарий' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Заметки администратора' })
  @IsOptional()
  @IsString()
  admin_notes?: string;

  @ApiPropertyOptional({ example: '2025-01-20', description: 'Желаемая дата доставки' })
  @IsOptional()
  @IsDateString()
  desired_delivery_date?: string;
}

/**
 * DTO для одобрения заявки.
 */
export class ApproveRequestDto {
  @ApiPropertyOptional({ description: 'Заметки при одобрении' })
  @IsOptional()
  @IsString()
  admin_notes?: string;
}

/**
 * DTO для отклонения заявки.
 */
export class RejectRequestDto {
  @ApiPropertyOptional({ description: 'Причина отклонения' })
  @IsOptional()
  @IsString()
  rejection_reason?: string;
}

/**
 * DTO для отметки об отправке поставщику.
 */
export class SendToSupplierDto {
  @ApiPropertyOptional({ description: 'ID сообщения в Telegram' })
  @IsOptional()
  @IsString()
  sent_message_id?: string;
}

/**
 * DTO для завершения заявки.
 */
export class CompleteRequestDto {
  @ApiPropertyOptional({ example: '2025-01-22', description: 'Фактическая дата доставки' })
  @IsOptional()
  @IsDateString()
  actual_delivery_date?: string;

  @ApiPropertyOptional({ description: 'Заметки о завершении' })
  @IsOptional()
  @IsString()
  completion_notes?: string;
}

/**
 * DTO для обновления полученного количества позиции.
 */
export class UpdateReceivedQuantityDto {
  @ApiPropertyOptional({ example: 8, description: 'Полученное количество' })
  @IsOptional()
  received_quantity?: number;
}
