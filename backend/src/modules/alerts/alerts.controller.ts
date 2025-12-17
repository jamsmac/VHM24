import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import {
  AcknowledgeAlertDto,
  ResolveAlertDto,
  FilterAlertHistoryDto,
} from './dto/alert-history.dto';
import { AlertMetric, AlertSeverity } from './entities/alert-rule.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';

@ApiTags('Alerts')
@ApiBearerAuth('JWT-auth')
@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  // ============================================================================
  // ALERT RULES
  // ============================================================================

  @Post('rules')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new alert rule' })
  @ApiResponse({ status: 201, description: 'Alert rule created successfully' })
  async createRule(
    @Body() dto: CreateAlertRuleDto,
    @CurrentUser() user: User,
  ) {
    return this.alertsService.createRule(dto, user.id);
  }

  @Get('rules')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all alert rules' })
  @ApiQuery({ name: 'is_enabled', required: false, type: Boolean })
  @ApiQuery({ name: 'metric', required: false, enum: AlertMetric })
  @ApiQuery({ name: 'severity', required: false, enum: AlertSeverity })
  async findAllRules(
    @Query('is_enabled') isEnabled?: string,
    @Query('metric') metric?: AlertMetric,
    @Query('severity') severity?: AlertSeverity,
  ) {
    const filters: { is_enabled?: boolean; metric?: AlertMetric; severity?: AlertSeverity } = {};
    if (isEnabled !== undefined) {
      filters.is_enabled = isEnabled === 'true';
    }
    if (metric) filters.metric = metric;
    if (severity) filters.severity = severity;

    return this.alertsService.findAllRules(filters);
  }

  @Get('rules/:id')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get alert rule by ID' })
  async findRuleById(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.findRuleById(id);
  }

  @Patch('rules/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update alert rule' })
  async updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertRuleDto,
    @CurrentUser() user: User,
  ) {
    return this.alertsService.updateRule(id, dto, user.id);
  }

  @Delete('rules/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete alert rule' })
  async deleteRule(@Param('id', ParseUUIDPipe) id: string) {
    await this.alertsService.deleteRule(id);
    return { deleted: true };
  }

  @Patch('rules/:id/toggle')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Enable or disable alert rule' })
  @ApiQuery({ name: 'enabled', required: true, type: Boolean })
  async toggleRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('enabled') enabled: string,
  ) {
    return this.alertsService.toggleRule(id, enabled === 'true');
  }

  // ============================================================================
  // ALERT HISTORY
  // ============================================================================

  @Get('history')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get alert history with filters' })
  async getAlertHistory(@Query() filters: FilterAlertHistoryDto) {
    return this.alertsService.getAlertHistory(filters);
  }

  @Get('history/active')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get active alerts' })
  async getActiveAlerts() {
    return this.alertsService.getAlertHistory({ status: 'active' as any });
  }

  @Get('history/count')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get active alerts count' })
  async getActiveAlertsCount() {
    const count = await this.alertsService.getActiveAlertsCount();
    return { count };
  }

  @Get('history/:id')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get alert by ID' })
  async findAlertById(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.findAlertById(id);
  }

  @Post('history/:id/acknowledge')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  async acknowledgeAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcknowledgeAlertDto,
    @CurrentUser() user: User,
  ) {
    return this.alertsService.acknowledgeAlert(id, dto, user.id);
  }

  @Post('history/:id/resolve')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Resolve an alert' })
  async resolveAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveAlertDto,
    @CurrentUser() user: User,
  ) {
    return this.alertsService.resolveAlert(id, dto, user.id);
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  @Get('statistics')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get alert statistics' })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  async getStatistics(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.alertsService.getStatistics(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
  }

  // ============================================================================
  // MANUAL TRIGGER (for testing)
  // ============================================================================

  @Post('rules/:id/test')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Test trigger an alert rule (for testing purposes)' })
  async testTriggerRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { current_value: number; machine_id?: string },
  ) {
    return this.alertsService.evaluateRule(id, body.current_value, {
      machine_id: body.machine_id,
      additional_data: { test: true },
    });
  }
}
