import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningAgent } from '../agents/learning.agent';
import { ImportTemplate } from '../entities/import-template.entity';
import { ImportSession } from '../entities/import-session.entity';
import { AgentStatus } from '../interfaces/agent.interface';
import { DomainType } from '../interfaces/common.interface';

describe('LearningAgent', () => {
  let agent: LearningAgent;
  let mockTemplateRepo: jest.Mocked<Repository<ImportTemplate>>;
  let mockSessionRepo: jest.Mocked<Repository<ImportSession>>;

  const mockContext = {
    sessionId: 'session-123',
    userId: 'user-123',
  };

  const mockSuccessfulSession: Partial<ImportSession> = {
    id: 'session-123',
    domain: DomainType.SALES,
    status: 'completed' as any,
    approval_status: 'approved' as any,
    classification_result: {
      confidence: 0.95,
      columnMapping: {
        sale_date: { field: 'transaction_date', confidence: 1.0 },
        amount: { field: 'amount', confidence: 0.9 },
      },
    },
    file_metadata: {
      filename: 'sales_2025-01-15.csv',
    } as any,
  };

  beforeEach(async () => {
    mockTemplateRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => ({ id: 'template-new', ...data })),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    } as any;

    mockSessionRepo = {
      findOne: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningAgent,
        {
          provide: getRepositoryToken(ImportTemplate),
          useValue: mockTemplateRepo,
        },
        {
          provide: getRepositoryToken(ImportSession),
          useValue: mockSessionRepo,
        },
      ],
    }).compile();

    agent = module.get<LearningAgent>(LearningAgent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create new template for successful high-confidence session', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue(mockSuccessfulSession as ImportSession);
      mockTemplateRepo.findOne.mockResolvedValue(null);

      const input = { sessionId: 'session-123' };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.templateCreated).toBe(true);
      expect(result.templateId).toBeDefined();
      expect(mockTemplateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('sales_sales'),
          domain: DomainType.SALES,
          use_count: 1,
        }),
      );
      expect(mockTemplateRepo.save).toHaveBeenCalled();
    });

    it('should update existing template instead of creating new', async () => {
      // Arrange
      const existingTemplate = {
        id: 'template-existing',
        name: 'sales_sales',
        domain: DomainType.SALES,
        column_mapping: {},
        use_count: 5,
        last_used_at: new Date('2024-01-01'),
      };

      mockSessionRepo.findOne.mockResolvedValue(mockSuccessfulSession as ImportSession);
      mockTemplateRepo.findOne.mockResolvedValue(existingTemplate as ImportTemplate);

      const input = { sessionId: 'session-123' };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.templateCreated).toBe(true);
      expect(mockTemplateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          use_count: 6,
        }),
      );
      expect(mockTemplateRepo.create).not.toHaveBeenCalled();
    });

    it('should skip learning when session not found', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue(null);

      const input = { sessionId: 'non-existent' };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.templateCreated).toBe(false);
      expect(result.templateId).toBeUndefined();
      expect(mockTemplateRepo.create).not.toHaveBeenCalled();
    });

    it('should skip learning when session has no classification result', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue({
        ...mockSuccessfulSession,
        classification_result: null,
      } as ImportSession);

      const input = { sessionId: 'session-123' };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.templateCreated).toBe(false);
      expect(agent.getStatus()).toBe(AgentStatus.COMPLETED);
    });

    it('should skip learning when session status is not completed', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue({
        ...mockSuccessfulSession,
        status: 'failed',
      } as ImportSession);

      const input = { sessionId: 'session-123' };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.templateCreated).toBe(false);
    });

    it('should skip learning when session approval status is not approved', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue({
        ...mockSuccessfulSession,
        approval_status: 'rejected',
      } as ImportSession);

      const input = { sessionId: 'session-123' };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.templateCreated).toBe(false);
    });

    it('should skip learning when confidence is below 0.9', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue({
        ...mockSuccessfulSession,
        classification_result: {
          confidence: 0.7,
          columnMapping: {},
        },
      } as ImportSession);

      const input = { sessionId: 'session-123' };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.templateCreated).toBe(false);
    });

    it('should update agent status to COMPLETED after successful execution', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue(mockSuccessfulSession as ImportSession);
      mockTemplateRepo.findOne.mockResolvedValue(null);

      expect(agent.getStatus()).toBe(AgentStatus.IDLE);

      const input = { sessionId: 'session-123' };

      // Act
      await agent.execute(input, mockContext);

      // Assert
      expect(agent.getStatus()).toBe(AgentStatus.COMPLETED);
    });

    it('should return templateCreated false on error (graceful failure)', async () => {
      // Arrange
      mockSessionRepo.findOne.mockRejectedValue(new Error('Database error'));

      const input = { sessionId: 'session-123' };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert - Learning agent fails gracefully
      expect(result.templateCreated).toBe(false);
      expect(agent.getStatus()).toBe(AgentStatus.FAILED);
    });

    it('should handle session with filename containing timestamp', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue({
        ...mockSuccessfulSession,
        file_metadata: {
          filename: 'daily_report_2025-01-15_14-30-00.csv',
        },
      } as ImportSession);
      mockTemplateRepo.findOne.mockResolvedValue(null);

      const input = { sessionId: 'session-123' };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.templateCreated).toBe(true);
      expect(mockTemplateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('sales_daily_report'),
        }),
      );
    });

    it('should generate fallback template name when filename is not available', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue({
        ...mockSuccessfulSession,
        file_metadata: {},
      } as ImportSession);
      mockTemplateRepo.findOne.mockResolvedValue(null);

      const input = { sessionId: 'session-123' };

      // Act
      const result = await agent.execute(input, mockContext);

      // Assert
      expect(result.templateCreated).toBe(true);
      expect(mockTemplateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringMatching(/^sales_template_\d+$/),
        }),
      );
    });
  });

  describe('generateTemplateName', () => {
    it('should generate name from domain and filename', () => {
      // Act
      const name = (agent as any).generateTemplateName(DomainType.SALES, 'monthly_sales.xlsx');

      // Assert
      expect(name).toBe('sales_monthly_sales');
    });

    it('should strip file extension from template name', () => {
      // Act
      const nameXlsx = (agent as any).generateTemplateName(DomainType.SALES, 'report.xlsx');
      const nameCsv = (agent as any).generateTemplateName(DomainType.SALES, 'report.csv');
      const nameJson = (agent as any).generateTemplateName(DomainType.SALES, 'report.json');
      const nameXml = (agent as any).generateTemplateName(DomainType.SALES, 'report.xml');

      // Assert
      expect(nameXlsx).toBe('sales_report');
      expect(nameCsv).toBe('sales_report');
      expect(nameJson).toBe('sales_report');
      expect(nameXml).toBe('sales_report');
    });

    it('should strip timestamp from template name', () => {
      // Act
      const name1 = (agent as any).generateTemplateName(DomainType.SALES, 'sales_2025-01-15.csv');
      const name2 = (agent as any).generateTemplateName(
        DomainType.SALES,
        'sales_2025-01-15_14-30.csv',
      );

      // Assert
      expect(name1).toBe('sales_sales');
      expect(name2).toBe('sales_sales');
    });

    it('should handle trailing underscores after stripping', () => {
      // Act
      const name = (agent as any).generateTemplateName(DomainType.SALES, 'sales__2025-01-15.csv');

      // Assert
      expect(name).toBe('sales_sales');
    });

    it('should generate timestamp-based name when filename is undefined', () => {
      // Act
      const name = (agent as any).generateTemplateName(DomainType.SALES, undefined);

      // Assert
      expect(name).toMatch(/^sales_template_\d+$/);
    });
  });

  describe('validateInput', () => {
    it('should return true when sessionId is provided', async () => {
      // Arrange
      const input = { sessionId: 'session-123' };

      // Act
      const result = await agent.validateInput(input);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when sessionId is null', async () => {
      // Arrange
      const input = { sessionId: null as any };

      // Act
      const result = await agent.validateInput(input);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when sessionId is undefined', async () => {
      // Arrange
      const input = { sessionId: undefined as any };

      // Act
      const result = await agent.validateInput(input);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return IDLE initially', () => {
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);
    });

    it('should return COMPLETED after successful execution', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue(null);

      // Act
      await agent.execute({ sessionId: 'test' }, mockContext);

      // Assert
      expect(agent.getStatus()).toBe(AgentStatus.COMPLETED);
    });

    it('should return FAILED after error', async () => {
      // Arrange
      mockSessionRepo.findOne.mockRejectedValue(new Error('DB error'));

      // Act
      await agent.execute({ sessionId: 'test' }, mockContext);

      // Assert
      expect(agent.getStatus()).toBe(AgentStatus.FAILED);
    });
  });
});
