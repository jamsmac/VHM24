/**
 * Image compression and manipulation utilities
 */

export interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  mimeType?: string
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  mimeType: 'image/jpeg',
}

/**
 * Compress image file
 *
 * @param file - Original image file
 * @param options - Compression options
 * @returns Compressed file
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img
          const { maxWidth, maxHeight } = opts

          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height

            if (width > height) {
              width = Math.min(width, maxWidth)
              height = width / aspectRatio
            } else {
              height = Math.min(height, maxHeight)
              width = height * aspectRatio
            }
          }

          // Create canvas
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'))
                return
              }

              // Create new file
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.\w+$/, '.jpg'),
                {
                  type: opts.mimeType,
                  lastModified: Date.now(),
                }
              )

              resolve(compressedFile)
            },
            opts.mimeType,
            opts.quality
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Resize image to specific dimensions
 */
export async function resizeImage(
  file: File,
  width: number,
  height: number,
  quality: number = 0.9
): Promise<File> {
  return compressImage(file, {
    maxWidth: width,
    maxHeight: height,
    quality,
  })
}

/**
 * Create thumbnail from image
 */
export async function createThumbnail(
  file: File,
  size: number = 300
): Promise<File> {
  return compressImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
  })
}

/**
 * Get image dimensions without loading full image
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
        })
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Convert image to base64 data URL
 */
export async function imageToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      resolve(e.target?.result as string)
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Convert data URL to File
 */
export async function dataURLToFile(
  dataURL: string,
  filename: string
): Promise<File> {
  const res = await fetch(dataURL)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type })
}

/**
 * Rotate image
 */
export async function rotateImage(
  file: File,
  degrees: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // Calculate new canvas size
          const rad = (degrees * Math.PI) / 180
          const sin = Math.abs(Math.sin(rad))
          const cos = Math.abs(Math.cos(rad))
          canvas.width = img.height * sin + img.width * cos
          canvas.height = img.height * cos + img.width * sin

          // Rotate and draw
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.rotate(rad)
          ctx.drawImage(img, -img.width / 2, -img.height / 2)

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to rotate image'))
                return
              }

              const rotatedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              })

              resolve(rotatedFile)
            },
            file.type,
            0.95
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Apply EXIF orientation
 */
export async function applyExifOrientation(file: File): Promise<File> {
  // Note: Modern browsers handle EXIF orientation automatically
  // This is a placeholder for legacy browser support
  return file
}

/**
 * Compress multiple images
 */
export async function compressImages(
  files: File[],
  options: CompressOptions = {}
): Promise<File[]> {
  const promises = files.map((file) => compressImage(file, options))
  return Promise.all(promises)
}

/**
 * Calculate file size reduction
 */
export function calculateCompression(
  originalSize: number,
  compressedSize: number
): {
  savedBytes: number
  savedMB: number
  ratio: number
  percentage: string
} {
  const savedBytes = originalSize - compressedSize
  const savedMB = savedBytes / 1024 / 1024
  const ratio = compressedSize / originalSize
  const percentage = ((1 - ratio) * 100).toFixed(1)

  return {
    savedBytes,
    savedMB,
    ratio,
    percentage,
  }
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Check if browser supports image type
 */
export function supportsImageType(mimeType: string): boolean {
  const canvas = document.createElement('canvas')
  return canvas.toDataURL(mimeType).indexOf(`data:${mimeType}`) === 0
}

/**
 * Get optimal mime type for browser
 */
export function getOptimalMimeType(): string {
  if (supportsImageType('image/webp')) {
    return 'image/webp'
  }
  return 'image/jpeg'
}
