import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { IntegrationLogService } from '../services/integration-log.service';
import { IntegrationLog } from '../entities/integration-log.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Integration Logs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integration-logs')
export class IntegrationLogController {
  constructor(private readonly logService: IntegrationLogService) {}

  @Get('integration/:integrationId')
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Get logs by integration' })
  @ApiParam({ name: 'integrationId', description: 'Integration UUID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limit results (default: 100)',
  })
  @ApiResponse({ status: 200, description: 'List of integration logs', type: [IntegrationLog] })
  async getByIntegration(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @Query('limit') limit?: number,
  ): Promise<IntegrationLog[]> {
    return this.logService.findByIntegration(integrationId, limit ? Number(limit) : 100);
  }

  @Get('integration/:integrationId/errors')
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Get error logs by integration' })
  @ApiParam({ name: 'integrationId', description: 'Integration UUID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limit results (default: 50)',
  })
  @ApiResponse({ status: 200, description: 'List of error logs', type: [IntegrationLog] })
  async getErrors(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @Query('limit') limit?: number,
  ): Promise<IntegrationLog[]> {
    return this.logService.getErrors(integrationId, limit ? Number(limit) : 50);
  }

  @Get('integration/:integrationId/stats')
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Get integration statistics' })
  @ApiParam({ name: 'integrationId', description: 'Integration UUID' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days (default: 7)',
  })
  @ApiResponse({ status: 200, description: 'Integration statistics' })
  async getStats(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @Query('days') days?: number,
  ) {
    return this.logService.getStats(integrationId, days ? Number(days) : 7);
  }

  @Get('date-range')
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Get logs by date range' })
  @ApiQuery({
    name: 'start_date',
    required: true,
    type: String,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({ name: 'end_date', required: true, type: String, description: 'End date (ISO 8601)' })
  @ApiQuery({
    name: 'integration_id',
    required: false,
    type: String,
    description: 'Filter by integration UUID',
  })
  @ApiResponse({ status: 200, description: 'List of logs in date range', type: [IntegrationLog] })
  async getByDateRange(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('integration_id') integrationId?: string,
  ): Promise<IntegrationLog[]> {
    return this.logService.findByDateRange(new Date(startDate), new Date(endDate), integrationId);
  }
}
