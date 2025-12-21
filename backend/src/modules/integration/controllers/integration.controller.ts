import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
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
import { IntegrationService } from '../services/integration.service';
import { IntegrationType, Integration } from '../entities/integration.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Integrations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get()
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Get all integrations' })
  @ApiQuery({ name: 'type', required: false, enum: IntegrationType })
  @ApiResponse({ status: 200, description: 'List of integrations', type: [Integration] })
  async findAll(@Query('type') type?: IntegrationType): Promise<Integration[]> {
    return this.integrationService.findAll(type);
  }

  @Get('active')
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Get active integrations' })
  @ApiResponse({ status: 200, description: 'List of active integrations', type: [Integration] })
  async getActive(): Promise<Integration[]> {
    return this.integrationService.getActive();
  }

  @Get('due-for-sync')
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Get integrations due for sync' })
  @ApiResponse({
    status: 200,
    description: 'List of integrations due for sync',
    type: [Integration],
  })
  async getDueForSync(): Promise<Integration[]> {
    return this.integrationService.getDueForSync();
  }

  @Get(':id')
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Get integration by ID' })
  @ApiParam({ name: 'id', description: 'Integration UUID' })
  @ApiResponse({ status: 200, description: 'Integration details', type: Integration })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Integration> {
    return this.integrationService.findOne(id);
  }

  @Get('code/:code')
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Get integration by code' })
  @ApiParam({ name: 'code', description: 'Integration code' })
  @ApiResponse({ status: 200, description: 'Integration details', type: Integration })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async findByCode(@Param('code') code: string): Promise<Integration> {
    return this.integrationService.findByCode(code);
  }

  @Patch(':id/activate')
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Activate integration' })
  @ApiParam({ name: 'id', description: 'Integration UUID' })
  @ApiResponse({ status: 200, description: 'Integration activated', type: Integration })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async activate(@Param('id', ParseUUIDPipe) id: string): Promise<Integration> {
    return this.integrationService.activate(id);
  }

  @Patch(':id/deactivate')
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Deactivate integration' })
  @ApiParam({ name: 'id', description: 'Integration UUID' })
  @ApiResponse({ status: 200, description: 'Integration deactivated', type: Integration })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<Integration> {
    return this.integrationService.deactivate(id);
  }

  @Post(':id/sync')
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Trigger sync for integration' })
  @ApiParam({ name: 'id', description: 'Integration UUID' })
  @ApiResponse({ status: 200, description: 'Sync triggered', type: Integration })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async updateLastSync(@Param('id', ParseUUIDPipe) id: string): Promise<Integration> {
    return this.integrationService.updateLastSync(id);
  }
}
