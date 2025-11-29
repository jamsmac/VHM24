import { Test, TestingModule } from '@nestjs/testing';
import { S3StorageService } from './s3-storage.service';
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/lib-storage');
jest.mock('@aws-sdk/s3-request-presigner');

describe('S3StorageService', () => {
  let service: S3StorageService;
  let mockSend: jest.Mock;

  beforeEach(async () => {
    // Reset environment variables for testing
    process.env.S3_BUCKET = 'test-bucket';
    process.env.S3_REGION = 'auto';
    process.env.S3_ENDPOINT = 'https://test.r2.cloudflarestorage.com';
    process.env.S3_ACCESS_KEY = 'test-access-key';
    process.env.S3_SECRET_KEY = 'test-secret-key';
    process.env.S3_PUBLIC_URL = 'https://cdn.example.com';

    // Reset mocks
    jest.clearAllMocks();

    // Mock S3Client send method
    mockSend = jest.fn();

    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [S3StorageService],
    }).compile();

    service = module.get<S3StorageService>(S3StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.S3_PUBLIC_URL;
  });

  describe('uploadFile', () => {
    it('should upload file to S3 successfully', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      const file = Buffer.from('test file content');
      const metadata = { uploadedBy: 'user-123' };
      const contentType = 'image/jpeg';

      (Upload as unknown as jest.Mock).mockImplementation(() => ({
        done: jest.fn().mockResolvedValue(undefined),
      }));

      // Act
      const result = await service.uploadFile(key, file, metadata, contentType);

      // Assert
      expect(result).toBe(key);
      expect(Upload).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: key,
            Body: file,
            ContentType: contentType,
            Metadata: metadata,
          }),
        }),
      );
    });

    it('should throw error when upload fails', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      const file = Buffer.from('test file content');

      (Upload as unknown as jest.Mock).mockImplementation(() => ({
        done: jest.fn().mockRejectedValue(new Error('Upload failed')),
      }));

      // Act & Assert
      await expect(service.uploadFile(key, file)).rejects.toThrow('Upload failed');
    });

    it('should upload with default empty metadata', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      const file = Buffer.from('test file content');

      (Upload as unknown as jest.Mock).mockImplementation(() => ({
        done: jest.fn().mockResolvedValue(undefined),
      }));

      // Act
      await service.uploadFile(key, file);

      // Assert
      expect(Upload).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Metadata: {},
          }),
        }),
      );
    });
  });

  describe('getFile', () => {
    it('should get file from S3 as buffer', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      const fileContent = 'test file content';

      const mockStream = Readable.from([Buffer.from(fileContent)]);
      mockSend.mockResolvedValue({
        Body: mockStream,
      });

      // Act
      const result = await service.getFile(key);

      // Assert
      expect(result.toString()).toBe(fileContent);
      expect(mockSend).toHaveBeenCalledWith(expect.any(GetObjectCommand));
    });

    it('should throw error when file not found', async () => {
      // Arrange
      const key = 'non-existent/file.jpg';
      mockSend.mockRejectedValue(new Error('NoSuchKey'));

      // Act & Assert
      await expect(service.getFile(key)).rejects.toThrow('NoSuchKey');
    });
  });

  describe('getFileStream', () => {
    it('should return readable stream from S3', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      const mockStream = Readable.from(['test']);

      mockSend.mockResolvedValue({
        Body: mockStream,
      });

      // Act
      const result = await service.getFileStream(key);

      // Assert
      expect(result).toBeInstanceOf(Readable);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should throw error when stream fails', async () => {
      // Arrange
      const key = 'non-existent/file.jpg';
      mockSend.mockRejectedValue(new Error('Stream error'));

      // Act & Assert
      await expect(service.getFileStream(key)).rejects.toThrow('Stream error');
    });
  });

  describe('getSignedUrl', () => {
    it('should return signed URL with default expiration', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      const signedUrl = 'https://signed-url.example.com/photo.jpg?signature=abc123';

      (getSignedUrl as jest.Mock).mockResolvedValue(signedUrl);

      // Act
      const result = await service.getSignedUrl(key);

      // Assert
      expect(result).toBe(signedUrl);
      expect(getSignedUrl).toHaveBeenCalledWith(expect.any(Object), expect.any(GetObjectCommand), {
        expiresIn: 3600,
      });
    });

    it('should return signed URL with custom expiration', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      const signedUrl = 'https://signed-url.example.com/photo.jpg';
      const expiresIn = 7200;

      (getSignedUrl as jest.Mock).mockResolvedValue(signedUrl);

      // Act
      const result = await service.getSignedUrl(key, expiresIn);

      // Assert
      expect(result).toBe(signedUrl);
      expect(getSignedUrl).toHaveBeenCalledWith(expect.any(Object), expect.any(GetObjectCommand), {
        expiresIn: 7200,
      });
    });

    it('should throw error when signing fails', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('Signing failed'));

      // Act & Assert
      await expect(service.getSignedUrl(key)).rejects.toThrow('Signing failed');
    });
  });

  describe('getPublicUrl', () => {
    it('should return public URL with CDN base', () => {
      // Act
      const result = service.getPublicUrl('task/task-123/photo.jpg');

      // Assert
      expect(result).toBe('https://cdn.example.com/task/task-123/photo.jpg');
    });

    it('should return endpoint-based URL when no CDN configured', () => {
      // Arrange - Remove public URL
      delete process.env.S3_PUBLIC_URL;
      const newService = new S3StorageService();

      // Act
      const result = newService.getPublicUrl('task/task-123/photo.jpg');

      // Assert
      expect(result).toContain('test-bucket');
      expect(result).toContain('task/task-123/photo.jpg');
    });
  });

  describe('deleteFile', () => {
    it('should delete file from S3 successfully', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      mockSend.mockResolvedValue({});

      // Act
      await service.deleteFile(key);

      // Assert
      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('should throw error when delete fails', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      mockSend.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(service.deleteFile(key)).rejects.toThrow('Delete failed');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      mockSend.mockResolvedValue({});

      // Act
      const result = await service.fileExists(key);

      // Assert
      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
    });

    it('should return false when file not found (NotFound error)', async () => {
      // Arrange
      const key = 'non-existent/file.jpg';
      const notFoundError = new Error('NotFound');
      (notFoundError as any).name = 'NotFound';
      mockSend.mockRejectedValue(notFoundError);

      // Act
      const result = await service.fileExists(key);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when file not found (404 status)', async () => {
      // Arrange
      const key = 'non-existent/file.jpg';
      const notFoundError = new Error('Not Found');
      (notFoundError as any).$metadata = { httpStatusCode: 404 };
      mockSend.mockRejectedValue(notFoundError);

      // Act
      const result = await service.fileExists(key);

      // Assert
      expect(result).toBe(false);
    });

    it('should throw error for non-404 errors', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      mockSend.mockRejectedValue(new Error('Internal error'));

      // Act & Assert
      await expect(service.fileExists(key)).rejects.toThrow('Internal error');
    });
  });

  describe('getFileMetadata', () => {
    it('should return file metadata', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      const mockMetadata = {
        ContentLength: 1024000,
        ContentType: 'image/jpeg',
        LastModified: new Date('2025-01-15'),
        Metadata: { uploadedBy: 'user-123' },
      };
      mockSend.mockResolvedValue(mockMetadata);

      // Act
      const result = await service.getFileMetadata(key);

      // Assert
      expect(result).toEqual({
        size: 1024000,
        contentType: 'image/jpeg',
        lastModified: new Date('2025-01-15'),
        metadata: { uploadedBy: 'user-123' },
      });
    });

    it('should return default values for missing metadata', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      mockSend.mockResolvedValue({});

      // Act
      const result = await service.getFileMetadata(key);

      // Assert
      expect(result.size).toBe(0);
      expect(result.contentType).toBe('application/octet-stream');
      expect(result.metadata).toEqual({});
    });

    it('should throw error when metadata fetch fails', async () => {
      // Arrange
      const key = 'task/task-123/photo.jpg';
      mockSend.mockRejectedValue(new Error('Metadata error'));

      // Act & Assert
      await expect(service.getFileMetadata(key)).rejects.toThrow('Metadata error');
    });
  });

  describe('copyFile', () => {
    it('should copy file from source to destination', async () => {
      // Arrange
      const sourceKey = 'task/task-123/original.jpg';
      const destKey = 'task/task-456/copy.jpg';
      const fileContent = Buffer.from('test content');

      // Mock getFile
      const mockStream = Readable.from([fileContent]);
      mockSend.mockImplementation((command: any) => {
        if (command instanceof GetObjectCommand) {
          return Promise.resolve({ Body: mockStream });
        }
        if (command instanceof HeadObjectCommand) {
          return Promise.resolve({
            ContentLength: 100,
            ContentType: 'image/jpeg',
            LastModified: new Date(),
            Metadata: {},
          });
        }
        return Promise.resolve({});
      });

      (Upload as unknown as jest.Mock).mockImplementation(() => ({
        done: jest.fn().mockResolvedValue(undefined),
      }));

      // Act
      await service.copyFile(sourceKey, destKey);

      // Assert
      expect(Upload).toHaveBeenCalled();
    });

    it('should throw error when source file not found', async () => {
      // Arrange
      const sourceKey = 'non-existent/file.jpg';
      const destKey = 'task/task-456/copy.jpg';
      mockSend.mockRejectedValue(new Error('NoSuchKey'));

      // Act & Assert
      await expect(service.copyFile(sourceKey, destKey)).rejects.toThrow('NoSuchKey');
    });
  });

  describe('moveFile', () => {
    it('should move file (copy + delete)', async () => {
      // Arrange
      const sourceKey = 'task/task-123/original.jpg';
      const destKey = 'task/task-456/moved.jpg';
      const fileContent = Buffer.from('test content');

      const mockStream = Readable.from([fileContent]);
      mockSend.mockImplementation((command: any) => {
        if (command instanceof GetObjectCommand) {
          return Promise.resolve({ Body: mockStream });
        }
        if (command instanceof HeadObjectCommand) {
          return Promise.resolve({
            ContentLength: 100,
            ContentType: 'image/jpeg',
            LastModified: new Date(),
            Metadata: {},
          });
        }
        return Promise.resolve({});
      });

      (Upload as unknown as jest.Mock).mockImplementation(() => ({
        done: jest.fn().mockResolvedValue(undefined),
      }));

      // Act
      await service.moveFile(sourceKey, destKey);

      // Assert
      expect(Upload).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });
  });

  describe('initialization', () => {
    it('should initialize with correct bucket name', () => {
      // Assert
      expect((service as any).bucket).toBe('test-bucket');
    });

    it('should use default bucket name when not configured', () => {
      // Arrange
      delete process.env.S3_BUCKET;
      const newService = new S3StorageService();

      // Assert
      expect((newService as any).bucket).toBe('vendhub');

      // Cleanup
      process.env.S3_BUCKET = 'test-bucket';
    });
  });
});
