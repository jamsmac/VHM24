/**
 * AI Assistant API Client
 *
 * API client for AI-powered integration and documentation features.
 */

import { apiClient } from './axios';

// ============================================================================
// Types
// ============================================================================

export enum IntegrationProposalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IMPLEMENTED = 'implemented',
  FAILED = 'failed',
}

export enum IntegrationProposalType {
  API_INTEGRATION = 'api_integration',
  DOCUMENTATION = 'documentation',
  MODULE_GENERATION = 'module_generation',
  CODE_FIX = 'code_fix',
  FEATURE = 'feature',
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  requestBody?: Record<string, unknown>;
  response?: Record<string, unknown>;
}

export interface ProposedFile {
  path: string;
  content: string;
  action: 'create' | 'modify' | 'delete';
  description: string;
}

export interface IntegrationProposal {
  id: string;
  title: string;
  description: string;
  type: IntegrationProposalType;
  status: IntegrationProposalStatus;
  source_url?: string;
  discovered_endpoints: ApiEndpoint[];
  proposed_files: ProposedFile[];
  generated_documentation?: string;
  ai_reasoning?: string;
  confidence_score?: number;
  created_at: string;
  approved_at?: string;
  implemented_at?: string;
}

export interface AiChatResponse {
  message: string;
  conversation_id: string;
  code_suggestions?: Array<{
    language: string;
    code: string;
    description: string;
  }>;
  proposal_id?: string;
}

// ============================================================================
// Request Types
// ============================================================================

export interface AnalyzeApiRequest {
  documentation_url: string;
  api_name?: string;
  context?: string;
}

export interface GenerateDocumentationRequest {
  target_path: string;
  format?: 'markdown' | 'openapi' | 'typescript-jsdoc';
  include_examples?: boolean;
}

export interface GenerateModuleRequest {
  module_name: string;
  description: string;
  entity_fields?: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    description?: string;
  }>;
  include_crud?: boolean;
  related_modules?: string[];
}

export interface AiChatRequest {
  message: string;
  conversation_id?: string;
  context_paths?: string[];
}

export interface FixCodeRequest {
  file_path: string;
  issue_description: string;
  line_numbers?: number[];
}

export interface ReviewProposalRequest {
  decision: 'approve' | 'reject';
  reason?: string;
  selected_files?: number[];
}

export interface ListProposalsParams {
  status?: IntegrationProposalStatus;
  type?: IntegrationProposalType;
}

// ============================================================================
// API Client
// ============================================================================

const BASE_URL = '/ai-assistant';

export const aiAssistantApi = {
  /**
   * Analyze external API documentation
   */
  async analyzeApi(data: AnalyzeApiRequest): Promise<IntegrationProposal> {
    const response = await apiClient.post<IntegrationProposal>(
      `${BASE_URL}/analyze-api`,
      data,
    );
    return response.data;
  },

  /**
   * Generate documentation for existing code
   */
  async generateDocumentation(
    data: GenerateDocumentationRequest,
  ): Promise<IntegrationProposal> {
    const response = await apiClient.post<IntegrationProposal>(
      `${BASE_URL}/generate-docs`,
      data,
    );
    return response.data;
  },

  /**
   * Generate new NestJS module
   */
  async generateModule(data: GenerateModuleRequest): Promise<IntegrationProposal> {
    const response = await apiClient.post<IntegrationProposal>(
      `${BASE_URL}/generate-module`,
      data,
    );
    return response.data;
  },

  /**
   * Fix code issues
   */
  async fixCode(data: FixCodeRequest): Promise<IntegrationProposal> {
    const response = await apiClient.post<IntegrationProposal>(
      `${BASE_URL}/fix-code`,
      data,
    );
    return response.data;
  },

  /**
   * Chat with AI assistant
   */
  async chat(data: AiChatRequest): Promise<AiChatResponse> {
    const response = await apiClient.post<AiChatResponse>(
      `${BASE_URL}/chat`,
      data,
    );
    return response.data;
  },

  /**
   * Get all proposals
   */
  async getProposals(params?: ListProposalsParams): Promise<IntegrationProposal[]> {
    const response = await apiClient.get<IntegrationProposal[]>(
      `${BASE_URL}/proposals`,
      { params },
    );
    return response.data;
  },

  /**
   * Get single proposal
   */
  async getProposal(id: string): Promise<IntegrationProposal> {
    const response = await apiClient.get<IntegrationProposal>(
      `${BASE_URL}/proposals/${id}`,
    );
    return response.data;
  },

  /**
   * Review (approve/reject) a proposal
   */
  async reviewProposal(
    id: string,
    data: ReviewProposalRequest,
  ): Promise<IntegrationProposal> {
    const response = await apiClient.patch<IntegrationProposal>(
      `${BASE_URL}/proposals/${id}/review`,
      data,
    );
    return response.data;
  },

  /**
   * Delete a proposal
   */
  async deleteProposal(id: string): Promise<void> {
    await apiClient.delete(`${BASE_URL}/proposals/${id}`);
  },
};

// ============================================================================
// Display Helpers
// ============================================================================

export const PROPOSAL_TYPE_LABELS: Record<IntegrationProposalType, string> = {
  [IntegrationProposalType.API_INTEGRATION]: 'API Интеграция',
  [IntegrationProposalType.DOCUMENTATION]: 'Документация',
  [IntegrationProposalType.MODULE_GENERATION]: 'Новый модуль',
  [IntegrationProposalType.CODE_FIX]: 'Исправление кода',
  [IntegrationProposalType.FEATURE]: 'Новая функция',
};

export const PROPOSAL_STATUS_LABELS: Record<IntegrationProposalStatus, string> = {
  [IntegrationProposalStatus.PENDING]: 'Ожидает',
  [IntegrationProposalStatus.APPROVED]: 'Одобрено',
  [IntegrationProposalStatus.REJECTED]: 'Отклонено',
  [IntegrationProposalStatus.IMPLEMENTED]: 'Внедрено',
  [IntegrationProposalStatus.FAILED]: 'Ошибка',
};

export const PROPOSAL_STATUS_COLORS: Record<IntegrationProposalStatus, string> = {
  [IntegrationProposalStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [IntegrationProposalStatus.APPROVED]: 'bg-blue-100 text-blue-800',
  [IntegrationProposalStatus.REJECTED]: 'bg-red-100 text-red-800',
  [IntegrationProposalStatus.IMPLEMENTED]: 'bg-green-100 text-green-800',
  [IntegrationProposalStatus.FAILED]: 'bg-red-100 text-red-800',
};

export const PROPOSAL_TYPE_ICONS: Record<IntegrationProposalType, string> = {
  [IntegrationProposalType.API_INTEGRATION]: '🔌',
  [IntegrationProposalType.DOCUMENTATION]: '📄',
  [IntegrationProposalType.MODULE_GENERATION]: '📦',
  [IntegrationProposalType.CODE_FIX]: '🔧',
  [IntegrationProposalType.FEATURE]: '✨',
};
