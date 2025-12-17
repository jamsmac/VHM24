import { BadRequestException } from '@nestjs/common';
import {
  FileValidationPipe,
  ImageValidationPipe,
  DocumentValidationPipe,
  TaskPhotoValidationPipe,
  ImportFileValidationPipe,
} from './file-validation.pipe';

describe('FileValidationPipe', () => {
  let pipe: FileValidationPipe;

  const createMockFile = (
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 1024, // 1MB
    destination: '/tmp',
    filename: 'test.jpg',
    path: '/tmp/test.jpg',
    buffer: Buffer.from('test'),
    stream: undefined as any,
    ...overrides,
  });

  beforeEach(() => {
    pipe = new FileValidationPipe();
  });

  describe('basic validation', () => {
    it('should pass valid file', () => {
      const file = createMockFile();
      const result = pipe.transform(file, { type: 'custom' });
      expect(result).toBe(file);
    });

    it('should throw when file is required but not provided', () => {
      expect(() => pipe.transform(undefined, { type: 'custom' })).toThrow(
        BadRequestException,
      );
    });

    it('should return undefined when file not required and not provided', () => {
      const optionalPipe = new FileValidationPipe({ required: false });
      const result = optionalPipe.transform(undefined, { type: 'custom' });
      expect(result).toBeUndefined();
    });
  });

  describe('size validation', () => {
    it('should pass file under size limit', () => {
      const file = createMockFile({ size: 5 * 1024 * 1024 }); // 5MB
      expect(() => pipe.transform(file, { type: 'custom' })).not.toThrow();
    });

    it('should pass file at exactly the size limit', () => {
      const file = createMockFile({ size: 10 * 1024 * 1024 }); // 10MB
      expect(() => pipe.transform(file, { type: 'custom' })).not.toThrow();
    });

    it('should throw for file over size limit', () => {
      const file = createMockFile({ size: 11 * 1024 * 1024 }); // 11MB
      expect(() => pipe.transform(file, { type: 'custom' })).toThrow(
        BadRequestException,
      );
    });

    it('should use custom size limit', () => {
      const customPipe = new FileValidationPipe({ maxSize: 1024 }); // 1KB
      const file = createMockFile({ size: 2048 }); // 2KB
      expect(() => customPipe.transform(file, { type: 'custom' })).toThrow(
        BadRequestException,
      );
    });

    it('should use custom size error message', () => {
      const customPipe = new FileValidationPipe({
        maxSize: 1024,
        sizeErrorMessage: 'Custom size error',
      });
      const file = createMockFile({ size: 2048 });

      try {
        customPipe.transform(file, { type: 'custom' });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).message).toBe('Custom size error');
      }
    });
  });

  describe('MIME type validation', () => {
    it('should pass valid MIME type', () => {
      const file = createMockFile({ mimetype: 'image/png' });
      expect(() => pipe.transform(file, { type: 'custom' })).not.toThrow();
    });

    it('should throw for invalid MIME type', () => {
      const file = createMockFile({ mimetype: 'application/exe' });
      expect(() => pipe.transform(file, { type: 'custom' })).toThrow(
        BadRequestException,
      );
    });

    it('should use custom allowed MIME types', () => {
      const customPipe = new FileValidationPipe({
        allowedMimeTypes: ['text/plain'],
      });
      const file = createMockFile({ mimetype: 'image/jpeg' });
      expect(() => customPipe.transform(file, { type: 'custom' })).toThrow(
        BadRequestException,
      );
    });

    it('should skip MIME validation when array is empty', () => {
      const customPipe = new FileValidationPipe({ allowedMimeTypes: [] });
      const file = createMockFile({ mimetype: 'application/whatever' });
      expect(() => customPipe.transform(file, { type: 'custom' })).not.toThrow();
    });
  });

  describe('extension validation', () => {
    it('should pass valid extension', () => {
      const file = createMockFile({ originalname: 'test.png' });
      expect(() => pipe.transform(file, { type: 'custom' })).not.toThrow();
    });

    it('should throw for invalid extension', () => {
      const file = createMockFile({ originalname: 'test.exe' });
      expect(() => pipe.transform(file, { type: 'custom' })).toThrow(
        BadRequestException,
      );
    });

    it('should handle files without extension', () => {
      const file = createMockFile({ originalname: 'noextension' });
      expect(() => pipe.transform(file, { type: 'custom' })).toThrow(
        BadRequestException,
      );
    });

    it('should be case-insensitive for extensions', () => {
      const file = createMockFile({ originalname: 'test.JPG' });
      expect(() => pipe.transform(file, { type: 'custom' })).not.toThrow();
    });

    it('should skip extension validation when array is empty', () => {
      const customPipe = new FileValidationPipe({ allowedExtensions: [] });
      const file = createMockFile({ originalname: 'test.xyz' });
      expect(() => customPipe.transform(file, { type: 'custom' })).not.toThrow();
    });
  });
});

