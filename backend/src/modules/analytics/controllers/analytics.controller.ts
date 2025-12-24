import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AnalyticsCalculationService } from '../services/analytics-calculation.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';

@ApiTags('analytics')
@Controller('analytics/realtime')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsRealtimeController {
  constructor(private analyticsService: AnalyticsCalculationService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get analytics metrics' })
  async getMetrics(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.calculateMetrics(query);
  }

  @Get('top-machines')
  @ApiOperation({ summary: 'Get top performing machines' })
  async getTopMachines(@Query('limit') limit?: number, @Query('days') days?: number) {
    return this.analyticsService.getTopMachines(limit, days);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top selling products' })
  async getTopProducts(@Query('limit') limit?: number, @Query('days') days?: number) {
    return this.analyticsService.getTopProducts(limit, days);
  }

  @Get('machine-status')
  @ApiOperation({ summary: 'Get machine status summary' })
  async getMachineStatus() {
    return this.analyticsService.getMachineStatusSummary();
  }
}
