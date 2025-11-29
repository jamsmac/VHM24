import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { filesApi, type FileUploadParams, type UploadedFile } from './files-api'
import { apiClient } from './axios'

// Mock axios
vi.mock('./axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Files API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('File Upload', () => {
    it('should upload a file successfully', async () => {
      const mockFile = new File(['photo content'], 'machine-photo.jpg', {
        type: 'image/jpeg',
      })

      const uploadParams: FileUploadParams = {
        file: mockFile,
        entity_type: 'task',
        entity_id: 'task-1',
        category_code: 'task_photo_before',
        description: 'Photo before refill',
      }

      const mockUploadedFile: UploadedFile = {
        id: 'file-1',
        entity_type: 'task',
        entity_id: 'task-1',
        category_code: 'task_photo_before',
        file_name: 'machine-photo.jpg',
        file_url: 'https://storage.example.com/files/machine-photo.jpg',
        cloudflare_url: 'https://cdn.example.com/files/machine-photo.jpg',
        file_size: 125000,
        mime_type: 'image/jpeg',
        description: 'Photo before refill',
        created_at: new Date('2025-11-24T08:00:00Z'),
        updated_at: new Date('2025-11-24T08:00:00Z'),
      }

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockUploadedFile })

      const result = await filesApi.upload(uploadParams)

      expect(apiClient.post).toHaveBeenCalledWith(
        '/files/upload',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      // Verify FormData was created correctly
      const callArgs = vi.mocked(apiClient.post).mock.calls[0]
      const formData = callArgs[1] as FormData
      expect(formData.get('file')).toBe(mockFile)
      expect(formData.get('entity_type')).toBe('task')
      expect(formData.get('entity_id')).toBe('task-1')
      expect(formData.get('category_code')).toBe('task_photo_before')
      expect(formData.get('description')).toBe('Photo before refill')

      expect(result).toEqual(mockUploadedFile)
    })

    it('should upload file with tags', async () => {
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })

      const uploadParams: FileUploadParams = {
        file: mockFile,
        entity_type: 'task',
        entity_id: 'task-1',
        category_code: 'task_photo_after',
        tags: ['refill', 'success', 'coffee-machine'],
      }

      const mockUploadedFile: UploadedFile = {
        id: 'file-2',
        entity_type: 'task',
        entity_id: 'task-1',
        category_code: 'task_photo_after',
        file_name: 'test.jpg',
        file_url: 'https://storage.example.com/files/test.jpg',
        file_size: 50000,
        mime_type: 'image/jpeg',
        tags: ['refill', 'success', 'coffee-machine'],
        created_at: new Date(),
        updated_at: new Date(),
      }

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockUploadedFile })

      const result = await filesApi.upload(uploadParams)

      const callArgs = vi.mocked(apiClient.post).mock.calls[0]
      const formData = callArgs[1] as FormData
      expect(formData.get('tags')).toBe(JSON.stringify(['refill', 'success', 'coffee-machine']))
      expect(result.tags).toEqual(['refill', 'success', 'coffee-machine'])
    })

    it('should handle large file upload', async () => {
      // Simulate a 4MB file
      const largeContent = new Uint8Array(4 * 1024 * 1024)
      const mockFile = new File([largeContent], 'large-photo.jpg', {
        type: 'image/jpeg',
      })

      const uploadParams: FileUploadParams = {
        file: mockFile,
        entity_type: 'task',
        entity_id: 'task-1',
        category_code: 'task_photo_before',
      }

      const mockUploadedFile: UploadedFile = {
        id: 'file-large',
        entity_type: 'task',
        entity_id: 'task-1',
        category_code: 'task_photo_before',
        file_name: 'large-photo.jpg',
        file_url: 'https://storage.example.com/files/large-photo.jpg',
        file_size: 4194304,
        mime_type: 'image/jpeg',
        created_at: new Date(),
        updated_at: new Date(),
      }

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockUploadedFile })

      const result = await filesApi.upload(uploadParams)

      expect(result.file_size).toBe(4194304)
    })
  })

  describe('File Retrieval', () => {
    it('should get all files', async () => {
      const mockFiles: UploadedFile[] = [
        {
          id: 'file-1',
          entity_type: 'task',
          entity_id: 'task-1',
          category_code: 'task_photo_before',
          file_name: 'photo1.jpg',
          file_url: 'https://storage.example.com/photo1.jpg',
          file_size: 100000,
          mime_type: 'image/jpeg',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'file-2',
          entity_type: 'task',
          entity_id: 'task-1',
          category_code: 'task_photo_after',
          file_name: 'photo2.jpg',
          file_url: 'https://storage.example.com/photo2.jpg',
          file_size: 120000,
          mime_type: 'image/jpeg',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockFiles })

      const result = await filesApi.getAll()

      expect(apiClient.get).toHaveBeenCalledWith('/files', { params: undefined })
      expect(result).toHaveLength(2)
    })

    it('should get files with filters', async () => {
      const filters = {
        entity_type: 'task',
        entity_id: 'task-1',
        category_code: 'task_photo_before',
      }

      vi.mocked(apiClient.get).mockResolvedValue({ data: [] })

      await filesApi.getAll(filters)

      expect(apiClient.get).toHaveBeenCalledWith('/files', { params: filters })
    })

    it('should get files by entity', async () => {
      const mockFiles: UploadedFile[] = [
        {
          id: 'file-1',
          entity_type: 'task',
          entity_id: 'task-1',
          category_code: 'task_photo_before',
          file_name: 'before.jpg',
          file_url: 'https://storage.example.com/before.jpg',
          file_size: 100000,
          mime_type: 'image/jpeg',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockFiles })

      const result = await filesApi.getByEntity('task', 'task-1')

      expect(apiClient.get).toHaveBeenCalledWith('/files/by-entity/task/task-1')
      expect(result).toHaveLength(1)
      expect(result[0].entity_id).toBe('task-1')
    })

    it('should get file by ID', async () => {
      const mockFile: UploadedFile = {
        id: 'file-1',
        entity_type: 'task',
        entity_id: 'task-1',
        category_code: 'task_photo_before',
        file_name: 'machine-photo.jpg',
        file_url: 'https://storage.example.com/machine-photo.jpg',
        file_size: 125000,
        mime_type: 'image/jpeg',
        created_at: new Date(),
        updated_at: new Date(),
      }

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockFile })

      const result = await filesApi.getById('file-1')

      expect(apiClient.get).toHaveBeenCalledWith('/files/file-1')
      expect(result.id).toBe('file-1')
    })
  })

  describe('File Deletion', () => {
    it('should delete a file', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: null })

      await filesApi.delete('file-1')

      expect(apiClient.delete).toHaveBeenCalledWith('/files/file-1')
    })

    it('should handle deletion of non-existent file', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'File not found' },
        },
      })

      await expect(filesApi.delete('non-existent')).rejects.toMatchObject({
        response: {
          status: 404,
        },
      })
    })
  })

  describe('Task Photo Validation', () => {
    it('should validate task photos - valid case with both photos', async () => {
      const mockValidation = {
        has_photo_before: true,
        has_photo_after: true,
        is_valid: true,
        photos_before_count: 2,
        photos_after_count: 1,
      }

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockValidation })

      const result = await filesApi.validateTaskPhotos('task-1')

      expect(apiClient.get).toHaveBeenCalledWith('/files/validate-task-photos/task-1')
      expect(result.is_valid).toBe(true)
      expect(result.has_photo_before).toBe(true)
      expect(result.has_photo_after).toBe(true)
    })

    it('should validate task photos - missing before photo', async () => {
      const mockValidation = {
        has_photo_before: false,
        has_photo_after: true,
        is_valid: false,
        photos_before_count: 0,
        photos_after_count: 1,
      }

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockValidation })

      const result = await filesApi.validateTaskPhotos('task-2')

      expect(result.is_valid).toBe(false)
      expect(result.has_photo_before).toBe(false)
      expect(result.photos_before_count).toBe(0)
    })

    it('should validate task photos - missing after photo', async () => {
      const mockValidation = {
        has_photo_before: true,
        has_photo_after: false,
        is_valid: false,
        photos_before_count: 1,
        photos_after_count: 0,
      }

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockValidation })

      const result = await filesApi.validateTaskPhotos('task-3')

      expect(result.is_valid).toBe(false)
      expect(result.has_photo_after).toBe(false)
      expect(result.photos_after_count).toBe(0)
    })

    it('should validate task photos - no photos uploaded', async () => {
      const mockValidation = {
        has_photo_before: false,
        has_photo_after: false,
        is_valid: false,
        photos_before_count: 0,
        photos_after_count: 0,
      }

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockValidation })

      const result = await filesApi.validateTaskPhotos('task-4')

      expect(result.is_valid).toBe(false)
      expect(result.photos_before_count).toBe(0)
      expect(result.photos_after_count).toBe(0)
    })

    it('should validate task photos - multiple photos in each category', async () => {
      const mockValidation = {
        has_photo_before: true,
        has_photo_after: true,
        is_valid: true,
        photos_before_count: 3,
        photos_after_count: 3,
      }

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockValidation })

      const result = await filesApi.validateTaskPhotos('task-5')

      expect(result.is_valid).toBe(true)
      expect(result.photos_before_count).toBe(3)
      expect(result.photos_after_count).toBe(3)
    })
  })

  describe('Error Handling', () => {
    it('should handle file upload error - file too large', async () => {
      const mockFile = new File(['content'], 'huge.jpg', { type: 'image/jpeg' })

      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 413,
          data: { message: 'File too large. Maximum size is 5MB.' },
        },
      })

      await expect(
        filesApi.upload({
          file: mockFile,
          entity_type: 'task',
          entity_id: 'task-1',
          category_code: 'task_photo_before',
        })
      ).rejects.toMatchObject({
        response: {
          status: 413,
        },
      })
    })

    it('should handle file upload error - invalid file type', async () => {
      const mockFile = new File(['content'], 'document.pdf', { type: 'application/pdf' })

      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Invalid file type. Only images are allowed.' },
        },
      })

      await expect(
        filesApi.upload({
          file: mockFile,
          entity_type: 'task',
          entity_id: 'task-1',
          category_code: 'task_photo_before',
        })
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            message: 'Invalid file type. Only images are allowed.',
          },
        },
      })
    })

    it('should handle 404 error when file not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'File not found' },
        },
      })

      await expect(filesApi.getById('non-existent')).rejects.toMatchObject({
        response: {
          status: 404,
        },
      })
    })

    it('should handle 403 error when unauthorized to delete file', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'You are not authorized to delete this file' },
        },
      })

      await expect(filesApi.delete('file-1')).rejects.toMatchObject({
        response: {
          status: 403,
        },
      })
    })

    it('should handle 500 server error on upload', async () => {
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })

      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Storage service unavailable' },
        },
      })

      await expect(
        filesApi.upload({
          file: mockFile,
          entity_type: 'task',
          entity_id: 'task-1',
          category_code: 'task_photo_before',
        })
      ).rejects.toMatchObject({
        response: {
          status: 500,
        },
      })
    })

    it('should handle network error during upload', async () => {
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })

      vi.mocked(apiClient.post).mockRejectedValue({
        message: 'Network Error',
        code: 'ERR_NETWORK',
      })

      await expect(
        filesApi.upload({
          file: mockFile,
          entity_type: 'task',
          entity_id: 'task-1',
          category_code: 'task_photo_before',
        })
      ).rejects.toMatchObject({
        message: 'Network Error',
      })
    })

    it('should handle validation error for non-existent task', async () => {
      vi.mocked(apiClient.get).mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Task not found' },
        },
      })

      await expect(filesApi.validateTaskPhotos('non-existent-task')).rejects.toMatchObject({
        response: {
          status: 404,
        },
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty file upload attempt', async () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' })

      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'File is empty' },
        },
      })

      await expect(
        filesApi.upload({
          file: emptyFile,
          entity_type: 'task',
          entity_id: 'task-1',
          category_code: 'task_photo_before',
        })
      ).rejects.toMatchObject({
        response: {
          status: 400,
        },
      })
    })

    it('should handle special characters in file name', async () => {
      const mockFile = new File(['content'], 'фото автомата №5.jpg', {
        type: 'image/jpeg',
      })

      const mockUploadedFile: UploadedFile = {
        id: 'file-special',
        entity_type: 'task',
        entity_id: 'task-1',
        category_code: 'task_photo_before',
        file_name: 'фото автомата №5.jpg',
        file_url: 'https://storage.example.com/files/photo-5.jpg',
        file_size: 100000,
        mime_type: 'image/jpeg',
        created_at: new Date(),
        updated_at: new Date(),
      }

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockUploadedFile })

      const result = await filesApi.upload({
        file: mockFile,
        entity_type: 'task',
        entity_id: 'task-1',
        category_code: 'task_photo_before',
      })

      expect(result.file_name).toBe('фото автомата №5.jpg')
    })

    it('should handle no files returned when filtering', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] })

      const result = await filesApi.getByEntity('task', 'task-999')

      expect(result).toEqual([])
    })
  })
})
