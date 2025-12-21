import { apiClient } from './axios';

/**
 * AI Provider types
 */
export enum AiProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  PERPLEXITY = 'perplexity',
  GOOGLE = 'google',
  MISTRAL = 'mistral',
  CUSTOM = 'custom',
}

export enum AiProviderKeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

/**
 * AI Provider Key response (with masked API key)
 */
export interface AiProviderKeyResponse {
  id: string;
  provider: AiProvider;
  name: string;
  api_key_masked: string;
  api_endpoint: string | null;
  model_preference: string | null;
  status: AiProviderKeyStatus;
  is_default: boolean;
  last_used_at: string | null;
  last_error: string | null;
  usage_count: number;
  rate_limit: number | null;
  metadata: Record<string, unknown>;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create AI Provider Key request
 */
export interface CreateAiProviderKeyRequest {
  provider: AiProvider;
  name: string;
  api_key: string;
  api_endpoint?: string;
  model_preference?: string;
  is_default?: boolean;
  rate_limit?: number;
  metadata?: Record<string, unknown>;
  description?: string;
}

/**
 * Update AI Provider Key request
 */
export interface UpdateAiProviderKeyRequest {
  provider?: AiProvider;
  name?: string;
  api_key?: string;
  api_endpoint?: string;
  model_preference?: string;
  status?: AiProviderKeyStatus;
  is_default?: boolean;
  rate_limit?: number;
  metadata?: Record<string, unknown>;
  description?: string;
}

/**
 * Test result
 */
export interface TestKeyResult {
  success: boolean;
  message?: string;
  response_time_ms?: number;
  available_models?: string[];
  error?: string;
}

/**
 * Provider status
 */
export interface ProviderStatus {
  provider: AiProvider;
  has_key: boolean;
  has_env_fallback: boolean;
  active_keys_count: number;
}

/**
 * Query params for listing keys
 */
export interface ListKeysParams {
  provider?: AiProvider;
  status?: AiProviderKeyStatus;
  is_default?: boolean;
}

const BASE_URL = '/settings/ai-providers';

/**
 * AI Providers API client
 */
export const aiProvidersApi = {
  /**
   * Get all AI provider keys
   */
  async getAll(params?: ListKeysParams): Promise<AiProviderKeyResponse[]> {
    const response = await apiClient.get<AiProviderKeyResponse[]>(BASE_URL, { params });
    return response.data;
  },

  /**
   * Get providers status
   */
  async getProvidersStatus(): Promise<ProviderStatus[]> {
    const response = await apiClient.get<ProviderStatus[]>(`${BASE_URL}/providers`);
    return response.data;
  },

  /**
   * Get a single key by ID
   */
  async getById(id: string): Promise<AiProviderKeyResponse> {
    const response = await apiClient.get<AiProviderKeyResponse>(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * Create a new AI provider key
   */
  async create(data: CreateAiProviderKeyRequest): Promise<AiProviderKeyResponse> {
    const response = await apiClient.post<AiProviderKeyResponse>(BASE_URL, data);
    return response.data;
  },

  /**
   * Update an AI provider key
   */
  async update(id: string, data: UpdateAiProviderKeyRequest): Promise<AiProviderKeyResponse> {
    const response = await apiClient.put<AiProviderKeyResponse>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  /**
   * Delete an AI provider key
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },

  /**
   * Test an existing key
   */
  async testKey(id: string): Promise<TestKeyResult> {
    const response = await apiClient.post<TestKeyResult>(`${BASE_URL}/${id}/test`);
    return response.data;
  },

  /**
   * Test a new key before saving
   */
  async testNewKey(provider: AiProvider, apiKey: string, endpoint?: string): Promise<TestKeyResult> {
    const response = await apiClient.post<TestKeyResult>(`${BASE_URL}/test/${provider}`, {
      api_key: apiKey,
      api_endpoint: endpoint,
    });
    return response.data;
  },

  /**
   * Set a key as default
   */
  async setDefault(id: string): Promise<AiProviderKeyResponse> {
    const response = await apiClient.post<AiProviderKeyResponse>(`${BASE_URL}/${id}/set-default`);
    return response.data;
  },
};

/**
 * Provider display info
 */
export const PROVIDER_INFO: Record<
  AiProvider,
  { name: string; description: string; icon: string; color: string }
> = {
  [AiProvider.OPENAI]: {
    name: 'OpenAI',
    description: 'GPT-4, Whisper, DALL-E',
    icon: '🤖',
    color: 'bg-green-500',
  },
  [AiProvider.ANTHROPIC]: {
    name: 'Anthropic',
    description: 'Claude 3 Opus, Sonnet, Haiku',
    icon: '🧠',
    color: 'bg-orange-500',
  },
  [AiProvider.PERPLEXITY]: {
    name: 'Perplexity',
    description: 'Sonar, Online Search',
    icon: '🔍',
    color: 'bg-blue-500',
  },
  [AiProvider.GOOGLE]: {
    name: 'Google AI',
    description: 'Gemini Pro, Ultra',
    icon: '🌐',
    color: 'bg-red-500',
  },
  [AiProvider.MISTRAL]: {
    name: 'Mistral',
    description: 'Mistral, Mixtral',
    icon: '💨',
    color: 'bg-purple-500',
  },
  [AiProvider.CUSTOM]: {
    name: 'Custom',
    description: 'Self-hosted or other API',
    icon: '⚙️',
    color: 'bg-gray-500',
  },
};
