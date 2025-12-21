import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';
import { AiProviderKeyService } from '../services/ai-provider-key.service';
import { AiProvider } from '../entities/ai-provider-key.entity';
import {
  CreateAiProviderKeyDto,
  UpdateAiProviderKeyDto,
  AiProviderKeyResponseDto,
  TestAiProviderKeyDto,
  TestAiProviderKeyResultDto,
  ListAiProviderKeysQueryDto,
} from '../dto/ai-provider-key.dto';

@ApiTags('AI Providers')
@Controller('settings/ai-providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AiProviderKeyController {
  constructor(private readonly aiProviderKeyService: AiProviderKeyService) {}

  @Get()
  @Roles('Owner')
  @ApiOperation({ summary: 'Get all AI provider keys' })
  @ApiResponse({
    status: 200,
    description: 'List of AI provider keys (with masked API keys)',
    type: [AiProviderKeyResponseDto],
  })
  async findAll(@Query() query: ListAiProviderKeysQueryDto): Promise<AiProviderKeyResponseDto[]> {
    return this.aiProviderKeyService.findAll(query);
  }

  @Get('providers')
  @Roles('Owner')
  @ApiOperation({ summary: 'Get available providers and their status' })
  @ApiResponse({
    status: 200,
    description: 'List of providers with configuration status',
  })
  async getProvidersStatus() {
    return this.aiProviderKeyService.getProvidersStatus();
  }

  @Get(':id')
  @Roles('Owner')
  @ApiOperation({ summary: 'Get a single AI provider key' })
  @ApiParam({ name: 'id', description: 'Key ID' })
  @ApiResponse({
    status: 200,
    description: 'AI provider key details (with masked API key)',
    type: AiProviderKeyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Key not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AiProviderKeyResponseDto> {
    return this.aiProviderKeyService.findOne(id);
  }

  @Post()
  @Roles('Owner')
  @ApiOperation({ summary: 'Create a new AI provider key' })
  @ApiResponse({
    status: 201,
    description: 'AI provider key created',
    type: AiProviderKeyResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Conflict (e.g., duplicate default)' })
  async create(
    @Body() dto: CreateAiProviderKeyDto,
    @CurrentUser() user: User,
  ): Promise<AiProviderKeyResponseDto> {
    return this.aiProviderKeyService.create(dto, user.id);
  }

  @Put(':id')
  @Roles('Owner')
  @ApiOperation({ summary: 'Update an AI provider key' })
  @ApiParam({ name: 'id', description: 'Key ID' })
  @ApiResponse({
    status: 200,
    description: 'AI provider key updated',
    type: AiProviderKeyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Key not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAiProviderKeyDto,
    @CurrentUser() user: User,
  ): Promise<AiProviderKeyResponseDto> {
    return this.aiProviderKeyService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles('Owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an AI provider key' })
  @ApiParam({ name: 'id', description: 'Key ID' })
  @ApiResponse({ status: 204, description: 'Key deleted' })
  @ApiResponse({ status: 404, description: 'Key not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.aiProviderKeyService.remove(id);
  }

  @Post(':id/test')
  @Roles('Owner')
  @ApiOperation({ summary: 'Test an existing AI provider key' })
  @ApiParam({ name: 'id', description: 'Key ID' })
  @ApiResponse({
    status: 200,
    description: 'Test result',
    type: TestAiProviderKeyResultDto,
  })
  @ApiResponse({ status: 404, description: 'Key not found' })
  async testExistingKey(@Param('id', ParseUUIDPipe) id: string): Promise<TestAiProviderKeyResultDto> {
    return this.aiProviderKeyService.testKeyById(id);
  }

  @Post('test/:provider')
  @Roles('Owner')
  @ApiOperation({ summary: 'Test a new API key before saving' })
  @ApiParam({ name: 'provider', description: 'AI provider type', enum: AiProvider })
  @ApiResponse({
    status: 200,
    description: 'Test result',
    type: TestAiProviderKeyResultDto,
  })
  async testNewKey(
    @Param('provider') provider: AiProvider,
    @Body() dto: TestAiProviderKeyDto,
  ): Promise<TestAiProviderKeyResultDto> {
    if (!dto.api_key) {
      return {
        success: false,
        message: 'API key is required for testing',
        error: 'No API key provided',
      };
    }
    return this.aiProviderKeyService.testKey(provider, dto.api_key, dto.api_endpoint);
  }

  @Post(':id/set-default')
  @Roles('Owner')
  @ApiOperation({ summary: 'Set a key as the default for its provider' })
  @ApiParam({ name: 'id', description: 'Key ID' })
  @ApiResponse({
    status: 200,
    description: 'Key set as default',
    type: AiProviderKeyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Key not found' })
  async setAsDefault(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<AiProviderKeyResponseDto> {
    return this.aiProviderKeyService.update(id, { is_default: true }, user.id);
  }
}
