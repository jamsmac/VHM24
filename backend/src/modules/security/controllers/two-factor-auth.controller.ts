import { Controller, Post, Delete, Get, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TwoFactorAuthService } from '../services/two-factor-auth.service';
import { Enable2FADto, Verify2FADto, VerifyBackupCodeDto } from '../dto/two-factor-auth.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';

@ApiTags('Security - Two-Factor Auth')
@ApiBearerAuth('JWT-auth')
@Controller('two-factor-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TwoFactorAuthController {
  constructor(private readonly twoFactorAuthService: TwoFactorAuthService) {}

  /**
   * Get 2FA status for current user
   * Any authenticated user can check their own 2FA status
   */
  @Get('status/me')
  @ApiOperation({ summary: 'Get 2FA status for current user' })
  @ApiResponse({
    status: 200,
    description: '2FA status retrieved successfully',
  })
  async getMyStatus(@CurrentUser() user: User) {
    return this.twoFactorAuthService.getStatus(user.id);
  }

  /**
   * Get 2FA status for a specific user (admin only)
   */
  @Get('status/:userId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get 2FA status for a specific user (admin only)' })
  @ApiResponse({
    status: 200,
    description: '2FA status retrieved successfully',
  })
  async getStatus(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.twoFactorAuthService.getStatus(userId);
  }

  @Post('setup')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async setup(@Body() dto: Enable2FADto) {
    return this.twoFactorAuthService.generateSecret(dto.user_id, dto.email);
  }

  @Post('enable')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async enable(@Body() dto: Verify2FADto) {
    const verified = await this.twoFactorAuthService.verifyAndEnable(dto.user_id, dto.token);
    return { verified };
  }

  @Post('verify')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async verify(@Body() dto: Verify2FADto) {
    const verified = await this.twoFactorAuthService.verify(dto.user_id, dto.token);
    return { verified };
  }

  @Post('verify-backup-code')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async verifyBackupCode(@Body() dto: VerifyBackupCodeDto) {
    const verified = await this.twoFactorAuthService.verifyBackupCode(dto.user_id, dto.code);
    return { verified };
  }

  @Delete(':userId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async disable(@Param('userId', ParseUUIDPipe) userId: string) {
    await this.twoFactorAuthService.disable(userId);
    return { disabled: true };
  }
}
