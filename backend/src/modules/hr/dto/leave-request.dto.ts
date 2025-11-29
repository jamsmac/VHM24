import { IsUUID, IsEnum, IsDateString, IsString, IsOptional, IsObject } from 'class-validator';
import { LeaveType } from '../entities/leave-request.entity';

export class CreateLeaveRequestDto {
  @IsUUID()
  employee_id: string;

  @IsEnum(LeaveType)
  leave_type: LeaveType;

  @IsDateString()
  start_date: Date;

  @IsDateString()
  end_date: Date;

  @IsString()
  reason: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ApproveLeaveDto {
  @IsUUID()
  approved_by_id: string;
}

export class RejectLeaveDto {
  @IsUUID()
  approved_by_id: string;

  @IsString()
  rejection_reason: string;
}
