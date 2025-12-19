import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MachineAccessRole } from '../entities/machine-access.entity';

export class CreateMachineAccessDto {
  @ApiProperty({ description: 'Machine ID' })
  @IsUUID()
  machine_id: string;

  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ enum: MachineAccessRole, description: 'Access role for this machine' })
  @IsEnum(MachineAccessRole)
  role: MachineAccessRole;
}
