import { IsString, IsUUID, IsEmail } from 'class-validator';

export class Enable2FADto {
  @IsUUID()
  user_id: string;

  @IsEmail()
  email: string;
}

export class Verify2FADto {
  @IsUUID()
  user_id: string;

  @IsString()
  token: string;
}

export class VerifyBackupCodeDto {
  @IsUUID()
  user_id: string;

  @IsString()
  code: string;
}
