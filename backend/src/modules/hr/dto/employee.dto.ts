import {
  IsString,
  IsEmail,
  IsUUID,
  IsEnum,
  IsDateString,
  IsNumber,
  IsOptional,
  IsObject,
} from 'class-validator';
import { EmploymentType, EmploymentStatus } from '../entities/employee.entity';

export class CreateEmployeeDto {
  @IsUUID()
  user_id: string;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsOptional()
  @IsString()
  middle_name?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsDateString()
  date_of_birth: Date;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsUUID()
  department_id: string;

  @IsUUID()
  position_id: string;

  @IsOptional()
  @IsUUID()
  manager_id?: string;

  @IsEnum(EmploymentType)
  employment_type: EmploymentType;

  @IsDateString()
  hire_date: Date;

  @IsNumber()
  base_salary: number;

  @IsOptional()
  @IsString()
  salary_period?: string;

  @IsOptional()
  @IsString()
  bank_account?: string;

  @IsOptional()
  @IsString()
  tax_id?: string;

  @IsOptional()
  @IsObject()
  emergency_contact?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsUUID()
  department_id?: string;

  @IsOptional()
  @IsUUID()
  position_id?: string;

  @IsOptional()
  @IsUUID()
  manager_id?: string;

  @IsOptional()
  @IsNumber()
  base_salary?: number;

  @IsOptional()
  @IsObject()
  emergency_contact?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
