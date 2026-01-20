import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateEntryDto } from './create-entry.dto';

/**
 * DTO for updating an existing directory entry
 * Code and origin cannot be changed after creation
 */
export class UpdateEntryDto extends PartialType(
  OmitType(CreateEntryDto, ['code', 'origin', 'external_id'] as const),
) {
  @ApiPropertyOptional({ description: 'Replacement entry ID for deprecation' })
  @IsOptional()
  @IsUUID()
  replacement_entry_id?: string;

  @ApiPropertyOptional({ description: 'Rejection reason (when rejecting approval)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejection_reason?: string;
}
