import { IsUUID, IsDateString, IsOptional, IsString, IsObject } from 'class-validator';

export class CheckInDto {
  @IsUUID()
  employee_id: string;

  @IsDateString()
  date: Date;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CheckOutDto {
  @IsUUID()
  employee_id: string;

  @IsDateString()
  date: Date;
}

export class MarkAbsentDto {
  @IsUUID()
  employee_id: string;

  @IsDateString()
  date: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
