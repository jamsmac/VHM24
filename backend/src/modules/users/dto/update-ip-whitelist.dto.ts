import {
  IsBoolean,
  IsOptional,
  IsArray,
  IsString,
  ArrayMinSize,
  ValidateIf,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating IP Whitelist settings
 *
 * REQ-AUTH-60: IP Whitelist для админов
 */
export class UpdateIpWhitelistDto {
  @ApiProperty({
    example: true,
    description: 'Enable or disable IP Whitelist',
  })
  @IsBoolean()
  ip_whitelist_enabled: boolean;

  @ApiPropertyOptional({
    example: ['192.168.1.100', '10.0.0.0/24', '172.16.*'],
    description: 'List of allowed IP addresses (supports exact IPs, CIDR notation, and wildcards)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ValidateIf((o) => o.ip_whitelist_enabled)
  @ArrayMinSize(1, {
    message: 'При включенном IP Whitelist необходимо указать хотя бы один IP адрес',
  })
  @Matches(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^(\d{1,3}\.){3}\*$/, {
    each: true,
    message: 'IP адрес должен быть в формате: 192.168.1.100, 10.0.0.0/24 или 192.168.1.*',
  })
  allowed_ips?: string[];
}
