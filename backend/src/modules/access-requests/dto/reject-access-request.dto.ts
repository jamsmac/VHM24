import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for rejecting an access request
 *
 * According to REQ-AUTH-33: Admin can reject with reason
 */
export class RejectAccessRequestDto {
  @ApiProperty({
    example: 'User is not authorized to access the system',
    description: 'Reason for rejection',
  })
  @IsString()
  rejection_reason: string;

  @ApiPropertyOptional({
    example: 'Discussed with manager',
    description: 'Additional notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
