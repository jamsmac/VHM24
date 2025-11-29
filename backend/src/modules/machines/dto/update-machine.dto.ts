import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMachineDto } from './create-machine.dto';

export class UpdateMachineDto extends PartialType(
  OmitType(CreateMachineDto, ['machine_number', 'qr_code'] as const),
) {}
