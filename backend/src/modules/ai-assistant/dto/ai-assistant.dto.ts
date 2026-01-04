/**
 * AI Assistant DTOs
 *
 * Data transfer objects for AI Assistant API
 *
 * @module AiAssistantModule
 */

import {
  IsString,
  IsUrl,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IntegrationProposalStatus,
  IntegrationProposalType,
} from '../entities/integration-proposal.entity';

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * Analyze external API documentation
 */
export class AnalyzeApiDto {
  @ApiProperty({
    description: 'URL to API documentation (OpenAPI/Swagger JSON or docs page)',
    example: 'https://api.example.com/openapi.json',
  })
  @IsUrl()
  documentation_url: string;

  @ApiPropertyOptional({
    description: 'API name for reference',
    example: 'Payment Gateway API',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  api_name?: string;

  @ApiPropertyOptional({
    description: 'Additional context or requirements',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  context?: string;
}

/**
 * Generate documentation for existing code
 */
export class GenerateDocumentationDto {
  @ApiProperty({
    description: 'Module or file path to document',
    example: 'src/modules/machines',
  })
  @IsString()
  @MinLength(1)
  target_path: string;

  @ApiPropertyOptional({
    description: 'Documentation format',
    enum: ['markdown', 'openapi', 'typescript-jsdoc'],
    default: 'markdown',
  })
  @IsOptional()
  @IsString()
  format?: 'markdown' | 'openapi' | 'typescript-jsdoc';

  @ApiPropertyOptional({
    description: 'Include examples in documentation',
    default: true,
  })
  @IsOptional()
  include_examples?: boolean;
}

/**
 * Generate new module/feature
 */
export class GenerateModuleDto {
  @ApiProperty({
    description: 'Module name',
    example: 'notifications',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  module_name: string;

  @ApiProperty({
    description: 'Feature description',
    example: 'Push notification system with FCM and WebPush support',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    description: 'Entity fields specification',
  })
  @IsOptional()
  @IsArray()
  entity_fields?: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    description?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Include CRUD endpoints',
    default: true,
  })
  @IsOptional()
  include_crud?: boolean;

  @ApiPropertyOptional({
    description: 'Related modules for integration',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  related_modules?: string[];
}

/**
 * Chat with AI assistant
 */
export class AiChatDto {
  @ApiProperty({
    description: 'User message',
    example: 'How do I add a new field to the Machine entity?',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;

  @ApiPropertyOptional({
    description: 'Conversation ID for context',
  })
  @IsOptional()
  @IsUUID()
  conversation_id?: string;

  @ApiPropertyOptional({
    description: 'Include code context from specific paths',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  context_paths?: string[];
}

/**
 * Approve or reject a proposal
 */
export class ReviewProposalDto {
  @ApiProperty({
    description: 'Decision',
    enum: ['approve', 'reject'],
  })
  @IsEnum(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @ApiPropertyOptional({
    description: 'Reason for rejection or additional notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Selected file indices to implement (if only partial)',
  })
  @IsOptional()
  @IsArray()
  selected_files?: number[];
}

/**
 * Fix code issues
 */
export class FixCodeDto {
  @ApiProperty({
    description: 'File path with the issue',
    example: 'src/modules/tasks/tasks.service.ts',
  })
  @IsString()
  file_path: string;

  @ApiProperty({
    description: 'Description of the issue or error message',
    example: 'TypeScript error: Property "x" does not exist on type "Y"',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  issue_description: string;

  @ApiPropertyOptional({
    description: 'Line numbers with issues (optional)',
  })
  @IsOptional()
  @IsArray()
  line_numbers?: number[];
}

// ============================================================================
// Response DTOs
// ============================================================================

export class ApiEndpointDto {
  @ApiProperty()
  method: string;

  @ApiProperty()
  path: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;

  @ApiPropertyOptional()
  requestBody?: Record<string, unknown>;

  @ApiPropertyOptional()
  response?: Record<string, unknown>;
}

export class ProposedFileDto {
  @ApiProperty()
  path: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ enum: ['create', 'modify', 'delete'] })
  action: 'create' | 'modify' | 'delete';

  @ApiProperty()
  description: string;
}

export class IntegrationProposalResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: IntegrationProposalType })
  type: IntegrationProposalType;

  @ApiProperty({ enum: IntegrationProposalStatus })
  status: IntegrationProposalStatus;

  @ApiPropertyOptional()
  source_url?: string;

  @ApiProperty({ type: [ApiEndpointDto] })
  discovered_endpoints: ApiEndpointDto[];

  @ApiProperty({ type: [ProposedFileDto] })
  proposed_files: ProposedFileDto[];

  @ApiPropertyOptional()
  generated_documentation?: string;

  @ApiPropertyOptional()
  ai_reasoning?: string;

  @ApiPropertyOptional()
  confidence_score?: number;

  @ApiProperty()
  created_at: Date;

  @ApiPropertyOptional()
  approved_at?: Date;

  @ApiPropertyOptional()
  implemented_at?: Date;
}

export class AiChatResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  conversation_id: string;

  @ApiPropertyOptional({
    description: 'Code snippets suggested by AI',
  })
  code_suggestions?: Array<{
    language: string;
    code: string;
    description: string;
  }>;

  @ApiPropertyOptional({
    description: 'Files referenced in the response',
  })
  referenced_files?: string[];

  @ApiPropertyOptional({
    description: 'Proposal ID if AI generated a proposal',
  })
  proposal_id?: string;
}

export class AnalysisResultDto {
  @ApiProperty()
  proposal_id: string;

  @ApiProperty()
  api_name: string;

  @ApiProperty()
  endpoints_count: number;

  @ApiProperty({ type: [ApiEndpointDto] })
  endpoints: ApiEndpointDto[];

  @ApiProperty()
  proposed_files_count: number;

  @ApiProperty()
  confidence_score: number;

  @ApiProperty()
  ai_summary: string;
}

export class DocumentationResultDto {
  @ApiProperty()
  proposal_id: string;

  @ApiProperty()
  format: string;

  @ApiProperty()
  documentation: string;

  @ApiProperty()
  files_documented: number;

  @ApiProperty()
  endpoints_documented: number;
}

// ============================================================================
// List/Filter DTOs
// ============================================================================

export class ListProposalsQueryDto {
  @ApiPropertyOptional({ enum: IntegrationProposalStatus })
  @IsOptional()
  @IsEnum(IntegrationProposalStatus)
  status?: IntegrationProposalStatus;

  @ApiPropertyOptional({ enum: IntegrationProposalType })
  @IsOptional()
  @IsEnum(IntegrationProposalType)
  type?: IntegrationProposalType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  created_by_id?: string;
}
