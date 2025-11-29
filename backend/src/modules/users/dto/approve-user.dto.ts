import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class ApproveUserDto {
  @ApiProperty({
    enum: UserRole,
    example: UserRole.OPERATOR,
    description: 'Role to assign to the user',
  })
  @IsEnum(UserRole, { message: 'Неверная роль пользователя' })
  role: UserRole;
}
