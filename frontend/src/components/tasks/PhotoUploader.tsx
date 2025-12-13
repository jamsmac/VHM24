'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Camera, Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import { filesApi, type FileUploadParams } from '@/lib/files-api'
import { compressImage } from '@/lib/image-utils'
import { toast } from 'react-toastify'

interface PhotoUploaderProps {
  taskId: string
  category: 'task_photo_before' | 'task_photo_after'
  label: string
  description?: string
  maxFiles?: number
  onUploadComplete?: (fileIds: string[]) => void
  existingPhotos?: Array<{ id: string; file_url: string; cloudflare_url?: string }>
}

interface UploadingFile {
  file: File
  preview: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
  uploadedId?: string
}

export function PhotoUploader({
  taskId,
  category,
  label,
  description,
  maxFiles = 5,
  onUploadComplete,
  existingPhotos = [],
}: PhotoUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {return}

      const validFiles: File[] = []
      const totalPhotos = existingPhotos.length + uploadingFiles.length

      // Валидация файлов
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Проверка типа
        if (!file.type.startsWith('image/')) {
          toast.error(`Файл ${file.name} не является изображением`)
          continue
        }

        // Проверка размера (макс 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`Файл ${file.name} слишком большой (макс 5MB)`)
          continue
        }

        // Проверка лимита
        if (totalPhotos + validFiles.length >= maxFiles) {
          toast.warning(`Можно загрузить максимум ${maxFiles} фото`)
          break
        }

        validFiles.push(file)
      }

      if (validFiles.length === 0) {return}

      // Создаём превью и добавляем в список загрузки
      const newUploading: UploadingFile[] = validFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: 'uploading',
      }))

      setUploadingFiles((prev) => [...prev, ...newUploading])

      // Загружаем файлы
      const uploadedIds: string[] = []

      for (let i = 0; i < newUploading.length; i++) {
        const uploadingFile = newUploading[i]

        try {
          // Сжимаем изображение перед загрузкой
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.preview === uploadingFile.preview
                ? {
                    ...f,
                    progress: 10,
                  }
                : f
            )
          )

          const compressedFile = await compressImage(uploadingFile.file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.85,
          })

          console.log('[PhotoUploader] Compression:', {
            original: `${(uploadingFile.file.size / 1024 / 1024).toFixed(2)}MB`,
            compressed: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
            saved: `${(((uploadingFile.file.size - compressedFile.size) / uploadingFile.file.size) * 100).toFixed(1)}%`,
          })

          // Загружаем сжатый файл
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.preview === uploadingFile.preview
                ? {
                    ...f,
                    progress: 30,
                  }
                : f
            )
          )

          const uploadedFile = await filesApi.upload({
            file: compressedFile,
            entity_type: 'task',
            entity_id: taskId,
            category_code: category,
          })

          // Обновляем статус
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.preview === uploadingFile.preview
                ? {
                    ...f,
                    status: 'success',
                    progress: 100,
                    uploadedId: uploadedFile.id,
                  }
                : f
            )
          )

          uploadedIds.push(uploadedFile.id)
        } catch (error: any) {
          console.error('Upload error:', error)

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.preview === uploadingFile.preview
                ? {
                    ...f,
                    status: 'error',
                    error: error.response?.data?.message || 'Ошибка загрузки',
                  }
                : f
            )
          )

          toast.error(`Ошибка загрузки ${uploadingFile.file.name}`)
        }
      }

      if (uploadedIds.length > 0) {
        toast.success(`Загружено фото: ${uploadedIds.length}`)
        onUploadComplete?.(uploadedIds)
      }
    },
    [taskId, category, maxFiles, existingPhotos.length, uploadingFiles.length, onUploadComplete]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      // Сбрасываем input для возможности загрузки того же файла снова
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFiles]
  )

  const removeUploadingFile = useCallback((preview: string) => {
    setUploadingFiles((prev) => {
      const file = prev.find((f) => f.preview === preview)
      if (file) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f) => f.preview !== preview)
    })
  }, [])

  const totalPhotos = existingPhotos.length + uploadingFiles.filter((f) => f.status === 'success').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Camera className="h-5 w-5 text-indigo-600" />
          {label}
          <span className="text-sm text-gray-500">
            ({totalPhotos}/{maxFiles})
          </span>
        </h3>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>

      {/* Existing photos */}
      {existingPhotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {existingPhotos.map((photo) => (
            <div key={photo.id} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={photo.file_url || photo.cloudflare_url || ''}
                alt="Фото"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute top-1 right-1">
                <div className="bg-green-500 rounded-full p-1">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploading files */}
      {uploadingFiles.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {uploadingFiles.map((uploadingFile) => (
            <div
              key={uploadingFile.preview}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
            >
              <Image
                src={uploadingFile.preview}
                alt="Загрузка..."
                fill
                className="object-cover"
                unoptimized
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                {uploadingFile.status === 'uploading' && (
                  <div className="text-white text-center">
                    <Upload className="h-6 w-6 animate-pulse mx-auto mb-1" />
                    <p className="text-xs">{uploadingFile.progress}%</p>
                  </div>
                )}

                {uploadingFile.status === 'success' && (
                  <div className="bg-green-500 rounded-full p-2">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                )}

                {uploadingFile.status === 'error' && (
                  <div className="bg-red-500 rounded-full p-2">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>

              {/* Remove button */}
              {uploadingFile.status !== 'uploading' && (
                <button
                  onClick={() => removeUploadingFile(uploadingFile.preview)}
                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 rounded-full p-1 transition-colors"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              )}

              {/* Error message */}
              {uploadingFile.status === 'error' && uploadingFile.error && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1 text-center">
                  {uploadingFile.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {totalPhotos < maxFiles && (
        <div
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${
              isDragging
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />

          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />

          <p className="text-sm font-medium text-gray-900 mb-1">
            {isDragging ? 'Отпустите файлы здесь' : 'Нажмите или перетащите фото'}
          </p>

          <p className="text-xs text-gray-500">
            PNG, JPG, WEBP до 5MB (макс {maxFiles} фото)
          </p>
        </div>
      )}
    </div>
  )
}
