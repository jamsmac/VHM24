import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectUserDto {
  @ApiProperty({
    example: 'Insufficient qualifications',
    minLength: 10,
    maxLength: 500,
    description: 'Reason for rejection',
  })
  @IsString({ message: 'Причина должна быть строкой' })
  @MinLength(10, { message: 'Причина должна содержать минимум 10 символов' })
  @MaxLength(500, { message: 'Причина не может превышать 500 символов' })
  reason: string;
}
