import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogService } from '../services/audit-log.service';
import { CreateAuditLogDto } from '../dto/audit-log.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';

@ApiTags('Security - Audit Logs')
@ApiBearerAuth('JWT-auth')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'Owner')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Post()
  async create(@Body() dto: CreateAuditLogDto) {
    return this.auditLogService.log(dto);
  }

  @Get('user/:userId')
  async getByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.auditLogService.findByUser(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('entity/:entityType/:entityId')
  async getByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.auditLogService.findByEntity(entityType, entityId);
  }

  @Get('action/:action')
  async getByAction(
    @Param('action') action: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.auditLogService.findByAction(
      action,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('sensitive')
  async getSensitive(@Query('days') days?: number) {
    return this.auditLogService.getSensitiveActions(days ? Number(days) : 7);
  }

  @Get('statistics')
  async getStatistics(@Query('days') days?: number) {
    return this.auditLogService.getStatistics(days ? Number(days) : 7);
  }
}
