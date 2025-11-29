import { createWinstonLogger } from './winston.config';

describe('Winston Config', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('createWinstonLogger', () => {
    it('should create a logger instance', () => {
      const logger = createWinstonLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.log).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should create logger in development mode', () => {
      process.env.NODE_ENV = 'development';

      const logger = createWinstonLogger();

      expect(logger).toBeDefined();
    });

    it('should create logger in production mode', () => {
      process.env.NODE_ENV = 'production';

      const logger = createWinstonLogger();

      expect(logger).toBeDefined();
    });

    it('should handle undefined NODE_ENV as development', () => {
      delete process.env.NODE_ENV;

      const logger = createWinstonLogger();

      expect(logger).toBeDefined();
    });

    it('should return a logger that can log messages', () => {
      const logger = createWinstonLogger();

      // These should not throw
      expect(() => logger.log('Test info message')).not.toThrow();
      expect(() => logger.warn('Test warning message')).not.toThrow();
      expect(() => logger.error('Test error message')).not.toThrow();
    });
  });
});
