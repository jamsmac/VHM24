import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUrl,
  MaxLength,
  MinLength,
  IsObject,
  Min,
} from 'class-validator';
import { AiProvider, AiProviderKeyStatus } from '../entities/ai-provider-key.entity';

/**
 * DTO for creating a new AI provider key
 */
export class CreateAiProviderKeyDto {
  @ApiProperty({
    description: 'AI provider type',
    enum: AiProvider,
    example: AiProvider.OPENAI,
  })
  @IsEnum(AiProvider)
  provider: AiProvider;

  @ApiProperty({
    description: 'Human-readable name for this key',
    example: 'Production OpenAI Key',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'API key (will be encrypted)',
    example: 'sk-...',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  api_key: string;

  @ApiPropertyOptional({
    description: 'Custom API endpoint (for custom providers)',
    example: 'https://api.custom-llm.com/v1',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  api_endpoint?: string;

  @ApiPropertyOptional({
    description: 'Preferred model for this provider',
    example: 'gpt-4-turbo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model_preference?: string;

  @ApiPropertyOptional({
    description: 'Whether this is the default key for the provider',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({
    description: 'Rate limit (requests per minute)',
    example: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  rate_limit?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { organization_id: 'org-123' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Description or notes',
    example: 'Main production key for voice transcription',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

/**
 * DTO for updating an existing AI provider key
 */
export class UpdateAiProviderKeyDto extends PartialType(CreateAiProviderKeyDto) {
  @ApiPropertyOptional({
    description: 'Key status',
    enum: AiProviderKeyStatus,
  })
  @IsOptional()
  @IsEnum(AiProviderKeyStatus)
  status?: AiProviderKeyStatus;
}

/**
 * DTO for AI provider key response (with masked key)
 */
export class AiProviderKeyResponseDto {
  @ApiProperty({ description: 'Key ID' })
  id: string;

  @ApiProperty({ description: 'AI provider type', enum: AiProvider })
  provider: AiProvider;

  @ApiProperty({ description: 'Key name' })
  name: string;

  @ApiProperty({
    description: 'Masked API key (only last 4 characters visible)',
    example: '****...abc1',
  })
  api_key_masked: string;

  @ApiPropertyOptional({ description: 'Custom API endpoint' })
  api_endpoint: string | null;

  @ApiPropertyOptional({ description: 'Preferred model' })
  model_preference: string | null;

  @ApiProperty({ description: 'Key status', enum: AiProviderKeyStatus })
  status: AiProviderKeyStatus;

  @ApiProperty({ description: 'Whether this is the default key' })
  is_default: boolean;

  @ApiPropertyOptional({ description: 'Last used timestamp' })
  last_used_at: Date | null;

  @ApiPropertyOptional({ description: 'Last error message' })
  last_error: string | null;

  @ApiProperty({ description: 'Usage count' })
  usage_count: number;

  @ApiPropertyOptional({ description: 'Rate limit' })
  rate_limit: number | null;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Description' })
  description: string | null;

  @ApiProperty({ description: 'Created at' })
  created_at: Date;

  @ApiProperty({ description: 'Updated at' })
  updated_at: Date;
}

/**
 * DTO for testing an API key
 */
export class TestAiProviderKeyDto {
  @ApiPropertyOptional({
    description: 'API key to test (if not testing existing key)',
    example: 'sk-...',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  api_key?: string;

  @ApiPropertyOptional({
    description: 'Custom endpoint to test',
    example: 'https://api.openai.com/v1',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  api_endpoint?: string;
}

/**
 * DTO for test result
 */
export class TestAiProviderKeyResultDto {
  @ApiProperty({ description: 'Whether the test was successful' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Response message' })
  message?: string;

  @ApiPropertyOptional({ description: 'Response time in ms' })
  response_time_ms?: number;

  @ApiPropertyOptional({ description: 'Available models (if applicable)' })
  available_models?: string[];

  @ApiPropertyOptional({ description: 'Error details if failed' })
  error?: string;
}

/**
 * Query params for listing AI provider keys
 */
export class ListAiProviderKeysQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by provider',
    enum: AiProvider,
  })
  @IsOptional()
  @IsEnum(AiProvider)
  provider?: AiProvider;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: AiProviderKeyStatus,
  })
  @IsOptional()
  @IsEnum(AiProviderKeyStatus)
  status?: AiProviderKeyStatus;

  @ApiPropertyOptional({
    description: 'Only show default keys',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