describe('ImageValidationPipe', () => {
  let pipe: ImageValidationPipe;

  beforeEach(() => {
    pipe = new ImageValidationPipe();
  });

  it('should accept JPEG images', () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      destination: '/tmp',
      filename: 'photo.jpg',
      path: '/tmp/photo.jpg',
      buffer: Buffer.from('test'),
      stream: undefined as any,
    };

    expect(() => pipe.transform(file, { type: 'custom' })).not.toThrow();
  });

  it('should reject PDF files', () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'document.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024 * 1024,
      destination: '/tmp',
      filename: 'document.pdf',
      path: '/tmp/document.pdf',
      buffer: Buffer.from('test'),
      stream: undefined as any,
    };

    expect(() => pipe.transform(file, { type: 'custom' })).toThrow(BadRequestException);
  });

  it('should reject images over 5MB', () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'large.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 6 * 1024 * 1024, // 6MB
      destination: '/tmp',
      filename: 'large.jpg',
      path: '/tmp/large.jpg',
      buffer: Buffer.from('test'),
      stream: undefined as any,
    };

    expect(() => pipe.transform(file, { type: 'custom' })).toThrow(BadRequestException);
  });
});

describe('DocumentValidationPipe', () => {
  let pipe: DocumentValidationPipe;

  beforeEach(() => {
    pipe = new DocumentValidationPipe();
  });

  it('should accept PDF files', () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'document.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024 * 1024,
      destination: '/tmp',
      filename: 'document.pdf',
      path: '/tmp/document.pdf',
      buffer: Buffer.from('test'),
      stream: undefined as any,
    };

    expect(() => pipe.transform(file, { type: 'custom' })).not.toThrow();
  });

  it('should accept Excel files', () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'data.xlsx',
      encoding: '7bit',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 1024 * 1024,
      destination: '/tmp',
      filename: 'data.xlsx',
      path: '/tmp/data.xlsx',
      buffer: Buffer.from('test'),
      stream: undefined as any,
    };

    expect(() => pipe.transform(file, { type: 'custom' })).not.toThrow();
  });

  it('should accept up to 20MB', () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'document.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 20 * 1024 * 1024, // 20MB
      destination: '/tmp',
      filename: 'document.pdf',
      path: '/tmp/document.pdf',
      buffer: Buffer.from('test'),
      stream: undefined as any,
    };

    expect(() => pipe.transform(file, { type: 'custom' })).not.toThrow();
  });
});

describe('TaskPhotoValidationPipe', () => {
  let pipe: TaskPhotoValidationPipe;

  beforeEach(() => {
    pipe = new TaskPhotoValidationPipe();
  });

  it('should accept JPEG photos', () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'task_photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 2 * 1024 * 1024, // 2MB
      destination: '/tmp',
      filename: 'task_photo.jpg',
      path: '/tmp/task_photo.jpg',
      buffer: Buffer.from('test'),
      stream: undefined as any,
    };

    expect(() => pipe.transform(file, { type: 'custom' })).not.toThrow();
  });

  it('should reject GIF images (only JPEG/PNG allowed)', () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'task_photo.gif',
      encoding: '7bit',
      mimetype: 'image/gif',
      size: 1024 * 1024,
      destination: '/tmp',
      filename: 'task_photo.gif',
      path: '/tmp/task_photo.gif',
      buffer: Buffer.from('test'),
      stream: undefined as any,
    };

    expect(() => pipe.transform(file, { type: 'custom' })).toThrow(BadRequestException);
  });

  it('should use Russian error messages', () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'large.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 6 * 1024 * 1024, // 6MB (over 5MB limit)
      destination: '/tmp',
      filename: 'large.jpg',
      path: '/tmp/large.jpg',
      buffer: Buffer.from('test'),
      stream: undefined as any,
    };

    try {
      pipe.transform(file, { type: 'custom' });
      fail('Should have thrown');
    } catch (error) {
      expect((error as BadRequestException).message).toContain('5 МБ');
    }
  });
});

describe('ImportFileValidationPipe', () => {
  let pipe: ImportFileValidationPipe;

  beforeEach(() => {
    pipe = new ImportFileValidationPipe();
  });

  it('should accept Excel files', () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'sales_data.xlsx',
      encoding: '7bit',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 10 * 1024 * 1024, // 10MB
      destination: '/tmp',
      filename: 'sales_data.xlsx',
      path: '/tmp/sales_data.xlsx',
      buffer: Buffer.from('test'),
      stream: undefined as any,
    };

    expect(() => pipe.transform(file, { type: 'custom' })).not.toThrow();
  });

  it('should accept CSV files', () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'data.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      size: 5 * 1024 * 1024,
      destination: '/tmp',
      filename: 'data.csv',
      path: '/tmp/data.csv',
      buffer: Buffer.from('test'),
      stream: undefined as any,
    };

    expect(() => pipe.transform(file, { type: 'custom' })).not.toThrow();
  });

  it('should accept up to 50MB', () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'large_data.xlsx',
      encoding: '7bit',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 50 * 1024 * 1024, // 50MB
      destination: '/tmp',
      filename: 'large_data.xlsx',
      path: '/tmp/large_data.xlsx',
      buffer: Buffer.from('test'),
      stream: undefined as any,
    };

    expect(() => pipe.transform(file, { type: 'custom' })).not.toThrow();
  });

  it('should reject files over 50MB', () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'huge_data.xlsx',
      encoding: '7bit',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 51 * 1024 * 1024, // 51MB
      destination: '/tmp',
      filename: 'huge_data.xlsx',
      path: '/tmp/huge_data.xlsx',
      buffer: Buffer.from('test'),
      stream: undefined as any,
    };

    expect(() => pipe.transform(file, { type: 'custom' })).toThrow(BadRequestException);
  });
});
