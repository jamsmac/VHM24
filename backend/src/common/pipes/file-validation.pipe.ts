import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';

/**
 * File validation configuration options
 */
export interface FileValidationOptions {
  /** Maximum file size in bytes (default: 10MB) */
  maxSize?: number;
  /** Allowed MIME types */
  allowedMimeTypes?: string[];
  /** Allowed file extensions (without dot) */
  allowedExtensions?: string[];
  /** Whether to require a file (default: true) */
  required?: boolean;
  /** Custom error message for size validation */
  sizeErrorMessage?: string;
  /** Custom error message for type validation */
  typeErrorMessage?: string;
}

/**
 * Default validation configuration
 */
const DEFAULT_OPTIONS: FileValidationOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
  ],
  allowedExtensions: [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'pdf',
    'xls',
    'xlsx',
    'csv',
    'txt',
  ],
  required: true,
};

/**
 * File Validation Pipe
 *
 * SEC-FILE-01: File upload security validation
 *
 * Features:
 * - File size validation (default 10MB max)
 * - MIME type validation
 * - File extension validation
 * - Configurable per-endpoint
 *
 * Usage:
 * @UploadedFile(new FileValidationPipe({ maxSize: 5 * 1024 * 1024 }))
 * file: Express.Multer.File
 */
@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly options: Required<FileValidationOptions>;

  constructor(options: FileValidationOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? DEFAULT_OPTIONS.maxSize!,
      allowedMimeTypes: options.allowedMimeTypes ?? DEFAULT_OPTIONS.allowedMimeTypes!,
      allowedExtensions: options.allowedExtensions ?? DEFAULT_OPTIONS.allowedExtensions!,
      required: options.required ?? DEFAULT_OPTIONS.required!,
      sizeErrorMessage:
        options.sizeErrorMessage ??
        `File size exceeds maximum limit of ${this.formatBytes(options.maxSize ?? DEFAULT_OPTIONS.maxSize!)}`,
      typeErrorMessage:
        options.typeErrorMessage ?? 'File type not allowed',
    };
  }

  transform(
    file: Express.Multer.File | undefined,
    _metadata: ArgumentMetadata,
  ): Express.Multer.File | undefined {
    // Check if file is required
    if (!file) {
      if (this.options.required) {
        throw new BadRequestException('File is required');
      }
      return undefined;
    }

    // Validate file size
    this.validateSize(file);

    // Validate MIME type
    this.validateMimeType(file);

    // Validate extension
    this.validateExtension(file);

    return file;
  }

  /**
   * Validate file size
   */
  private validateSize(file: Express.Multer.File): void {
    if (file.size > this.options.maxSize) {
      throw new BadRequestException(
        this.options.sizeErrorMessage ||
          `File too large: ${this.formatBytes(file.size)} (max: ${this.formatBytes(this.options.maxSize)})`,
      );
    }
  }

  /**
   * Validate MIME type
   */
  private validateMimeType(file: Express.Multer.File): void {
    if (this.options.allowedMimeTypes.length === 0) {
      return; // No restrictions
    }

    if (!this.options.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `${this.options.typeErrorMessage}. Got: ${file.mimetype}. Allowed: ${this.options.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  /**
   * Validate file extension
   */
  private validateExtension(file: Express.Multer.File): void {
    if (this.options.allowedExtensions.length === 0) {
      return; // No restrictions
    }

    const extension = this.getExtension(file.originalname);
    if (!extension || !this.options.allowedExtensions.includes(extension.toLowerCase())) {
      throw new BadRequestException(
        `Invalid file extension: .${extension || '(none)'}. Allowed: .${this.options.allowedExtensions.join(', .')}`,
      );
    }
  }

  /**
   * Get file extension from filename
   */
  private getExtension(filename: string): string | null {
    const parts = filename.split('.');
    if (parts.length < 2) {
      return null;
    }
    return parts.pop()!.toLowerCase();
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Pre-configured validation pipe for image uploads (5MB max)
 */
export class ImageValidationPipe extends FileValidationPipe {
  constructor(options: Partial<FileValidationOptions> = {}) {
    super({
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      ...options,
    });
  }
}

/**
 * Pre-configured validation pipe for document uploads (20MB max)
 */
export class DocumentValidationPipe extends FileValidationPipe {
  constructor(options: Partial<FileValidationOptions> = {}) {
    super({
      maxSize: 20 * 1024 * 1024, // 20MB
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/plain',
      ],
      allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'],
      ...options,
    });
  }
}

/**
 * Pre-configured validation pipe for photo validation in tasks (5MB max, JPEG/PNG only)
 */
export class TaskPhotoValidationPipe extends FileValidationPipe {
  constructor(options: Partial<FileValidationOptions> = {}) {
    super({
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png'],
      allowedExtensions: ['jpg', 'jpeg', 'png'],
      sizeErrorMessage: 'Фото слишком большое. Максимальный размер: 5 МБ',
      typeErrorMessage: 'Допустимые форматы: JPEG, PNG',
      ...options,
    });
  }
}

/**
 * Pre-configured validation pipe for Excel/CSV imports (50MB max)
 */
export class ImportFileValidationPipe extends FileValidationPipe {
  constructor(options: Partial<FileValidationOptions> = {}) {
    super({
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
      ],
      allowedExtensions: ['xls', 'xlsx', 'csv'],
      ...options,
    });
  }
}
