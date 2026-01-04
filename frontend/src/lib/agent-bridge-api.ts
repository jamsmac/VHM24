/**
 * Agent Bridge API Client
 *
 * Client for monitoring AI agents from agent-deck.
 */

import { apiClient } from './axios';

// ============================================================================
// Types
// ============================================================================

export enum AgentSessionStatus {
  RUNNING = 'running',
  WAITING = 'waiting',
  IDLE = 'idle',
  ERROR = 'error',
  COMPLETED = 'completed',
}

export enum AgentType {
  CLAUDE_CODE = 'claude_code',
  GEMINI_CLI = 'gemini_cli',
  CURSOR = 'cursor',
  OPENCODE = 'opencode',
  CUSTOM = 'custom',
}

export enum ProgressStatus {
  STARTED = 'started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked',
}

export enum ProgressCategory {
  ANALYSIS = 'analysis',
  CODE_GENERATION = 'code_generation',
  TESTING = 'testing',
  FIX = 'fix',
  DOCUMENTATION = 'documentation',
  REFACTORING = 'refactoring',
  OTHER = 'other',
}

export interface AgentSession {
  id: string;
  session_id: string;
  name: string;
  agent_type: AgentType;
  status: AgentSessionStatus;
  current_task: string | null;
  working_directory: string | null;
  profile: string | null;
  attached_mcps: string[];
  last_activity_at: string | null;
  messages_count: number;
  proposals_count: number;
  files_changed_count: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AgentProgress {
  id: string;
  session_id: string;
  task_id: string | null;
  status: ProgressStatus;
  category: ProgressCategory;
  message: string;
  files_changed: string[];
  lines_added: number | null;
  lines_removed: number | null;
  duration_ms: number | null;
  proposal_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  session?: AgentSession;
}

export interface AgentStatistics {
  active_sessions: number;
  total_sessions: number;
  total_progress_entries: number;
  files_changed_today: number;
  proposals_today: number;
  by_status: Record<AgentSessionStatus, number>;
  by_type: Record<AgentType, number>;
}

export interface SessionsResponse {
  sessions: AgentSession[];
  total: number;
}

// ============================================================================
// API Client
// ============================================================================

const BASE_URL = '/agent-bridge';

export const agentBridgeApi = {
  /**
   * Get all sessions
   */
  async getSessions(
    page?: number,
    limit?: number,
    status?: AgentSessionStatus,
  ): Promise<SessionsResponse> {
    const response = await apiClient.get<SessionsResponse>(`${BASE_URL}/sessions`, {
      params: { page, limit, status },
    });
    return response.data;
  },

  /**
   * Get active sessions only
   */
  async getActiveSessions(): Promise<AgentSession[]> {
    const response = await apiClient.get<AgentSession[]>(`${BASE_URL}/sessions/active`);
    return response.data;
  },

  /**
   * Get single session
   */
  async getSession(sessionId: string): Promise<AgentSession> {
    const response = await apiClient.get<AgentSession>(`${BASE_URL}/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Get session progress history
   */
  async getSessionProgress(sessionId: string, limit?: number): Promise<AgentProgress[]> {
    const response = await apiClient.get<AgentProgress[]>(
      `${BASE_URL}/sessions/${sessionId}/progress`,
      { params: { limit } },
    );
    return response.data;
  },

  /**
   * Get recent progress across all sessions
   */
  async getRecentProgress(limit?: number): Promise<AgentProgress[]> {
    const response = await apiClient.get<AgentProgress[]>(`${BASE_URL}/progress/recent`, {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get statistics
   */
  async getStatistics(): Promise<AgentStatistics> {
    const response = await apiClient.get<AgentStatistics>(`${BASE_URL}/statistics`);
    return response.data;
  },

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await apiClient.delete(`${BASE_URL}/sessions/${sessionId}`);
  },
};

// ============================================================================
// Display Helpers
// ============================================================================

export const AGENT_STATUS_LABELS: Record<AgentSessionStatus, string> = {
  [AgentSessionStatus.RUNNING]: 'Работает',
  [AgentSessionStatus.WAITING]: 'Ожидает ввод',
  [AgentSessionStatus.IDLE]: 'Готов',
  [AgentSessionStatus.ERROR]: 'Ошибка',
  [AgentSessionStatus.COMPLETED]: 'Завершен',
};

export const AGENT_STATUS_COLORS: Record<AgentSessionStatus, string> = {
  [AgentSessionStatus.RUNNING]: 'bg-green-500',
  [AgentSessionStatus.WAITING]: 'bg-yellow-500',
  [AgentSessionStatus.IDLE]: 'bg-gray-400',
  [AgentSessionStatus.ERROR]: 'bg-red-500',
  [AgentSessionStatus.COMPLETED]: 'bg-blue-500',
};

export const AGENT_STATUS_ICONS: Record<AgentSessionStatus, string> = {
  [AgentSessionStatus.RUNNING]: '●',
  [AgentSessionStatus.WAITING]: '◐',
  [AgentSessionStatus.IDLE]: '○',
  [AgentSessionStatus.ERROR]: '✕',
  [AgentSessionStatus.COMPLETED]: '✓',
};

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  [AgentType.CLAUDE_CODE]: 'Claude Code',
  [AgentType.GEMINI_CLI]: 'Gemini CLI',
  [AgentType.CURSOR]: 'Cursor',
  [AgentType.OPENCODE]: 'OpenCode',
  [AgentType.CUSTOM]: 'Custom',
};

export const PROGRESS_CATEGORY_LABELS: Record<ProgressCategory, string> = {
  [ProgressCategory.ANALYSIS]: 'Анализ',
  [ProgressCategory.CODE_GENERATION]: 'Генерация кода',
  [ProgressCategory.TESTING]: 'Тестирование',
  [ProgressCategory.FIX]: 'Исправление',
  [ProgressCategory.DOCUMENTATION]: 'Документация',
  [ProgressCategory.REFACTORING]: 'Рефакторинг',
  [ProgressCategory.OTHER]: 'Прочее',
};

export const PROGRESS_CATEGORY_COLORS: Record<ProgressCategory, string> = {
  [ProgressCategory.ANALYSIS]: 'bg-blue-100 text-blue-800',
  [ProgressCategory.CODE_GENERATION]: 'bg-purple-100 text-purple-800',
  [ProgressCategory.TESTING]: 'bg-green-100 text-green-800',
  [ProgressCategory.FIX]: 'bg-orange-100 text-orange-800',
  [ProgressCategory.DOCUMENTATION]: 'bg-cyan-100 text-cyan-800',
  [ProgressCategory.REFACTORING]: 'bg-indigo-100 text-indigo-800',
  [ProgressCategory.OTHER]: 'bg-gray-100 text-gray-800',
};
