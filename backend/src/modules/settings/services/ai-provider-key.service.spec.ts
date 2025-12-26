import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { AiProviderKeyService } from './ai-provider-key.service';
import {
  AiProviderKey,
  AiProvider,
  AiProviderKeyStatus,
} from '../entities/ai-provider-key.entity';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AiProviderKeyService', () => {
  let service: AiProviderKeyService;
  let repository: jest.Mocked<Repository<AiProviderKey>>;

  const mockAiProviderKey: Partial<AiProviderKey> = {
    id: 'key-123',
    provider: AiProvider.OPENAI,
    name: 'Test OpenAI Key',
    api_key: 'sk-test-key-12345678',
    api_endpoint: null,
    model_preference: 'gpt-4',
    status: AiProviderKeyStatus.ACTIVE,
    is_default: true,
    last_used_at: null,
    last_error: null,
    usage_count: 0,
    rate_limit: null,
    metadata: {},
    description: 'Test key',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    deleted_at: null,
  };

  beforeEach(async () => {
    mockFetch.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiProviderKeyService,
        {
          provide: getRepositoryToken(AiProviderKey),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            softRemove: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiProviderKeyService>(AiProviderKeyService);
    repository = module.get(getRepositoryToken(AiProviderKey));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new AI provider key', async () => {
      const createDto = {
        provider: AiProvider.OPENAI,
        name: 'New Key',
        api_key: 'sk-new-key',
        is_default: false,
      };

      repository.create.mockReturnValue(mockAiProviderKey as AiProviderKey);
      repository.save.mockResolvedValue(mockAiProviderKey as AiProviderKey);

      const result = await service.create(createDto, 'user-123');

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        created_by_id: 'user-123',
        updated_by_id: 'user-123',
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result.id).toBe('key-123');
      expect(result.api_key_masked).toBe('****...5678');
    });

    it('should unset other defaults when creating a default key', async () => {
      const createDto = {
        provider: AiProvider.OPENAI,
        name: 'New Default Key',
        api_key: 'sk-default-key',
        is_default: true,
      };

      repository.update.mockResolvedValue({ affected: 1 } as any);
      repository.create.mockReturnValue(mockAiProviderKey as AiProviderKey);
      repository.save.mockResolvedValue(mockAiProviderKey as AiProviderKey);

      await service.create(createDto);

      expect(repository.update).toHaveBeenCalledWith(
        { provider: AiProvider.OPENAI, is_default: true, deleted_at: IsNull() },
        { is_default: false },
      );
    });

    it('should create key without user ID', async () => {
      const createDto = {
        provider: AiProvider.ANTHROPIC,
        name: 'Anonymous Key',
        api_key: 'sk-anon',
      };

      repository.create.mockReturnValue(mockAiProviderKey as AiProviderKey);
      repository.save.mockResolvedValue(mockAiProviderKey as AiProviderKey);

      await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        created_by_id: undefined,
        updated_by_id: undefined,
      });
    });
  });

  describe('findAll', () => {
    it('should return all keys without filters', async () => {
      repository.find.mockResolvedValue([mockAiProviderKey as AiProviderKey]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        where: { deleted_at: IsNull() },
        order: { provider: 'ASC', is_default: 'DESC', name: 'ASC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('key-123');
    });

    it('should filter by provider', async () => {
      repository.find.mockResolvedValue([mockAiProviderKey as AiProviderKey]);

      await service.findAll({ provider: AiProvider.OPENAI });

      expect(repository.find).toHaveBeenCalledWith({
        where: { deleted_at: IsNull(), provider: AiProvider.OPENAI },
        order: { provider: 'ASC', is_default: 'DESC', name: 'ASC' },
      });
    });

    it('should filter by status', async () => {
      repository.find.mockResolvedValue([]);

      await service.findAll({ status: AiProviderKeyStatus.ACTIVE });

      expect(repository.find).toHaveBeenCalledWith({
        where: { deleted_at: IsNull(), status: AiProviderKeyStatus.ACTIVE },
        order: { provider: 'ASC', is_default: 'DESC', name: 'ASC' },
      });
    });

    it('should filter by is_default', async () => {
      repository.find.mockResolvedValue([]);

      await service.findAll({ is_default: true });

      expect(repository.find).toHaveBeenCalledWith({
        where: { deleted_at: IsNull(), is_default: true },
        order: { provider: 'ASC', is_default: 'DESC', name: 'ASC' },
      });
    });

    it('should filter by multiple criteria', async () => {
      repository.find.mockResolvedValue([]);

      await service.findAll({
        provider: AiProvider.ANTHROPIC,
        status: AiProviderKeyStatus.ACTIVE,
        is_default: false,
      });

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          deleted_at: IsNull(),
          provider: AiProvider.ANTHROPIC,
          status: AiProviderKeyStatus.ACTIVE,
          is_default: false,
        },
        order: { provider: 'ASC', is_default: 'DESC', name: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single key by ID', async () => {
      repository.findOne.mockResolvedValue(mockAiProviderKey as AiProviderKey);

      const result = await service.findOne('key-123');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'key-123', deleted_at: IsNull() },
      });
      expect(result.id).toBe('key-123');
    });

    it('should throw NotFoundException when key not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an existing key', async () => {
      const updateDto = { name: 'Updated Key Name' };
      repository.findOne.mockResolvedValue(mockAiProviderKey as AiProviderKey);
      repository.save.mockResolvedValue({
        ...mockAiProviderKey,
        name: 'Updated Key Name',
      } as AiProviderKey);

      const result = await service.update('key-123', updateDto, 'user-456');

      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Key Name');
    });

    it('should unset other defaults when updating to default', async () => {
      const updateDto = { is_default: true };
      const nonDefaultKey = { ...mockAiProviderKey, is_default: false };
      repository.findOne.mockResolvedValue(nonDefaultKey as AiProviderKey);
      repository.update.mockResolvedValue({ affected: 1 } as any);
      repository.save.mockResolvedValue({
        ...nonDefaultKey,
        is_default: true,
      } as AiProviderKey);

      await service.update('key-123', updateDto);

      expect(repository.update).toHaveBeenCalledWith(
        { provider: AiProvider.OPENAI, is_default: true, deleted_at: IsNull() },
        { is_default: false },
      );
    });

    it('should not unset defaults when already default', async () => {
      const updateDto = { is_default: true };
      repository.findOne.mockResolvedValue(mockAiProviderKey as AiProviderKey);
      repository.save.mockResolvedValue(mockAiProviderKey as AiProviderKey);

      await service.update('key-123', updateDto);

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when key not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a key', async () => {
      repository.findOne.mockResolvedValue(mockAiProviderKey as AiProviderKey);
      repository.softRemove.mockResolvedValue(mockAiProviderKey as AiProviderKey);

      await service.remove('key-123');

      expect(repository.softRemove).toHaveBeenCalledWith(mockAiProviderKey);
    });

    it('should throw NotFoundException when key not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getActiveKey', () => {
    it('should return default active key', async () => {
      repository.findOne.mockResolvedValue(mockAiProviderKey as AiProviderKey);
      repository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.getActiveKey(AiProvider.OPENAI);

      expect(result).toBe('sk-test-key-12345678');
      expect(repository.update).toHaveBeenCalledWith('key-123', {
        last_used_at: expect.any(Date),
        usage_count: expect.any(Function),
      });
    });

    it('should return any active key when no default', async () => {
      repository.findOne
        .mockResolvedValueOnce(null) // No default
        .mockResolvedValueOnce(mockAiProviderKey as AiProviderKey); // Any active
      repository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.getActiveKey(AiProvider.OPENAI);

      expect(result).toBe('sk-test-key-12345678');
    });

    it('should return env fallback when no database keys', async () => {
      repository.findOne.mockResolvedValue(null);
      process.env.OPENAI_API_KEY = 'sk-env-key';

      const result = await service.getActiveKey(AiProvider.OPENAI);

      expect(result).toBe('sk-env-key');

      delete process.env.OPENAI_API_KEY;
    });

    it('should return null when no key available', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.getActiveKey(AiProvider.OPENAI);

      expect(result).toBeNull();
    });

    it('should handle Anthropic env fallback', async () => {
      repository.findOne.mockResolvedValue(null);
      process.env.ANTHROPIC_API_KEY = 'sk-anthropic';

      const result = await service.getActiveKey(AiProvider.ANTHROPIC);

      expect(result).toBe('sk-anthropic');

      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should handle Claude API key env fallback', async () => {
      repository.findOne.mockResolvedValue(null);
      process.env.CLAUDE_API_KEY = 'sk-claude';

      const result = await service.getActiveKey(AiProvider.ANTHROPIC);

      expect(result).toBe('sk-claude');

      delete process.env.CLAUDE_API_KEY;
    });

    it('should handle Perplexity env fallback', async () => {
      repository.findOne.mockResolvedValue(null);
      process.env.PERPLEXITY_API_KEY = 'sk-perplexity';

      const result = await service.getActiveKey(AiProvider.PERPLEXITY);

      expect(result).toBe('sk-perplexity');

      delete process.env.PERPLEXITY_API_KEY;
    });

    it('should handle Google env fallback', async () => {
      repository.findOne.mockResolvedValue(null);
      process.env.GOOGLE_AI_API_KEY = 'google-key';

      const result = await service.getActiveKey(AiProvider.GOOGLE);

      expect(result).toBe('google-key');

      delete process.env.GOOGLE_AI_API_KEY;
    });

    it('should handle Gemini API key env fallback', async () => {
      repository.findOne.mockResolvedValue(null);
      process.env.GEMINI_API_KEY = 'gemini-key';

      const result = await service.getActiveKey(AiProvider.GOOGLE);

      expect(result).toBe('gemini-key');

      delete process.env.GEMINI_API_KEY;
    });

    it('should handle Mistral env fallback', async () => {
      repository.findOne.mockResolvedValue(null);
      process.env.MISTRAL_API_KEY = 'mistral-key';

      const result = await service.getActiveKey(AiProvider.MISTRAL);

      expect(result).toBe('mistral-key');

      delete process.env.MISTRAL_API_KEY;
    });

    it('should return null for custom provider without env', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.getActiveKey(AiProvider.CUSTOM);

      expect(result).toBeNull();
    });
  });

  describe('getActiveEndpoint', () => {
    it('should return endpoint from database', async () => {
      repository.findOne.mockResolvedValue({
        ...mockAiProviderKey,
        api_endpoint: 'https://custom.api.com/v1',
      } as AiProviderKey);

      const result = await service.getActiveEndpoint(AiProvider.OPENAI);

      expect(result).toBe('https://custom.api.com/v1');
    });

    it('should return default endpoint when no custom endpoint', async () => {
      repository.findOne.mockResolvedValue(mockAiProviderKey as AiProviderKey);

      const result = await service.getActiveEndpoint(AiProvider.OPENAI);

      expect(result).toBe('https://api.openai.com/v1');
    });

    it('should return default endpoint when no key found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.getActiveEndpoint(AiProvider.ANTHROPIC);

      expect(result).toBe('https://api.anthropic.com/v1');
    });

    it('should return default endpoint for Perplexity', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.getActiveEndpoint(AiProvider.PERPLEXITY);

      expect(result).toBe('https://api.perplexity.ai');
    });

    it('should return default endpoint for Google', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.getActiveEndpoint(AiProvider.GOOGLE);

      expect(result).toBe('https://generativelanguage.googleapis.com/v1');
    });

    it('should return default endpoint for Mistral', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.getActiveEndpoint(AiProvider.MISTRAL);

      expect(result).toBe('https://api.mistral.ai/v1');
    });

    it('should return null for custom provider without endpoint', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.getActiveEndpoint(AiProvider.CUSTOM);

      expect(result).toBeNull();
    });
  });

  describe('testKey', () => {
    describe('OpenAI', () => {
      it('should test OpenAI key successfully', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            data: [{ id: 'gpt-4' }, { id: 'gpt-3.5-turbo' }],
          }),
        });

        const result = await service.testKey(AiProvider.OPENAI, 'sk-test-key');

        expect(result.success).toBe(true);
        expect(result.message).toBe('OpenAI API key is valid');
        expect(result.available_models).toContain('gpt-4');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.openai.com/v1/models',
          { headers: { Authorization: 'Bearer sk-test-key' } },
        );
      });

      it('should test OpenAI key with custom endpoint', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: [] }),
        });

        await service.testKey(
          AiProvider.OPENAI,
          'sk-test-key',
          'https://custom.api.com/v1',
        );

        expect(mockFetch).toHaveBeenCalledWith(
          'https://custom.api.com/v1/models',
          expect.any(Object),
        );
      });

      it('should handle OpenAI key failure', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          text: jest.fn().mockResolvedValue('Invalid API key'),
        });

        const result = await service.testKey(AiProvider.OPENAI, 'invalid-key');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid API key');
      });
    });

    describe('Anthropic', () => {
      it('should test Anthropic key successfully', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
        });

        const result = await service.testKey(AiProvider.ANTHROPIC, 'sk-ant-key');

        expect(result.success).toBe(true);
        expect(result.message).toBe('Anthropic API key is valid');
        expect(result.available_models).toContain('claude-3-opus');
      });

      it('should accept rate limit as valid key', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 429,
        });

        const result = await service.testKey(AiProvider.ANTHROPIC, 'sk-ant-key');

        expect(result.success).toBe(true);
      });

      it('should handle Anthropic key failure', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          text: jest.fn().mockResolvedValue('Unauthorized'),
        });

        const result = await service.testKey(AiProvider.ANTHROPIC, 'invalid-key');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('Perplexity', () => {
      it('should test Perplexity key successfully', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
        });

        const result = await service.testKey(AiProvider.PERPLEXITY, 'sk-perp-key');

        expect(result.success).toBe(true);
        expect(result.message).toBe('Perplexity API key is valid');
      });

      it('should accept rate limit as valid key', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 429,
        });

        const result = await service.testKey(AiProvider.PERPLEXITY, 'sk-perp-key');

        expect(result.success).toBe(true);
      });

      it('should handle Perplexity key failure', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          text: jest.fn().mockResolvedValue('Invalid key'),
        });

        const result = await service.testKey(AiProvider.PERPLEXITY, 'invalid-key');

        expect(result.success).toBe(false);
      });
    });

    describe('Generic/Custom', () => {
      it('should test generic key with endpoint', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
        });

        const result = await service.testKey(
          AiProvider.CUSTOM,
          'custom-key',
          'https://custom.api.com',
        );

        expect(result.success).toBe(true);
        expect(result.message).toBe('Endpoint is accessible');
      });

      it('should fail without endpoint for custom provider', async () => {
        const result = await service.testKey(AiProvider.CUSTOM, 'custom-key');

        expect(result.success).toBe(false);
        expect(result.error).toBe('No endpoint provided');
      });

      it('should handle generic endpoint failure', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
        });

        const result = await service.testKey(
          AiProvider.CUSTOM,
          'custom-key',
          'https://custom.api.com',
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('HTTP 500');
      });

      it('should handle network error for generic endpoint', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const result = await service.testKey(
          AiProvider.CUSTOM,
          'custom-key',
          'https://custom.api.com',
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Network error');
      });

      it('should handle unknown error for generic endpoint', async () => {
        mockFetch.mockRejectedValue('Unknown');

        const result = await service.testKey(
          AiProvider.CUSTOM,
          'custom-key',
          'https://custom.api.com',
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown error');
      });
    });

    it('should handle general exception', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.testKey(AiProvider.OPENAI, 'sk-test');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection test failed');
      expect(result.error).toBe('Network error');
    });

    it('should handle unknown exception', async () => {
      mockFetch.mockRejectedValue('Unknown error type');

      const result = await service.testKey(AiProvider.OPENAI, 'sk-test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('testKeyById', () => {
    it('should test key by ID', async () => {
      repository.findOne.mockResolvedValue(mockAiProviderKey as AiProviderKey);
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: [] }),
      });

      const result = await service.testKeyById('key-123');

      expect(result.success).toBe(true);
    });

    it('should test key with custom endpoint', async () => {
      repository.findOne.mockResolvedValue({
        ...mockAiProviderKey,
        api_endpoint: 'https://custom.openai.com/v1',
      } as AiProviderKey);
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: [] }),
      });

      await service.testKeyById('key-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.openai.com/v1/models',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when key not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.testKeyById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markKeyError', () => {
    it('should mark key with error status', async () => {
      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.markKeyError('key-123', 'API rate limit exceeded');

      expect(repository.update).toHaveBeenCalledWith('key-123', {
        status: AiProviderKeyStatus.ERROR,
        last_error: 'API rate limit exceeded',
      });
    });

    it('should truncate long error messages', async () => {
      const longError = 'a'.repeat(600);
      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.markKeyError('key-123', longError);

      expect(repository.update).toHaveBeenCalledWith('key-123', {
        status: AiProviderKeyStatus.ERROR,
        last_error: 'a'.repeat(500),
      });
    });
  });

  describe('getProvidersStatus', () => {
    it('should return status for all providers', async () => {
      repository.count.mockResolvedValue(2);

      const result = await service.getProvidersStatus();

      expect(result).toHaveLength(6); // Number of providers in enum
      expect(result[0]).toEqual({
        provider: expect.any(String),
        has_key: true,
        has_env_fallback: expect.any(Boolean),
        active_keys_count: 2,
      });
    });

    it('should detect providers without keys', async () => {
      repository.count.mockResolvedValue(0);

      const result = await service.getProvidersStatus();

      expect(result.every((p) => p.has_key === false)).toBe(true);
      expect(result.every((p) => p.active_keys_count === 0)).toBe(true);
    });

    it('should detect env fallbacks', async () => {
      repository.count.mockResolvedValue(0);
      process.env.OPENAI_API_KEY = 'sk-env';

      const result = await service.getProvidersStatus();

      const openai = result.find((p) => p.provider === AiProvider.OPENAI);
      expect(openai?.has_env_fallback).toBe(true);

      delete process.env.OPENAI_API_KEY;
    });
  });

  describe('toResponseDto (private)', () => {
    it('should mask API key in response', async () => {
      repository.findOne.mockResolvedValue(mockAiProviderKey as AiProviderKey);

      const result = await service.findOne('key-123');

      expect(result.api_key_masked).toBe('****...5678');
      expect(result).not.toHaveProperty('api_key');
    });

    it('should mask short API keys', async () => {
      repository.findOne.mockResolvedValue({
        ...mockAiProviderKey,
        api_key: 'short',
      } as AiProviderKey);

      const result = await service.findOne('key-123');

      expect(result.api_key_masked).toBe('****');
    });

    it('should handle empty API key', async () => {
      repository.findOne.mockResolvedValue({
        ...mockAiProviderKey,
        api_key: '',
      } as AiProviderKey);

      const result = await service.findOne('key-123');

      expect(result.api_key_masked).toBe('****');
    });

    it('should include all expected fields', async () => {
      repository.findOne.mockResolvedValue(mockAiProviderKey as AiProviderKey);

      const result = await service.findOne('key-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('api_key_masked');
      expect(result).toHaveProperty('api_endpoint');
      expect(result).toHaveProperty('model_preference');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('is_default');
      expect(result).toHaveProperty('last_used_at');
      expect(result).toHaveProperty('last_error');
      expect(result).toHaveProperty('usage_count');
      expect(result).toHaveProperty('rate_limit');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('created_at');
      expect(result).toHaveProperty('updated_at');
    });
  });
});
