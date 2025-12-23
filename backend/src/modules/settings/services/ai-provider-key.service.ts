import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AiProviderKey, AiProvider, AiProviderKeyStatus } from '../entities/ai-provider-key.entity';
import {
  CreateAiProviderKeyDto,
  UpdateAiProviderKeyDto,
  AiProviderKeyResponseDto,
  TestAiProviderKeyResultDto,
  ListAiProviderKeysQueryDto,
} from '../dto/ai-provider-key.dto';

/**
 * Service for managing AI provider API keys
 *
 * Provides CRUD operations for AI provider keys with encryption,
 * key validation, usage tracking, and fallback to environment variables.
 */
@Injectable()
export class AiProviderKeyService {
  private readonly logger = new Logger(AiProviderKeyService.name);

  constructor(
    @InjectRepository(AiProviderKey)
    private readonly aiProviderKeyRepository: Repository<AiProviderKey>,
  ) {}

  /**
   * Create a new AI provider key
   */
  async create(dto: CreateAiProviderKeyDto, userId?: string): Promise<AiProviderKeyResponseDto> {
    // If setting as default, unset other defaults for this provider
    if (dto.is_default) {
      await this.unsetDefaultForProvider(dto.provider);
    }

    const entity = this.aiProviderKeyRepository.create({
      ...dto,
      created_by_id: userId,
      updated_by_id: userId,
    });

    const saved = await this.aiProviderKeyRepository.save(entity);
    this.logger.log(`Created AI provider key: ${saved.id} for ${saved.provider}`);

    return this.toResponseDto(saved);
  }

  /**
   * Get all AI provider keys with optional filters
   */
  async findAll(query: ListAiProviderKeysQueryDto = {}): Promise<AiProviderKeyResponseDto[]> {
    const where: Record<string, unknown> = { deleted_at: IsNull() };

    if (query.provider) {
      where.provider = query.provider;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.is_default !== undefined) {
      where.is_default = query.is_default;
    }

    const keys = await this.aiProviderKeyRepository.find({
      where,
      order: { provider: 'ASC', is_default: 'DESC', name: 'ASC' },
    });

    return keys.map((key) => this.toResponseDto(key));
  }

  /**
   * Get a single AI provider key by ID
   */
  async findOne(id: string): Promise<AiProviderKeyResponseDto> {
    const key = await this.findEntityById(id);
    return this.toResponseDto(key);
  }

  /**
   * Update an AI provider key
   */
  async update(id: string, dto: UpdateAiProviderKeyDto, userId?: string): Promise<AiProviderKeyResponseDto> {
    const key = await this.findEntityById(id);

    // If setting as default, unset other defaults for this provider
    if (dto.is_default && !key.is_default) {
      await this.unsetDefaultForProvider(key.provider);
    }

    Object.assign(key, dto, { updated_by_id: userId });
    const saved = await this.aiProviderKeyRepository.save(key);

    this.logger.log(`Updated AI provider key: ${saved.id}`);
    return this.toResponseDto(saved);
  }

  /**
   * Delete an AI provider key (soft delete)
   */
  async remove(id: string): Promise<void> {
    const key = await this.findEntityById(id);
    await this.aiProviderKeyRepository.softRemove(key);
    this.logger.log(`Deleted AI provider key: ${id}`);
  }

  /**
   * Get the active API key for a provider
   *
   * Priority:
   * 1. Default key from database (if active)
   * 2. Any active key from database
   * 3. Environment variable fallback
   */
  async getActiveKey(provider: AiProvider): Promise<string | null> {
    // Try to get default key first
    const defaultKey = await this.aiProviderKeyRepository.findOne({
      where: {
        provider,
        is_default: true,
        status: AiProviderKeyStatus.ACTIVE,
        deleted_at: IsNull(),
      },
    });

    if (defaultKey) {
      await this.recordUsage(defaultKey.id);
      return defaultKey.api_key;
    }

    // Try any active key
    const anyKey = await this.aiProviderKeyRepository.findOne({
      where: {
        provider,
        status: AiProviderKeyStatus.ACTIVE,
        deleted_at: IsNull(),
      },
      order: { usage_count: 'DESC' },
    });

    if (anyKey) {
      await this.recordUsage(anyKey.id);
      return anyKey.api_key;
    }

    // Fallback to environment variable
    return this.getEnvKeyForProvider(provider);
  }

