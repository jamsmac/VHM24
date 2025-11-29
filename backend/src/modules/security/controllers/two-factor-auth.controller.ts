import { Controller, Post, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TwoFactorAuthService } from '../services/two-factor-auth.service';
import { Enable2FADto, Verify2FADto, VerifyBackupCodeDto } from '../dto/two-factor-auth.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';

@ApiTags('Security - Two-Factor Auth')
@ApiBearerAuth('JWT-auth')
@Controller('two-factor-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class TwoFactorAuthController {
  constructor(private readonly twoFactorAuthService: TwoFactorAuthService) {}

  @Post('setup')
  async setup(@Body() dto: Enable2FADto) {
    return this.twoFactorAuthService.generateSecret(dto.user_id, dto.email);
  }

  @Post('enable')
  async enable(@Body() dto: Verify2FADto) {
    const verified = await this.twoFactorAuthService.verifyAndEnable(dto.user_id, dto.token);
    return { verified };
  }

  @Post('verify')
  async verify(@Body() dto: Verify2FADto) {
    const verified = await this.twoFactorAuthService.verify(dto.user_id, dto.token);
    return { verified };
  }

  @Post('verify-backup-code')
  async verifyBackupCode(@Body() dto: VerifyBackupCodeDto) {
    const verified = await this.twoFactorAuthService.verifyBackupCode(dto.user_id, dto.code);
    return { verified };
  }

  @Delete(':userId')
  async disable(@Param('userId', ParseUUIDPipe) userId: string) {
    await this.twoFactorAuthService.disable(userId);
    return { disabled: true };
  }
}
