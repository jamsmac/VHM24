import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status with current timestamp', () => {
      const result = service.getHealth();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('VendHub Manager API');
      expect(result.timestamp).toBeDefined();
      // Timestamp should be a valid ISO string
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('getInfo', () => {
    it('should return API information', () => {
      const result = service.getInfo();

      expect(result.name).toBe('VendHub Manager API');
      expect(result.version).toBe('1.0.0');
      expect(result.description).toContain('Vending Machine Management System');
      expect(result.documentation).toBe('/api/docs');
    });

    it('should return correct architecture details', () => {
      const result = service.getInfo();

      expect(result.architecture).toBeDefined();
      expect(result.architecture.type).toBe('manual-operations');
      expect(result.architecture.machineIntegration).toBe(false);
      expect(result.architecture.dataSource).toBe('operator-actions-and-imports');
    });
  });
});
