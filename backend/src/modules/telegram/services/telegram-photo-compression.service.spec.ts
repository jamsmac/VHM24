import { Test, TestingModule } from '@nestjs/testing';
import { TelegramPhotoCompressionService } from './telegram-photo-compression.service';

// Create a mock factory that will be used by jest.mock
const mockSharpInstance = {
  metadata: jest.fn(),
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
};

jest.mock('sharp', () => {
  // Return a function that creates the mock instance
  const mockFn = jest.fn(() => mockSharpInstance);
  // Add __esModule for default export handling
  return {
    __esModule: true,
    default: mockFn,
  };
});

describe('TelegramPhotoCompressionService', () => {
  let service: TelegramPhotoCompressionService;

  beforeEach(async () => {
    // Reset all mock implementations
    jest.clearAllMocks();
    mockSharpInstance.metadata.mockReset();
    mockSharpInstance.resize.mockReset().mockReturnThis();
    mockSharpInstance.jpeg.mockReset().mockReturnThis();
    mockSharpInstance.toBuffer.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramPhotoCompressionService],
    }).compile();

    service = module.get<TelegramPhotoCompressionService>(TelegramPhotoCompressionService);
  });

  describe('compress', () => {
    it('should compress large image', async () => {
      const originalBuffer = Buffer.alloc(3 * 1024 * 1024); // 3 MB
      const compressedBuffer = Buffer.alloc(300 * 1024); // 300 KB

      mockSharpInstance.metadata.mockResolvedValue({ width: 4000, height: 3000 });
      mockSharpInstance.toBuffer.mockResolvedValue(compressedBuffer);

      const result = await service.compress(originalBuffer);

      expect(result).toBe(compressedBuffer);
      expect(mockSharpInstance.resize).toHaveBeenCalled();
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith(
        expect.objectContaining({
          quality: 80,
          progressive: true,
        }),
      );
    });

    it('should use custom options', async () => {
      const buffer = Buffer.alloc(1024);
      const compressedBuffer = Buffer.alloc(512);

      mockSharpInstance.metadata.mockResolvedValue({ width: 2000, height: 1500 });
      mockSharpInstance.toBuffer.mockResolvedValue(compressedBuffer);

      await service.compress(buffer, {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 75,
      });

      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith(expect.objectContaining({ quality: 75 }));
    });

    it('should return original on error', async () => {
      const buffer = Buffer.alloc(1024);
      mockSharpInstance.metadata.mockRejectedValue(new Error('Sharp error'));

      const result = await service.compress(buffer);

      expect(result).toBe(buffer);
    });

    it('should maintain aspect ratio for landscape images', async () => {
      const buffer = Buffer.alloc(1024);
      const compressedBuffer = Buffer.alloc(512);

      mockSharpInstance.metadata.mockResolvedValue({ width: 4000, height: 2000 });
      mockSharpInstance.toBuffer.mockResolvedValue(compressedBuffer);

      await service.compress(buffer);

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(
        1920, // max width
        expect.any(Number),
        expect.any(Object),
      );
    });

    it('should maintain aspect ratio for portrait images', async () => {
      const buffer = Buffer.alloc(1024);
      const compressedBuffer = Buffer.alloc(512);

      mockSharpInstance.metadata.mockResolvedValue({ width: 1500, height: 3000 });
      mockSharpInstance.toBuffer.mockResolvedValue(compressedBuffer);

      await service.compress(buffer);

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(
        expect.any(Number),
        1080, // max height
        expect.any(Object),
      );
    });

    it('should not resize if image is smaller than limits', async () => {
      const buffer = Buffer.alloc(1024);
      const compressedBuffer = Buffer.alloc(512);

      mockSharpInstance.metadata.mockResolvedValue({ width: 800, height: 600 });
      mockSharpInstance.toBuffer.mockResolvedValue(compressedBuffer);

      await service.compress(buffer);

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(800, 600, expect.any(Object));
    });
  });

  describe('compressMultiple', () => {
    it('should compress multiple photos in parallel', async () => {
      const buffers = [Buffer.alloc(1024), Buffer.alloc(2048), Buffer.alloc(3072)];
      const compressedBuffer = Buffer.alloc(256);

      mockSharpInstance.metadata.mockResolvedValue({ width: 1920, height: 1080 });
      mockSharpInstance.toBuffer.mockResolvedValue(compressedBuffer);

      const results = await service.compressMultiple(buffers);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBe(compressedBuffer);
      });
    });
  });

  describe('needsCompression', () => {
    it('should return true for large files', async () => {
      const buffer = Buffer.alloc(600 * 1024); // 600 KB
      mockSharpInstance.metadata.mockResolvedValue({ width: 1000, height: 800 });

      const result = await service.needsCompression(buffer);

      expect(result).toBe(true);
    });

    it('should return true for oversized dimensions', async () => {
      const buffer = Buffer.alloc(100 * 1024); // Small file
      mockSharpInstance.metadata.mockResolvedValue({ width: 4000, height: 3000 });

      const result = await service.needsCompression(buffer);

      expect(result).toBe(true);
    });

    it('should return false for small files with acceptable dimensions', async () => {
      const buffer = Buffer.alloc(100 * 1024); // 100 KB
      mockSharpInstance.metadata.mockResolvedValue({ width: 800, height: 600 });

      const result = await service.needsCompression(buffer);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const buffer = Buffer.alloc(1024);
      mockSharpInstance.metadata.mockRejectedValue(new Error('Invalid image'));

      const result = await service.needsCompression(buffer);

      expect(result).toBe(false);
    });

    it('should return true when width exceeds max', async () => {
      const buffer = Buffer.alloc(100 * 1024);
      mockSharpInstance.metadata.mockResolvedValue({ width: 2000, height: 800 });

      const result = await service.needsCompression(buffer);

      expect(result).toBe(true);
    });

    it('should return true when height exceeds max', async () => {
      const buffer = Buffer.alloc(100 * 1024);
      mockSharpInstance.metadata.mockResolvedValue({ width: 800, height: 1200 });

      const result = await service.needsCompression(buffer);

      expect(result).toBe(true);
    });
  });

  describe('getCompressionStats', () => {
    it('should return compression statistics', async () => {
      const originalBuffer = Buffer.alloc(1000);
      const compressedBuffer = Buffer.alloc(200);

      mockSharpInstance.metadata.mockResolvedValue({ width: 1920, height: 1080 });
      mockSharpInstance.toBuffer.mockResolvedValue(compressedBuffer);

      const stats = await service.getCompressionStats(originalBuffer);

      expect(stats.originalSize).toBe(1000);
      expect(stats.estimatedCompressedSize).toBe(200);
      expect(stats.estimatedSavings).toBe(800);
      expect(stats.estimatedSavingsPercent).toBe(80);
    });

    it('should return zero savings on error', async () => {
      const buffer = Buffer.alloc(1000);
      mockSharpInstance.metadata.mockRejectedValue(new Error('Error'));

      const stats = await service.getCompressionStats(buffer);

      expect(stats.originalSize).toBe(1000);
      expect(stats.estimatedCompressedSize).toBe(1000);
      expect(stats.estimatedSavings).toBe(0);
      expect(stats.estimatedSavingsPercent).toBe(0);
    });
  });

  describe('createThumbnail', () => {
    it('should create thumbnail with default size', async () => {
      const buffer = Buffer.alloc(1024);
      const thumbnailBuffer = Buffer.alloc(50);

      mockSharpInstance.toBuffer.mockResolvedValue(thumbnailBuffer);

      const result = await service.createThumbnail(buffer);

      expect(result).toBe(thumbnailBuffer);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(200, 200, expect.any(Object));
    });

    it('should create thumbnail with custom size', async () => {
      const buffer = Buffer.alloc(1024);
      const thumbnailBuffer = Buffer.alloc(30);

      mockSharpInstance.toBuffer.mockResolvedValue(thumbnailBuffer);

      const result = await service.createThumbnail(buffer, 100);

      expect(result).toBe(thumbnailBuffer);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(100, 100, expect.any(Object));
    });

    it('should return original on error', async () => {
      const buffer = Buffer.alloc(1024);
      mockSharpInstance.resize.mockImplementation(() => {
        throw new Error('Resize error');
      });

      const result = await service.createThumbnail(buffer);

      expect(result).toBe(buffer);
    });
  });

  describe('isValidImage', () => {
    it('should return true for valid image', async () => {
      mockSharpInstance.metadata.mockResolvedValue({ width: 100, height: 100 });

      const result = await service.isValidImage(Buffer.alloc(100));

      expect(result).toBe(true);
    });

    it('should return false for invalid image', async () => {
      mockSharpInstance.metadata.mockRejectedValue(new Error('Invalid'));

      const result = await service.isValidImage(Buffer.alloc(100));

      expect(result).toBe(false);
    });

    it('should return false when dimensions are missing', async () => {
      mockSharpInstance.metadata.mockResolvedValue({});

      const result = await service.isValidImage(Buffer.alloc(100));

      expect(result).toBe(false);
    });

    it('should return false when width is missing', async () => {
      mockSharpInstance.metadata.mockResolvedValue({ height: 100 });

      const result = await service.isValidImage(Buffer.alloc(100));

      expect(result).toBe(false);
    });

    it('should return false when height is missing', async () => {
      mockSharpInstance.metadata.mockResolvedValue({ width: 100 });

      const result = await service.isValidImage(Buffer.alloc(100));

      expect(result).toBe(false);
    });
  });

  describe('getMetadata', () => {
    it('should return image metadata', async () => {
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg',
      });

      const buffer = Buffer.alloc(5000);
      const metadata = await service.getMetadata(buffer);

      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
      expect(metadata.format).toBe('jpeg');
      expect(metadata.size).toBe(5000);
    });

    it('should return only size on error', async () => {
      mockSharpInstance.metadata.mockRejectedValue(new Error('Error'));

      const buffer = Buffer.alloc(3000);
      const metadata = await service.getMetadata(buffer);

      expect(metadata.size).toBe(3000);
      expect(metadata.width).toBeUndefined();
    });
  });

  describe('estimateMonthlySavings', () => {
    it('should calculate monthly savings', () => {
      const savings = service.estimateMonthlySavings(100, 3, 0.023);

      expect(savings.originalCostPerMonth).toBeGreaterThan(0);
      expect(savings.compressedCostPerMonth).toBeGreaterThan(0);
      expect(savings.savingsPerMonth).toBeGreaterThan(0);
      expect(savings.savingsPercent).toBe(95);
    });

    it('should use default cost when not provided', () => {
      const savings = service.estimateMonthlySavings(100, 3);

      expect(savings.savingsPerMonth).toBeGreaterThan(0);
    });

    it('should calculate for high volume', () => {
      const savings = service.estimateMonthlySavings(500, 5, 0.023);

      // 500 photos/day * 5MB * 30 days = 75 GB/month
      expect(savings.originalCostPerMonth).toBeGreaterThan(1);
      expect(savings.savingsPercent).toBe(95);
    });

    it('should calculate correct savings for edge case', () => {
      const savings = service.estimateMonthlySavings(0, 0, 0.023);

      expect(savings.originalCostPerMonth).toBe(0);
      expect(savings.compressedCostPerMonth).toBe(0);
      expect(savings.savingsPerMonth).toBe(0);
    });
  });
});
