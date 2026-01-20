/**
 * Directory System API Client
 *
 * Provides typed API calls for the directories-v2 backend endpoints.
 */

import axios from 'axios';
import type {
  Directory,
  DirectoryEntry,
  DirectoryStats,
  DirectoryEntryAudit,
  ApiResponse,
  PaginatedResponse,
  SearchResult,
  BulkImportResult,
  CreateDirectoryDto,
  UpdateDirectoryDto,
  CreateFieldDto,
  CreateEntryDto,
  UpdateEntryDto,
  SearchQueryParams,
  DirectoryType,
  DirectoryScope,
} from '../types';

// Base API instance - uses the app's configured axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ============================================================================
// Directory API
// ============================================================================

export interface DirectoryFilters {
  type?: DirectoryType;
  scope?: DirectoryScope;
  organization_id?: string;
  is_active?: boolean;
}

export const directoryApi = {
  // -------------------------------------------------------------------------
  // Directories
  // -------------------------------------------------------------------------

  /**
   * Get all directories with optional filters
   */
  async getDirectories(filters?: DirectoryFilters): Promise<Directory[]> {
    const { data } = await api.get<ApiResponse<Directory[]>>('/v2/directories', {
      params: filters,
    });
    return data.data;
  },

  /**
   * Get a directory by ID
   */
  async getDirectory(id: string): Promise<Directory> {
    const { data } = await api.get<ApiResponse<Directory>>(`/v2/directories/${id}`);
    return data.data;
  },

  /**
   * Get a directory by slug
   */
  async getDirectoryBySlug(slug: string): Promise<Directory> {
    const { data } = await api.get<ApiResponse<Directory>>(`/v2/directories/slug/${slug}`);
    return data.data;
  },

  /**
   * Get directory statistics
   */
  async getDirectoryStats(id: string): Promise<DirectoryStats> {
    const { data } = await api.get<ApiResponse<DirectoryStats>>(`/v2/directories/${id}/stats`);
    return data.data;
  },

  /**
   * Create a new directory
   */
  async createDirectory(dto: CreateDirectoryDto): Promise<Directory> {
    const { data } = await api.post<ApiResponse<Directory>>('/v2/directories', dto);
    return data.data;
  },

  /**
   * Update a directory
   */
  async updateDirectory(id: string, dto: UpdateDirectoryDto): Promise<Directory> {
    const { data } = await api.patch<ApiResponse<Directory>>(`/v2/directories/${id}`, dto);
    return data.data;
  },

  /**
   * Archive a directory
   */
  async archiveDirectory(id: string): Promise<void> {
    await api.delete(`/v2/directories/${id}`);
  },

  /**
   * Restore an archived directory
   */
  async restoreDirectory(id: string): Promise<Directory> {
    const { data } = await api.post<ApiResponse<Directory>>(`/v2/directories/${id}/restore`);
    return data.data;
  },

  // -------------------------------------------------------------------------
  // Fields
  // -------------------------------------------------------------------------

  /**
   * Add fields to a directory
   */
  async createFields(directoryId: string, fields: CreateFieldDto[]): Promise<void> {
    await api.post(`/v2/directories/${directoryId}/fields`, fields);
  },

  /**
   * Update a field
   */
  async updateField(
    directoryId: string,
    fieldId: string,
    updates: Partial<CreateFieldDto>,
  ): Promise<void> {
    await api.patch(`/v2/directories/${directoryId}/fields/${fieldId}`, updates);
  },

  /**
   * Delete a field
   */
  async deleteField(directoryId: string, fieldId: string): Promise<void> {
    await api.delete(`/v2/directories/${directoryId}/fields/${fieldId}`);
  },

  // -------------------------------------------------------------------------
  // Entries
  // -------------------------------------------------------------------------

  /**
   * Get entries with filters and pagination
   */
  async getEntries(
    directoryId: string,
    params?: SearchQueryParams,
  ): Promise<PaginatedResponse<DirectoryEntry>> {
    const { data } = await api.get<PaginatedResponse<DirectoryEntry>>(
      `/v2/directories/${directoryId}/entries`,
      { params },
    );
    return data;
  },

  /**
   * Search entries with full-text and fuzzy search
   */
  async searchEntries(directoryId: string, params: SearchQueryParams): Promise<SearchResult> {
    const { data } = await api.get<SearchResult>(
      `/v2/directories/${directoryId}/entries/search`,
      { params },
    );
    return data;
  },

  /**
   * Get hierarchical tree of entries
   */
  async getTree(
    directoryId: string,
    parentId?: string,
    maxDepth?: number,
  ): Promise<DirectoryEntry[]> {
    const { data } = await api.get<ApiResponse<DirectoryEntry[]>>(
      `/v2/directories/${directoryId}/entries/tree`,
      { params: { parent_id: parentId, max_depth: maxDepth } },
    );
    return data.data;
  },

  /**
   * Get a single entry by ID
   */
  async getEntry(directoryId: string, entryId: string): Promise<DirectoryEntry> {
    const { data } = await api.get<ApiResponse<DirectoryEntry>>(
      `/v2/directories/${directoryId}/entries/${entryId}`,
    );
    return data.data;
  },

  /**
   * Get entry ancestors (breadcrumb)
   */
  async getAncestors(directoryId: string, entryId: string): Promise<DirectoryEntry[]> {
    const { data } = await api.get<ApiResponse<DirectoryEntry[]>>(
      `/v2/directories/${directoryId}/entries/${entryId}/ancestors`,
    );
    return data.data;
  },

  /**
   * Get entry audit history
   */
  async getEntryHistory(
    directoryId: string,
    entryId: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: DirectoryEntryAudit[]; meta: { total: number } }> {
    const { data } = await api.get(
      `/v2/directories/${directoryId}/entries/${entryId}/history`,
      { params: { page, limit } },
    );
    return data;
  },

  /**
   * Create a new entry
   */
  async createEntry(directoryId: string, dto: CreateEntryDto): Promise<DirectoryEntry> {
    const { data } = await api.post<ApiResponse<DirectoryEntry>>(
      `/v2/directories/${directoryId}/entries`,
      dto,
    );
    return data.data;
  },

  /**
   * Update an entry
   */
  async updateEntry(
    directoryId: string,
    entryId: string,
    dto: UpdateEntryDto,
  ): Promise<DirectoryEntry> {
    const { data } = await api.patch<ApiResponse<DirectoryEntry>>(
      `/v2/directories/${directoryId}/entries/${entryId}`,
      dto,
    );
    return data.data;
  },

  /**
   * Archive an entry
   */
  async archiveEntry(directoryId: string, entryId: string): Promise<void> {
    await api.delete(`/v2/directories/${directoryId}/entries/${entryId}`);
  },

  /**
   * Restore an archived entry
   */
  async restoreEntry(directoryId: string, entryId: string): Promise<DirectoryEntry> {
    const { data } = await api.post<ApiResponse<DirectoryEntry>>(
      `/v2/directories/${directoryId}/entries/${entryId}/restore`,
    );
    return data.data;
  },

  /**
   * Approve a pending entry
   */
  async approveEntry(directoryId: string, entryId: string): Promise<DirectoryEntry> {
    const { data } = await api.post<ApiResponse<DirectoryEntry>>(
      `/v2/directories/${directoryId}/entries/${entryId}/approve`,
    );
    return data.data;
  },

  /**
   * Reject a pending entry
   */
  async rejectEntry(
    directoryId: string,
    entryId: string,
    reason: string,
  ): Promise<DirectoryEntry> {
    const { data } = await api.post<ApiResponse<DirectoryEntry>>(
      `/v2/directories/${directoryId}/entries/${entryId}/reject`,
      { reason },
    );
    return data.data;
  },

  /**
   * Deprecate an entry with optional replacement
   */
  async deprecateEntry(
    directoryId: string,
    entryId: string,
    replacementEntryId?: string,
  ): Promise<DirectoryEntry> {
    const { data } = await api.post<ApiResponse<DirectoryEntry>>(
      `/v2/directories/${directoryId}/entries/${entryId}/deprecate`,
      { replacement_entry_id: replacementEntryId },
    );
    return data.data;
  },

  /**
   * Bulk import entries
   */
  async bulkImport(
    directoryId: string,
    entries: CreateEntryDto[],
    options: {
      mode: 'insert' | 'upsert' | 'sync';
      unique_key_field?: string;
      is_atomic?: boolean;
    },
  ): Promise<BulkImportResult> {
    const { data } = await api.post<ApiResponse<BulkImportResult>>(
      `/v2/directories/${directoryId}/entries/bulk-import`,
      {
        entries,
        ...options,
      },
    );
    return data.data;
  },
};

export default directoryApi;
