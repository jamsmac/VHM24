import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SecurityEventService } from '../services/security-event.service';
import { CreateSecurityEventDto, InvestigateEventDto } from '../dto/security-event.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';

@ApiTags('Security - Events')
@ApiBearerAuth('JWT-auth')
@Controller('security-events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class SecurityEventController {
  constructor(private readonly securityEventService: SecurityEventService) {}

  @Post()
  async create(@Body() dto: CreateSecurityEventDto) {
    return this.securityEventService.logEvent(dto);
  }

  @Get('user/:userId')
  async getUserEvents(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.securityEventService.getRecentEvents(userId, limit ? Number(limit) : 50);
  }

  @Get('user/:userId/failed-logins')
  async getFailedLogins(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('since_minutes') sinceMinutes?: number,
  ) {
    const count = await this.securityEventService.getFailedLoginAttempts(
      userId,
      sinceMinutes ? Number(sinceMinutes) : 30,
    );
    return { count };
  }

  @Get('critical')
  async getCriticalEvents(@Query('days') days?: number) {
    return this.securityEventService.getCriticalEvents(days ? Number(days) : 7);
  }

  @Get('investigation-required')
  async getInvestigationRequired() {
    return this.securityEventService.getEventsRequiringInvestigation();
  }

  @Put(':id/investigate')
  async investigate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: InvestigateEventDto) {
    return this.securityEventService.markInvestigated(
      id,
      dto.investigated_by_id,
      dto.investigation_notes,
    );
  }

  @Get('report')
  async getReport(@Query('days') days?: number) {
    return this.securityEventService.getSecurityReport(days ? Number(days) : 30);
  }
}