  /**
   * Get the active endpoint for a provider (for custom providers)
   */
  async getActiveEndpoint(provider: AiProvider): Promise<string | null> {
    const key = await this.aiProviderKeyRepository.findOne({
      where: {
        provider,
        status: AiProviderKeyStatus.ACTIVE,
        deleted_at: IsNull(),
      },
      order: { is_default: 'DESC' },
    });

    return key?.api_endpoint || this.getDefaultEndpointForProvider(provider);
  }

  /**
   * Test an API key connection
   */
  async testKey(provider: AiProvider, apiKey: string, endpoint?: string): Promise<TestAiProviderKeyResultDto> {
    const startTime = Date.now();

    try {
      switch (provider) {
        case AiProvider.OPENAI:
          return await this.testOpenAiKey(apiKey, endpoint);
        case AiProvider.ANTHROPIC:
          return await this.testAnthropicKey(apiKey, endpoint);
        case AiProvider.PERPLEXITY:
          return await this.testPerplexityKey(apiKey, endpoint);
        default:
          return await this.testGenericKey(apiKey, endpoint);
      }
    } catch (error) {
      return {
        success: false,
        message: 'Connection test failed',
        response_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test an existing key by ID
   */
  async testKeyById(id: string): Promise<TestAiProviderKeyResultDto> {
    const key = await this.findEntityById(id);
    return this.testKey(key.provider, key.api_key, key.api_endpoint || undefined);
  }

  /**
   * Mark a key as having an error
   */
  async markKeyError(id: string, errorMessage: string): Promise<void> {
    await this.aiProviderKeyRepository.update(id, {
      status: AiProviderKeyStatus.ERROR,
      last_error: errorMessage.substring(0, 500),
    });
  }

  /**
   * Get available providers with their configuration status
   */
  async getProvidersStatus(): Promise<
    Array<{
      provider: AiProvider;
      has_key: boolean;
      has_env_fallback: boolean;
      active_keys_count: number;
    }>
  > {
    const providers = Object.values(AiProvider);
    const result = [];

    for (const provider of providers) {
      const keys = await this.aiProviderKeyRepository.count({
        where: {
          provider,
          status: AiProviderKeyStatus.ACTIVE,
          deleted_at: IsNull(),
        },
      });

      result.push({
        provider,
        has_key: keys > 0,
        has_env_fallback: !!this.getEnvKeyForProvider(provider),
        active_keys_count: keys,
      });
    }

    return result;
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  private async findEntityById(id: string): Promise<AiProviderKey> {
    const key = await this.aiProviderKeyRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });

    if (!key) {
      throw new NotFoundException(`AI provider key with ID ${id} not found`);
    }

    return key;
  }

  private async unsetDefaultForProvider(provider: AiProvider): Promise<void> {
    await this.aiProviderKeyRepository.update(
      { provider, is_default: true, deleted_at: IsNull() },
      { is_default: false },
    );
  }

  private async recordUsage(id: string): Promise<void> {
    await this.aiProviderKeyRepository.update(id, {
      last_used_at: new Date(),
      usage_count: () => 'usage_count + 1',
    });
  }

  private toResponseDto(entity: AiProviderKey): AiProviderKeyResponseDto {
    return {
      id: entity.id,
      provider: entity.provider,
      name: entity.name,
      api_key_masked: this.maskApiKey(entity.api_key),
      api_endpoint: entity.api_endpoint,
      model_preference: entity.model_preference,
      status: entity.status,
      is_default: entity.is_default,
      last_used_at: entity.last_used_at,
      last_error: entity.last_error,
      usage_count: entity.usage_count,
      rate_limit: entity.rate_limit,
      metadata: entity.metadata,
      description: entity.description,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }

  private maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return '****';
    }
    const lastFour = apiKey.slice(-4);
    return `****...${lastFour}`;
  }

  private getEnvKeyForProvider(provider: AiProvider): string | null {
    switch (provider) {
      case AiProvider.OPENAI:
        return process.env.OPENAI_API_KEY || null;
      case AiProvider.ANTHROPIC:
        return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || null;
      case AiProvider.PERPLEXITY:
        return process.env.PERPLEXITY_API_KEY || null;
      case AiProvider.GOOGLE:
        return process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || null;
      case AiProvider.MISTRAL:
        return process.env.MISTRAL_API_KEY || null;
      default:
        return null;
    }
  }

  private getDefaultEndpointForProvider(provider: AiProvider): string | null {
    switch (provider) {
      case AiProvider.OPENAI:
        return 'https://api.openai.com/v1';
      case AiProvider.ANTHROPIC:
        return 'https://api.anthropic.com/v1';
      case AiProvider.PERPLEXITY:
        return 'https://api.perplexity.ai';
      case AiProvider.GOOGLE:
        return 'https://generativelanguage.googleapis.com/v1';
      case AiProvider.MISTRAL:
        return 'https://api.mistral.ai/v1';
      default:
        return null;
    }
  }

  private async testOpenAiKey(apiKey: string, endpoint?: string): Promise<TestAiProviderKeyResultDto> {
    const startTime = Date.now();
    const baseUrl = endpoint || 'https://api.openai.com/v1';

    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        message: 'API key validation failed',
        response_time_ms: Date.now() - startTime,
        error,
      };
    }

