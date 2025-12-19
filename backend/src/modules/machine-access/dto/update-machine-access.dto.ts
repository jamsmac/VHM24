import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MachineAccessRole } from '../entities/machine-access.entity';

export class UpdateMachineAccessDto {
  @ApiProperty({ enum: MachineAccessRole, description: 'New access role' })
  @IsEnum(MachineAccessRole)
  role: MachineAccessRole;
}
