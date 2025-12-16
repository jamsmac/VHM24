import { Test, TestingModule } from '@nestjs/testing';
import { RateLimiterService } from './rate-limiter.service';
import { Cache } from 'cache-manager';

describe('RateLimiterService', () => {
  let service: RateLimiterService;
  let cacheManager: Cache;

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterService,
        {
          provide: 'CACHE_MANAGER',
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
    cacheManager = module.get('CACHE_MANAGER');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with default rules', () => {
    const rules = service.getRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some(rule => rule.endpoint === '/auth/login')).toBe(true);
  });

  it('should add custom rule', () => {
    const initialCount = service.getRules().length;
    service.addRule({
      endpoint: '/test',
      method: 'POST',
      limit: 10,
      windowMs: 60000,
    });
    expect(service.getRules().length).toBe(initialCount + 1);
  });

  it('should remove rule', () => {
    service.addRule({
      endpoint: '/test-remove',
      method: 'POST',
      limit: 10,
      windowMs: 60000,
    });
    const initialCount = service.getRules().length;
    service.removeRule('/test-remove', 'POST');
    expect(service.getRules().length).toBe(initialCount - 1);
  });

  it('should allow requests when no rules match', async () => {
    const result = await service.checkRateLimit(
      'user:123',
      '/unknown-endpoint',
      'GET'
    );
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(-1);
  });

  it('should skip rate limiting for exempt roles', async () => {
    const result = await service.checkRateLimit(
      'user:123',
      '/api/admin',
      'GET',
      'super-admin'
    );
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(-1);
  });
});
