import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let mockAuditLogService: jest.Mocked<AuditLogService>;

  const mockAuditLog = {
    id: 'log-1',
    event_type: 'LOGIN_SUCCESS',
    user_id: 'user-1',
    created_at: new Date(),
  };

  beforeEach(async () => {
    mockAuditLogService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    controller = module.get<AuditLogController>(AuditLogController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all audit logs', async () => {
      const logs = [mockAuditLog];
      mockAuditLogService.findAll.mockResolvedValue(logs as any);

      const queryDto: QueryAuditLogDto = {} as any;
      const result = await controller.findAll(queryDto);

      expect(result).toEqual(logs);
      expect(mockAuditLogService.findAll).toHaveBeenCalledWith(queryDto);
    });

    it('should pass filters to service', async () => {
      const logs = [mockAuditLog];
      mockAuditLogService.findAll.mockResolvedValue(logs as any);

      const queryDto: QueryAuditLogDto = {
        user_id: 'user-1',
        event_type: 'LOGIN_SUCCESS' as any,
      } as any;
      const result = await controller.findAll(queryDto);

      expect(result).toEqual(logs);
      expect(mockAuditLogService.findAll).toHaveBeenCalledWith(queryDto);
    });
  });

  describe('findOne', () => {
    it('should return a single audit log', async () => {
      mockAuditLogService.findOne.mockResolvedValue(mockAuditLog as any);

      const result = await controller.findOne('log-1');

      expect(result).toEqual(mockAuditLog);
      expect(mockAuditLogService.findOne).toHaveBeenCalledWith('log-1');
    });
  });
});
