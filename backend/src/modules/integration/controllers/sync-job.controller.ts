import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SyncJobService } from '../services/sync-job.service';
import { CreateSyncJobDto } from '../dto/sync-job.dto';
import { SyncJob } from '../entities/sync-job.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Sync Jobs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sync-jobs')
export class SyncJobController {
  constructor(private readonly syncJobService: SyncJobService) {}

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create sync job' })
  @ApiResponse({ status: 201, description: 'Sync job created', type: SyncJob })
  async create(@Body() dto: CreateSyncJobDto): Promise<SyncJob> {
    return this.syncJobService.createJob(dto);
  }

  @Get('scheduled')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get scheduled sync jobs' })
  @ApiResponse({ status: 200, description: 'List of scheduled jobs', type: [SyncJob] })
  async getScheduled(): Promise<SyncJob[]> {
    return this.syncJobService.getScheduledJobs();
  }

  @Get('integration/:integrationId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get sync jobs by integration' })
  @ApiParam({ name: 'integrationId', description: 'Integration UUID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limit results (default: 50)',
  })
  @ApiResponse({ status: 200, description: 'List of sync jobs', type: [SyncJob] })
  async getByIntegration(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @Query('limit') limit?: number,
  ): Promise<SyncJob[]> {
    return this.syncJobService.getJobsByIntegration(integrationId, limit ? Number(limit) : 50);
  }

  @Get('integration/:integrationId/history')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get sync job history' })
  @ApiParam({ name: 'integrationId', description: 'Integration UUID' })
  @ApiQuery({
    name: 'entity_type',
    required: false,
    type: String,
    description: 'Filter by entity type',
  })
  @ApiResponse({ status: 200, description: 'Sync job history', type: [SyncJob] })
  async getHistory(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @Query('entity_type') entityType?: string,
  ): Promise<SyncJob[]> {
    return this.syncJobService.getJobHistory(integrationId, entityType);
  }

  @Post(':id/start')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Start sync job' })
  @ApiParam({ name: 'id', description: 'Sync job UUID' })
  @ApiResponse({ status: 200, description: 'Sync job started', type: SyncJob })
  @ApiResponse({ status: 404, description: 'Sync job not found' })
  async start(@Param('id', ParseUUIDPipe) id: string): Promise<SyncJob> {
    return this.syncJobService.startJob(id);
  }

  @Patch(':id/complete')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Complete sync job' })
  @ApiParam({ name: 'id', description: 'Sync job UUID' })
  @ApiResponse({ status: 200, description: 'Sync job completed', type: SyncJob })
  @ApiResponse({ status: 404, description: 'Sync job not found' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('results') results?: Record<string, any>,
  ): Promise<SyncJob> {
    return this.syncJobService.completeJob(id, results);
  }

  @Patch(':id/fail')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Mark sync job as failed' })
  @ApiParam({ name: 'id', description: 'Sync job UUID' })
  @ApiResponse({ status: 200, description: 'Sync job marked as failed', type: SyncJob })
  @ApiResponse({ status: 404, description: 'Sync job not found' })
  async fail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('error') error: string,
  ): Promise<SyncJob> {
    return this.syncJobService.failJob(id, error);
  }

  @Patch(':id/progress')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update sync job progress' })
  @ApiParam({ name: 'id', description: 'Sync job UUID' })
  @ApiResponse({ status: 200, description: 'Progress updated', type: SyncJob })
  @ApiResponse({ status: 404, description: 'Sync job not found' })
  async updateProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('processed') processed: number,
    @Body('successful') successful: number,
    @Body('failed') failed: number,
  ): Promise<SyncJob> {
    return this.syncJobService.updateProgress(id, processed, successful, failed);
  }
}
