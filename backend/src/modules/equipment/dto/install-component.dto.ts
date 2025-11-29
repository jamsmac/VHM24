import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InstallComponentDto {
  @ApiProperty({
    description: 'Machine ID where component will be installed',
    example: 'uuid',
  })
  @IsUUID()
  machine_id: string;

  @ApiPropertyOptional({
    description: 'Related task ID (if installation is part of a task)',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  task_id?: string;

  @ApiPropertyOptional({
    description: 'Comment about the installation',
    example: 'Replacing old grinder with new one',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
