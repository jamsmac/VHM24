import { Controller, Get, Delete, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SessionLogService } from '../services/session-log.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';

@ApiTags('Security - Sessions')
@ApiBearerAuth('JWT-auth')
@Controller('session-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class SessionLogController {
  constructor(private readonly sessionLogService: SessionLogService) {}

  @Get('user/:userId/active')
  async getActiveSessions(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.sessionLogService.getActiveSessions(userId);
  }

  @Get('user/:userId/history')
  async getSessionHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.sessionLogService.getSessionHistory(userId, limit ? Number(limit) : 50);
  }

  @Get('suspicious')
  async getSuspicious() {
    return this.sessionLogService.getSuspiciousSessions();
  }

  @Delete('session/:sessionId')
  async logout(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.sessionLogService.logoutSession(sessionId);
  }

  @Delete('user/:userId/all')
  async revokeAll(@Param('userId', ParseUUIDPipe) userId: string, @Query('reason') reason: string) {
    const count = await this.sessionLogService.revokeAllUserSessions(
      userId,
      reason || 'Manual revocation',
    );
    return { revoked_count: count };
  }
}
