import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsDate, IsBoolean, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {
  @IsOptional()
  @IsNumber()
  failed_login_attempts?: number;

  @IsOptional()
  @IsDate()
  account_locked_until?: Date | null;

  @IsOptional()
  @IsDate()
  last_failed_login_at?: Date | null;

  @IsOptional()
  @IsBoolean()
  is_2fa_enabled?: boolean;

  @IsOptional()
  @IsString()
  two_fa_secret?: string | null;
}
