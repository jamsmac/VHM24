import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

/**
 * S3 Storage Service
 * Works with Cloudflare R2 and any S3-compatible storage
 *
 * Environment variables:
 * - S3_ENDPOINT: S3 endpoint URL (for R2: https://<account-id>.r2.cloudflarestorage.com)
 * - S3_BUCKET: Bucket name
 * - S3_ACCESS_KEY: Access key ID
 * - S3_SECRET_KEY: Secret access key
 * - S3_REGION: Region (for R2: auto)
 * - S3_PUBLIC_URL: Optional public URL base (for CDN)
 */
@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicUrlBase?: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'vendhub';
    this.publicUrlBase = process.env.S3_PUBLIC_URL;

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
      forcePathStyle: true, // Required for Cloudflare R2 and MinIO
    });

    this.logger.log(
      `S3StorageService initialized. Bucket: ${this.bucket}, Endpoint: ${process.env.S3_ENDPOINT || 'AWS'}`,
    );
  }

  /**
   * Upload file to S3
   * @param key - S3 object key (path)
   * @param file - File buffer
   * @param metadata - Optional metadata
   * @param contentType - MIME type
   * @returns S3 object key
   */
  async uploadFile(
    key: string,
    file: Buffer,
    metadata: Record<string, string> = {},
    contentType?: string,
  ): Promise<string> {
    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: file,
          ContentType: contentType,
          Metadata: metadata,
        },
      });

      await upload.done();
      this.logger.log(`File uploaded successfully: ${key}`);

      return key;
    } catch (error) {
      this.logger.error(`Failed to upload file ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get file from S3 as Buffer
   * @param key - S3 object key
   * @returns File buffer
   */
  async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as Readable;

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`Failed to get file ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get file stream from S3
   * @param key - S3 object key
   * @returns Readable stream
   */
  async getFileStream(key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return response.Body as Readable;
    } catch (error) {
      this.logger.error(`Failed to get file stream ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get signed URL for temporary access
   * @param key - S3 object key
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Signed URL
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get public URL (if bucket/CDN is public)
   * @param key - S3 object key
   * @returns Public URL
   */
  getPublicUrl(key: string): string {
    if (this.publicUrlBase) {
      return `${this.publicUrlBase}/${key}`;
    }

    // Fallback to endpoint-based URL
    const endpoint = process.env.S3_ENDPOINT || `https://s3.${process.env.S3_REGION}.amazonaws.com`;
    return `${endpoint}/${this.bucket}/${key}`;
  }

  /**
   * Delete file from S3
   * @param key - S3 object key
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if file exists in S3
   * @param key - S3 object key
   * @returns true if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      this.logger.error(`Failed to check file existence ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param key - S3 object key
   * @returns File metadata
   */
  async getFileMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    metadata: Record<string, string>;
  }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
        metadata: response.Metadata || {},
      };
    } catch (error) {
      this.logger.error(`Failed to get file metadata ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Copy file within S3
   * @param sourceKey - Source object key
   * @param destKey - Destination object key
   */
  async copyFile(sourceKey: string, destKey: string): Promise<void> {
    try {
      // Get source file
      const sourceBuffer = await this.getFile(sourceKey);
      const metadata = await this.getFileMetadata(sourceKey);

      // Upload to new location
      await this.uploadFile(destKey, sourceBuffer, metadata.metadata, metadata.contentType);

      this.logger.log(`File copied from ${sourceKey} to ${destKey}`);
    } catch (error) {
      this.logger.error(`Failed to copy file from ${sourceKey} to ${destKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Move file within S3 (copy + delete)
   * @param sourceKey - Source object key
   * @param destKey - Destination object key
   */
  async moveFile(sourceKey: string, destKey: string): Promise<void> {
    try {
      await this.copyFile(sourceKey, destKey);
      await this.deleteFile(sourceKey);
      this.logger.log(`File moved from ${sourceKey} to ${destKey}`);
    } catch (error) {
      this.logger.error(`Failed to move file from ${sourceKey} to ${destKey}: ${error.message}`);
      throw error;
    }
  }
}
