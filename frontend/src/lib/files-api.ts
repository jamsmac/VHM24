import { apiClient } from './axios'

export interface FileUploadParams {
  file: File
  entity_type: string
  entity_id: string
  category_code: string
  uploaded_by_user_id?: string
  description?: string
  tags?: string[]
}

export interface UploadedFile {
  id: string
  entity_type: string
  entity_id: string
  category_code: string
  file_name: string
  file_url: string
  cloudflare_url?: string
  file_size: number
  mime_type: string
  uploaded_by_user_id?: string
  description?: string
  tags?: string[]
  created_at: Date
  updated_at: Date
}

export const filesApi = {
  /**
   * Загрузить файл
   */
  upload: async (params: FileUploadParams): Promise<UploadedFile> => {
    const formData = new FormData()
    formData.append('file', params.file)
    formData.append('entity_type', params.entity_type)
    formData.append('entity_id', params.entity_id)
    formData.append('category_code', params.category_code)

    if (params.uploaded_by_user_id) {
      formData.append('uploaded_by_user_id', params.uploaded_by_user_id)
    }

    if (params.description) {
      formData.append('description', params.description)
    }

    if (params.tags && params.tags.length > 0) {
      formData.append('tags', JSON.stringify(params.tags))
    }

    const response = await apiClient.post<UploadedFile>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data
  },

  /**
   * Получить список файлов
   */
  getAll: async (params?: {
    entity_type?: string
    entity_id?: string
    category_code?: string
  }): Promise<UploadedFile[]> => {
    const response = await apiClient.get<UploadedFile[]>('/files', { params })
    return response.data
  },

  /**
   * Получить файлы по сущности
   */
  getByEntity: async (entityType: string, entityId: string): Promise<UploadedFile[]> => {
    const response = await apiClient.get<UploadedFile[]>(
      `/files/by-entity/${entityType}/${entityId}`
    )
    return response.data
  },

  /**
   * Получить файл по ID
   */
  getById: async (id: string): Promise<UploadedFile> => {
    const response = await apiClient.get<UploadedFile>(`/files/${id}`)
    return response.data
  },

  /**
   * Удалить файл
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/files/${id}`)
  },

  /**
   * Валидация фото задачи
   */
  validateTaskPhotos: async (taskId: string): Promise<{
    has_photo_before: boolean
    has_photo_after: boolean
    is_valid: boolean
    photos_before_count: number
    photos_after_count: number
  }> => {
    const response = await apiClient.get(`/files/validate-task-photos/${taskId}`)
    return response.data
  },
}
