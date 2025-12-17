import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Readable } from 'stream';
import { File } from './entities/file.entity';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3StorageService } from './s3-storage.service';

/**
 * Allowed MIME types for file uploads
 * Includes images, PDFs, and spreadsheets commonly used in VendHub operations
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
];

/**
 * Allowed file extensions corresponding to ALLOWED_MIME_TYPES
 */
const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.xls',
  '.xlsx',
  '.csv',
];

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly s3StorageService: S3StorageService,
  ) {
    this.logger.log('FilesService initialized with S3 storage');
  }

  /**
   * Загрузка файла в S3 storage
   */
  async uploadFile(
    file: Express.Multer.File,
    entityType: string,
    entityId: string,
    categoryCode: string,
    uploadedByUserId: string,
    description?: string,
    tags?: string[],
  ): Promise<File> {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Недопустимый тип файла: ${file.mimetype}. Разрешены: изображения (JPEG, PNG, WebP, GIF), PDF, Excel, CSV`,
      );
    }

    // Validate extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`Недопустимое расширение файла: ${ext}`);
    }

    // Валидация размера файла (макс 10MB по умолчанию)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760');
    if (file.size > maxSize) {
      throw new BadRequestException(
        `Размер файла превышает максимально допустимый (${maxSize / 1024 / 1024}MB)`,
      );
    }

    // Генерация S3 key (path)
    // Format: {entity_type}/{entity_id}/{category}/{timestamp}-{uuid}{ext}
    // Note: ext is already defined above during extension validation
    const filename = `${Date.now()}-${uuidv4()}${ext}`;
    const s3Key = `${entityType}/${entityId}/${categoryCode}/${filename}`;

    // Upload to S3
    await this.s3StorageService.uploadFile(
      s3Key,
      file.buffer,
      {
        contentType: file.mimetype,
        uploadedBy: uploadedByUserId,
        category: categoryCode,
        originalFilename: file.originalname,
      },
      file.mimetype,
    );

    this.logger.log(`File uploaded to S3: ${s3Key}`);

    // Create database record
    const fileEntity = this.fileRepository.create({
      original_filename: file.originalname,
      stored_filename: filename,
      file_path: s3Key, // S3 key instead of local path
      mime_type: file.mimetype,
      file_size: file.size,
      category_code: categoryCode,
      entity_type: entityType,
      entity_id: entityId,
      uploaded_by_user_id: uploadedByUserId,
      description,
      tags: tags || [],
      url: null, // Will be generated on-demand via getFileUrl()
    });

    return this.fileRepository.save(fileEntity);
  }

  /**
   * Get temporary signed URL for file access
   * @param fileId - File ID
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Signed URL
   */
  async getFileUrl(fileId: string, expiresIn: number = 3600): Promise<string> {
    const file = await this.findOne(fileId);
    return this.s3StorageService.getSignedUrl(file.file_path, expiresIn);
  }

  /**
   * Get file buffer from S3
   * @param fileId - File ID
   * @returns File buffer
   */
  async getFileBuffer(fileId: string): Promise<Buffer> {
    const file = await this.findOne(fileId);
    return this.s3StorageService.getFile(file.file_path);
  }

  /**
   * Get file stream from S3
   * @param fileId - File ID
   * @returns Readable stream
   */
  async getFileStream(fileId: string): Promise<Readable> {
    const file = await this.findOne(fileId);
    return this.s3StorageService.getFileStream(file.file_path);
  }

  /**
   * Получение всех файлов
   */
  async findAll(entityType?: string, entityId?: string, categoryCode?: string): Promise<File[]> {
    const query = this.fileRepository.createQueryBuilder('file');

    if (entityType) {
      query.andWhere('file.entity_type = :entityType', { entityType });
    }

    if (entityId) {
      query.andWhere('file.entity_id = :entityId', { entityId });
    }

    if (categoryCode) {
      query.andWhere('file.category_code = :categoryCode', { categoryCode });
    }

    query.orderBy('file.created_at', 'DESC');

    return query.getMany();
  }

  /**
   * Получение файла по ID
   */
  async findOne(id: string): Promise<File> {
    const file = await this.fileRepository.findOne({
      where: { id },
      relations: ['uploaded_by'],
    });

    if (!file) {
      throw new NotFoundException(`Файл с ID ${id} не найден`);
    }

    return file;
  }

  /**
   * Удаление файла из S3 и БД
   */
  async remove(id: string): Promise<void> {
    const file = await this.findOne(id);

    // Delete from S3
    try {
      await this.s3StorageService.deleteFile(file.file_path);
      this.logger.log(`File deleted from S3: ${file.file_path}`);
    } catch (error) {
      this.logger.error(`Error deleting file from S3: ${error.message}`);
      // Continue with DB deletion even if S3 delete fails
    }

    // Delete from database (soft delete)
    await this.fileRepository.softRemove(file);
  }

  /**
   * Получение файлов по сущности
   */
  async findByEntity(entityType: string, entityId: string): Promise<File[]> {
    return this.fileRepository.find({
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  /**
   * Получение файлов по категории для сущности
   */
  async findByEntityAndCategory(
    entityType: string,
    entityId: string,
    categoryCode: string,
  ): Promise<File[]> {
    return this.fileRepository.find({
      where: {
        entity_type: entityType,
        entity_id: entityId,
        category_code: categoryCode,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  /**
   * Проверка наличия фото ДО и ПОСЛЕ для задачи
   * КРИТИЧНО для системы согласно manual-operations.md
   */
  async validateTaskPhotos(taskId: string): Promise<{
    hasPhotoBefore: boolean;
    hasPhotoAfter: boolean;
    photosBefore: File[];
    photosAfter: File[];
  }> {
    const photosBefore = await this.findByEntityAndCategory('task', taskId, 'task_photo_before');

    const photosAfter = await this.findByEntityAndCategory('task', taskId, 'task_photo_after');

    return {
      hasPhotoBefore: photosBefore.length > 0,
      hasPhotoAfter: photosAfter.length > 0,
      photosBefore,
      photosAfter,
    };
  }

  /**
   * Статистика по файлам
   */
  async getStats() {
    const total = await this.fileRepository.count();

    const totalSize = await this.fileRepository
      .createQueryBuilder('file')
      .select('SUM(file.file_size)', 'size')
      .getRawOne();

    const byCategory = await this.fileRepository
      .createQueryBuilder('file')
      .select('file.category_code', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('file.category_code')
      .getRawMany();

    return {
      total,
      total_size_bytes: parseInt(totalSize.size) || 0,
      total_size_mb: (parseInt(totalSize.size) || 0) / 1024 / 1024,
      by_category: byCategory,
    };
  }
}
