import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MachineAccessRole } from '../entities/machine-access.entity';

export class CreateAccessTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateAccessTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateTemplateRowDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ enum: MachineAccessRole, description: 'Access role' })
  @IsEnum(MachineAccessRole)
  role: MachineAccessRole;
}

export class ApplyTemplateDto {
  @ApiPropertyOptional({ description: 'List of machine numbers to apply template to' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  machineNumbers?: string[];

  @ApiPropertyOptional({ description: 'List of machine IDs to apply template to' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  machineIds?: string[];
}

export class ApplyTemplateResponseDto {
  @ApiProperty({ description: 'Number of access entries created' })
  applied_count: number;

  @ApiProperty({ description: 'Number of access entries updated' })
  updated_count: number;

  @ApiProperty({ description: 'Number of machines processed' })
  machines_processed: number;

  @ApiProperty({ description: 'List of errors' })
  errors: string[];
}

export class BulkAssignDto {
  @ApiProperty({ description: 'User ID to assign' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ enum: MachineAccessRole, description: 'Access role' })
  @IsEnum(MachineAccessRole)
  role: MachineAccessRole;

  @ApiPropertyOptional({ description: 'List of machine numbers' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  machineNumbers?: string[];

  @ApiPropertyOptional({ description: 'List of machine IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  machineIds?: string[];
}