    const data = await response.json();
    const models = data.data?.map((m: { id: string }) => m.id).slice(0, 10) || [];

    return {
      success: true,
      message: 'OpenAI API key is valid',
      response_time_ms: Date.now() - startTime,
      available_models: models,
    };
  }

  private async testAnthropicKey(apiKey: string, endpoint?: string): Promise<TestAiProviderKeyResultDto> {
    const startTime = Date.now();
    const baseUrl = endpoint || 'https://api.anthropic.com/v1';

    // Anthropic doesn't have a /models endpoint, so we make a minimal request
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    // Even a rate limit error means the key format is valid
    if (response.ok || response.status === 429) {
      return {
        success: true,
        message: 'Anthropic API key is valid',
        response_time_ms: Date.now() - startTime,
        available_models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      };
    }

    const error = await response.text();
    return {
      success: false,
      message: 'API key validation failed',
      response_time_ms: Date.now() - startTime,
      error,
    };
  }

  private async testPerplexityKey(apiKey: string, endpoint?: string): Promise<TestAiProviderKeyResultDto> {
    const startTime = Date.now();
    const baseUrl = endpoint || 'https://api.perplexity.ai';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    if (response.ok || response.status === 429) {
      return {
        success: true,
        message: 'Perplexity API key is valid',
        response_time_ms: Date.now() - startTime,
        available_models: ['llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-online'],
      };
    }

    const error = await response.text();
    return {
      success: false,
      message: 'API key validation failed',
      response_time_ms: Date.now() - startTime,
      error,
    };
  }

  private async testGenericKey(apiKey: string, endpoint?: string): Promise<TestAiProviderKeyResultDto> {
    if (!endpoint) {
      return {
        success: false,
        message: 'Custom provider requires an endpoint',
        error: 'No endpoint provided',
      };
    }

    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      return {
        success: response.ok,
        message: response.ok ? 'Endpoint is accessible' : 'Endpoint returned an error',
        response_time_ms: Date.now() - startTime,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to connect to endpoint',
        response_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
