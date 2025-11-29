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
import { WebhookService } from '../services/webhook.service';
import { CreateWebhookDto } from '../dto/webhook.dto';
import { Webhook } from '../entities/webhook.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Webhooks')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create webhook event' })
  @ApiResponse({ status: 201, description: 'Webhook created', type: Webhook })
  async create(@Body() dto: CreateWebhookDto): Promise<Webhook> {
    return this.webhookService.createWebhook(dto);
  }

  @Get('pending')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get pending webhooks' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limit results (default: 10)',
  })
  @ApiResponse({ status: 200, description: 'List of pending webhooks', type: [Webhook] })
  async getPending(@Query('limit') limit?: number): Promise<Webhook[]> {
    return this.webhookService.getPendingWebhooks(limit ? Number(limit) : 10);
  }

  @Get('integration/:integrationId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get webhooks by integration' })
  @ApiParam({ name: 'integrationId', description: 'Integration UUID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limit results (default: 100)',
  })
  @ApiResponse({ status: 200, description: 'List of webhooks', type: [Webhook] })
  async getByIntegration(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @Query('limit') limit?: number,
  ): Promise<Webhook[]> {
    return this.webhookService.getWebhooksByIntegration(integrationId, limit ? Number(limit) : 100);
  }

  @Get('event-type/:eventType')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get webhooks by event type' })
  @ApiParam({ name: 'eventType', description: 'Event type' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limit results (default: 100)',
  })
  @ApiResponse({ status: 200, description: 'List of webhooks', type: [Webhook] })
  async getByEventType(
    @Param('eventType') eventType: string,
    @Query('limit') limit?: number,
  ): Promise<Webhook[]> {
    return this.webhookService.getWebhooksByEventType(eventType, limit ? Number(limit) : 100);
  }

  @Post(':id/process')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Process webhook' })
  @ApiParam({ name: 'id', description: 'Webhook UUID' })
  @ApiResponse({ status: 200, description: 'Webhook processed', type: Webhook })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async process(@Param('id', ParseUUIDPipe) id: string): Promise<Webhook> {
    return this.webhookService.processWebhook(id);
  }

  @Patch(':id/complete')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Mark webhook as completed' })
  @ApiParam({ name: 'id', description: 'Webhook UUID' })
  @ApiResponse({ status: 200, description: 'Webhook completed', type: Webhook })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async complete(@Param('id', ParseUUIDPipe) id: string): Promise<Webhook> {
    return this.webhookService.completeWebhook(id);
  }

  @Patch(':id/fail')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Mark webhook as failed' })
  @ApiParam({ name: 'id', description: 'Webhook UUID' })
  @ApiResponse({ status: 200, description: 'Webhook marked as failed', type: Webhook })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async fail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('error') error: string,
  ): Promise<Webhook> {
    return this.webhookService.failWebhook(id, error);
  }
}
