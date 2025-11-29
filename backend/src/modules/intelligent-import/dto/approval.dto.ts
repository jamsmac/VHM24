import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ApprovalAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ApprovalDto {
  @ApiProperty({ enum: ApprovalAction })
  @IsEnum(ApprovalAction)
  action: ApprovalAction;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
