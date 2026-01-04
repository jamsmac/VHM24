/**
 * AI Assistant Controller
 *
 * REST API for AI-powered integration and documentation generation.
 *
 * @module AiAssistantModule
 */

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
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AiAssistantService } from './services/ai-assistant.service';
import {
  AnalyzeApiDto,
  GenerateDocumentationDto,
  GenerateModuleDto,
  AiChatDto,
  ReviewProposalDto,
  FixCodeDto,
  ListProposalsQueryDto,
  IntegrationProposalResponseDto,
  AiChatResponseDto,
  AnalysisResultDto,
  DocumentationResultDto,
} from './dto/ai-assistant.dto';
import {
  IntegrationProposalStatus,
  IntegrationProposalType,
} from './entities/integration-proposal.entity';

@ApiTags('AI Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  // ============================================================================
  // API Analysis & Integration
  // ============================================================================

  @Post('analyze-api')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Analyze external API',
    description: 'Analyze external API documentation and generate integration proposal',
  })
  @ApiResponse({ status: 201, description: 'Analysis complete', type: IntegrationProposalResponseDto })
  async analyzeApi(
    @Body() dto: AnalyzeApiDto,
    @CurrentUser() user: User,
  ): Promise<IntegrationProposalResponseDto> {
    const proposal = await this.aiAssistantService.analyzeApi(dto, user.id);
    return {
      id: proposal.id,
      title: proposal.title,
      description: proposal.description,
      type: proposal.type,
      status: proposal.status,
      source_url: proposal.source_url || undefined,
      discovered_endpoints: proposal.discovered_endpoints,
      proposed_files: proposal.proposed_files,
      generated_documentation: proposal.generated_documentation || undefined,
      ai_reasoning: proposal.ai_reasoning || undefined,
      confidence_score: proposal.confidence_score || undefined,
      created_at: proposal.created_at,
    };
  }

  // ============================================================================
  // Documentation Generation
  // ============================================================================

  @Post('generate-docs')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Generate documentation',
    description: 'Generate documentation for existing code',
  })
  @ApiResponse({ status: 201, type: IntegrationProposalResponseDto })
  async generateDocumentation(
    @Body() dto: GenerateDocumentationDto,
    @CurrentUser() user: User,
  ): Promise<IntegrationProposalResponseDto> {
    const proposal = await this.aiAssistantService.generateDocumentation(dto, user.id);
    return this.toResponseDto(proposal);
  }

  // ============================================================================
  // Module Generation
  // ============================================================================

  @Post('generate-module')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Generate new module',
    description: 'Generate complete NestJS module with entity, service, controller',
  })
  @ApiResponse({ status: 201, type: IntegrationProposalResponseDto })
  async generateModule(
    @Body() dto: GenerateModuleDto,
    @CurrentUser() user: User,
  ): Promise<IntegrationProposalResponseDto> {
    const proposal = await this.aiAssistantService.generateModule(dto, user.id);
    return this.toResponseDto(proposal);
  }

  // ============================================================================
  // Code Fixes
  // ============================================================================

  @Post('fix-code')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Fix code issue',
    description: 'Analyze and fix code issues using AI',
  })
  @ApiResponse({ status: 201, type: IntegrationProposalResponseDto })
  async fixCode(
    @Body() dto: FixCodeDto,
    @CurrentUser() user: User,
  ): Promise<IntegrationProposalResponseDto> {
    const proposal = await this.aiAssistantService.fixCode(dto, user.id);
    return this.toResponseDto(proposal);
  }

  // ============================================================================
  // Chat Interface
  // ============================================================================

  @Post('chat')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Chat with AI assistant',
    description: 'Interactive chat for code help, questions, and suggestions',
  })
  @ApiResponse({ status: 201, type: AiChatResponseDto })
  async chat(
    @Body() dto: AiChatDto,
    @CurrentUser() user: User,
  ): Promise<AiChatResponseDto> {
    return this.aiAssistantService.chat(dto, user.id);
  }

  // ============================================================================
  // Proposal Management
  // ============================================================================

  @Get('proposals')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List all proposals' })
  @ApiQuery({ name: 'status', enum: IntegrationProposalStatus, required: false })
  @ApiQuery({ name: 'type', enum: IntegrationProposalType, required: false })
  @ApiResponse({ status: 200, type: [IntegrationProposalResponseDto] })
  async getProposals(
    @Query() query: ListProposalsQueryDto,
  ): Promise<IntegrationProposalResponseDto[]> {
    const proposals = await this.aiAssistantService.getProposals(query);
    return proposals.map((p) => this.toResponseDto(p));
  }

  @Get('proposals/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get proposal by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: IntegrationProposalResponseDto })
  async getProposal(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IntegrationProposalResponseDto> {
    const proposal = await this.aiAssistantService.getProposal(id);
    return this.toResponseDto(proposal);
  }

  @Patch('proposals/:id/review')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Review proposal',
    description: 'Approve or reject a proposal. Approved proposals are implemented automatically.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: IntegrationProposalResponseDto })
  async reviewProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewProposalDto,
    @CurrentUser() user: User,
  ): Promise<IntegrationProposalResponseDto> {
    const proposal = await this.aiAssistantService.reviewProposal(id, dto, user.id);
    return this.toResponseDto(proposal);
  }

  @Delete('proposals/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete proposal' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204 })
  async deleteProposal(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.aiAssistantService.deleteProposal(id);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private toResponseDto(proposal: {
    id: string;
    title: string;
    description: string;
    type: IntegrationProposalType;
    status: IntegrationProposalStatus;
    source_url?: string | null;
    discovered_endpoints: unknown[];
    proposed_files: unknown[];
    generated_documentation?: string | null;
    ai_reasoning?: string | null;
    confidence_score?: number | null;
    created_at: Date;
    approved_at?: Date | null;
    implemented_at?: Date | null;
  }): IntegrationProposalResponseDto {
    return {
      id: proposal.id,
      title: proposal.title,
      description: proposal.description,
      type: proposal.type,
      status: proposal.status,
      source_url: proposal.source_url || undefined,
      discovered_endpoints: proposal.discovered_endpoints as IntegrationProposalResponseDto['discovered_endpoints'],
      proposed_files: proposal.proposed_files as IntegrationProposalResponseDto['proposed_files'],
      generated_documentation: proposal.generated_documentation || undefined,
      ai_reasoning: proposal.ai_reasoning || undefined,
      confidence_score: proposal.confidence_score || undefined,
      created_at: proposal.created_at,
      approved_at: proposal.approved_at || undefined,
      implemented_at: proposal.implemented_at || undefined,
    };
  }
}
