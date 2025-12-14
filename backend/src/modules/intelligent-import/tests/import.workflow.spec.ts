import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ImportWorkflow } from '../workflows/import.workflow';
import { ImportSession } from '../entities/import-session.entity';
import { FileIntakeAgent } from '../agents/file-intake.agent';
import { ClassificationAgent } from '../agents/classification.agent';
import { ValidationAgent } from '../agents/validation.agent';
import { SuggestionAgent } from '../agents/suggestion.agent';
import { UxApprovalAgent } from '../agents/ux-approval.agent';
import { ExecutionAgent } from '../agents/execution.agent';
import { ReconciliationAgent } from '../agents/reconciliation.agent';
import { LearningAgent } from '../agents/learning.agent';
import {
  DomainType,
  ImportSessionStatus,
  ApprovalStatus,
  FileType,
  FileUpload,
  ActionType,
} from '../interfaces/common.interface';

describe('ImportWorkflow', () => {
  let workflow: ImportWorkflow;
  let mockSessionRepo: jest.Mocked<Repository<ImportSession>>;
  let mockFileIntakeAgent: jest.Mocked<FileIntakeAgent>;
  let mockClassificationAgent: jest.Mocked<ClassificationAgent>;
  let mockValidationAgent: jest.Mocked<ValidationAgent>;
  let mockSuggestionAgent: jest.Mocked<SuggestionAgent>;
  let mockUxApprovalAgent: jest.Mocked<UxApprovalAgent>;
  let mockExecutionAgent: jest.Mocked<ExecutionAgent>;
  let mockReconciliationAgent: jest.Mocked<ReconciliationAgent>;
  let mockLearningAgent: jest.Mocked<LearningAgent>;

  const mockSession: Partial<ImportSession> = {
    id: 'session-123',
    domain: DomainType.UNKNOWN,
    status: ImportSessionStatus.PENDING,
    uploaded_by_user_id: 'user-123',
    approval_status: ApprovalStatus.PENDING,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockParsedFile = {
    fileType: FileType.CSV,
    tables: [
      {
        headers: ['date', 'machine', 'amount'],
        rows: [
          ['2025-01-15', 'M-001', '5000'],
          ['2025-01-16', 'M-002', '10000'],
        ],
      },
    ],
    metadata: {
      filename: 'sales.csv',
      size: 1024,
      mimetype: 'text/csv',
      encoding: 'utf-8',
      checksum: 'abc123',
      rowCount: 2,
      columnCount: 3,
    },
  };

  const mockClassificationResult = {
    domain: DomainType.SALES,
    confidence: 0.95,
    columnMapping: {
      date: { field: 'transaction_date', confidence: 1.0 },
      machine: { field: 'machine_number', confidence: 0.9 },
      amount: { field: 'amount', confidence: 1.0 },
    },
    dataTypes: { date: 'date', machine: 'string', amount: 'number' },
    relationships: {},
    suggestedTemplate: null,
  };

  const mockValidationReport = {
    totalRows: 2,
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    errors: [],
    warnings: [],
    info: [],
    isValid: true,
    canProceed: true,
  };

  const mockActionPlan = {
    actions: [
      { type: ActionType.INSERT, table: 'transactions', data: {} },
      { type: ActionType.INSERT, table: 'transactions', data: {} },
    ],
    summary: {
      insertCount: 2,
      updateCount: 0,
      mergeCount: 0,
      skipCount: 0,
      deleteCount: 0,
    },
    estimatedDuration: 5,
    risks: [],
  };

  const mockExecutionResult = {
    successCount: 2,
    failureCount: 0,
    results: [],
    duration: 1000,
  };

  beforeEach(async () => {
    mockSessionRepo = {
      create: jest.fn().mockReturnValue(mockSession),
      save: jest.fn().mockResolvedValue(mockSession),
      findOne: jest.fn().mockResolvedValue(mockSession),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    } as any;

    mockFileIntakeAgent = {
      execute: jest.fn().mockResolvedValue(mockParsedFile),
      validateInput: jest.fn().mockResolvedValue(true),
    } as any;

    mockClassificationAgent = {
      execute: jest.fn().mockResolvedValue(mockClassificationResult),
      schemaRegistry: {
        getSchema: jest.fn().mockResolvedValue({
          fields: [],
          relationships: {},
        }),
      },
    } as any;

    mockValidationAgent = {
      execute: jest.fn().mockResolvedValue(mockValidationReport),
    } as any;

    mockSuggestionAgent = {
      execute: jest.fn().mockResolvedValue(mockActionPlan),
    } as any;

    mockUxApprovalAgent = {
      execute: jest.fn().mockResolvedValue({ autoApprove: true }),
    } as any;

    mockExecutionAgent = {
      execute: jest.fn().mockResolvedValue(mockExecutionResult),
    } as any;

    mockReconciliationAgent = {
      execute: jest.fn().mockResolvedValue({ gaps: [], inconsistencies: [] }),
    } as any;

    mockLearningAgent = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportWorkflow,
        {
          provide: getRepositoryToken(ImportSession),
          useValue: mockSessionRepo,
        },
        {
          provide: FileIntakeAgent,
          useValue: mockFileIntakeAgent,
        },
        {
          provide: ClassificationAgent,
          useValue: mockClassificationAgent,
        },
        {
          provide: ValidationAgent,
          useValue: mockValidationAgent,
        },
        {
          provide: SuggestionAgent,
          useValue: mockSuggestionAgent,
        },
        {
          provide: UxApprovalAgent,
          useValue: mockUxApprovalAgent,
        },
        {
          provide: ExecutionAgent,
          useValue: mockExecutionAgent,
        },
        {
          provide: ReconciliationAgent,
          useValue: mockReconciliationAgent,
        },
        {
          provide: LearningAgent,
          useValue: mockLearningAgent,
        },
      ],
    }).compile();

    workflow = module.get<ImportWorkflow>(ImportWorkflow);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const mockFileUpload: FileUpload = {
      buffer: Buffer.from('test'),
      filename: 'sales.csv',
      mimetype: 'text/csv',
      size: 1024,
    };

    it('should execute complete workflow with auto-approve', async () => {
      // Act
      const result = await workflow.execute(mockFileUpload, 'user-123');

      // Assert
      expect(mockSessionRepo.create).toHaveBeenCalled();
      expect(mockSessionRepo.save).toHaveBeenCalled();
      expect(mockFileIntakeAgent.execute).toHaveBeenCalled();
      expect(mockClassificationAgent.execute).toHaveBeenCalled();
      expect(mockValidationAgent.execute).toHaveBeenCalled();
      expect(mockSuggestionAgent.execute).toHaveBeenCalled();
      expect(mockUxApprovalAgent.execute).toHaveBeenCalled();
      expect(mockExecutionAgent.execute).toHaveBeenCalled();
      expect(mockReconciliationAgent.execute).toHaveBeenCalled();
      expect(result.status).toBe(ImportSessionStatus.COMPLETED);
    });

    it('should stop at awaiting approval when not auto-approved', async () => {
      // Arrange
      mockUxApprovalAgent.execute.mockResolvedValue({
        summary: {} as any,
        diff: {} as any,
        requiresApproval: true,
        autoApprove: false,
      });

      // Act
      const result = await workflow.execute(mockFileUpload, 'user-123');

      // Assert
      expect(result.status).toBe(ImportSessionStatus.AWAITING_APPROVAL);
      expect(mockExecutionAgent.execute).not.toHaveBeenCalled();
    });

    it('should call progress callback at each stage', async () => {
      // Arrange
      const onProgress = jest.fn();

      // Act
      await workflow.execute(mockFileUpload, 'user-123', onProgress);

      // Assert
      expect(onProgress).toHaveBeenCalledWith(ImportSessionStatus.PARSING, 10, 'Parsing file...');
      expect(onProgress).toHaveBeenCalledWith(
        ImportSessionStatus.CLASSIFYING,
        25,
        'Classifying data...',
      );
      expect(onProgress).toHaveBeenCalledWith(
        ImportSessionStatus.VALIDATING,
        40,
        'Validating data...',
      );
    });

    it('should return FAILED status when validation fails', async () => {
      // Arrange
      mockValidationAgent.execute.mockResolvedValue({
        ...mockValidationReport,
        errorCount: 100,
        canProceed: false,
      });

      // Act
      const result = await workflow.execute(mockFileUpload, 'user-123');

      // Assert
      expect(result.status).toBe(ImportSessionStatus.FAILED);
      expect(result.message).toContain('Validation failed');
    });

    it('should handle workflow errors and update session status', async () => {
      // Arrange
      mockFileIntakeAgent.execute.mockRejectedValue(new Error('Parse error'));

      // Act
      const result = await workflow.execute(mockFileUpload, 'user-123');

      // Assert
      expect(result.status).toBe(ImportSessionStatus.FAILED);
      expect(result.message).toContain('Parse error');
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        mockSession.id,
        expect.objectContaining({ status: ImportSessionStatus.FAILED }),
      );
    });

    it('should update session with file metadata after parsing', async () => {
      // Act
      await workflow.execute(mockFileUpload, 'user-123');

      // Assert
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        mockSession.id,
        expect.objectContaining({
          file_metadata: mockParsedFile.metadata,
        }),
      );
    });

    it('should update session with domain after classification', async () => {
      // Act
      await workflow.execute(mockFileUpload, 'user-123');

      // Assert
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        mockSession.id,
        expect.objectContaining({
          domain: DomainType.SALES,
        }),
      );
    });
  });

  describe('approve', () => {
    it('should approve session awaiting approval and continue execution', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.AWAITING_APPROVAL,
        action_plan: mockActionPlan,
        domain: DomainType.SALES,
        validation_report: mockValidationReport,
      } as ImportSession);

      // Act
      const result = await workflow.approve('session-123', 'admin-123');

      // Assert
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          approval_status: ApprovalStatus.APPROVED,
          approved_by_user_id: 'admin-123',
        }),
      );
      expect(mockExecutionAgent.execute).toHaveBeenCalled();
      expect(result.status).toBe(ImportSessionStatus.COMPLETED);
    });

    it('should throw NotFoundException when session not found', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(workflow.approve('non-existent', 'admin-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when session is not awaiting approval', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.COMPLETED,
      } as ImportSession);

      // Act & Assert
      await expect(workflow.approve('session-123', 'admin-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(workflow.approve('session-123', 'admin-123')).rejects.toThrow(
        'Session is not awaiting approval',
      );
    });
  });

  describe('reject', () => {
    it('should update session with rejected status and reason', async () => {
      // Act
      await workflow.reject('session-123', 'admin-123', 'Data quality issues');

      // Assert
      expect(mockSessionRepo.update).toHaveBeenCalledWith('session-123', {
        approval_status: ApprovalStatus.REJECTED,
        approved_by_user_id: 'admin-123',
        approved_at: expect.any(Date),
        status: ImportSessionStatus.CANCELLED,
        message: 'Rejected: Data quality issues',
      });
    });
  });

  describe('mapRows', () => {
    it('should map rows from array format to object format', () => {
      // Arrange
      const rows = [
        ['2025-01-15', 'M-001', '5000'],
        ['2025-01-16', 'M-002', '10000'],
      ];
      const headers = ['date', 'machine', 'amount'];
      const columnMapping = {
        date: { field: 'transaction_date', confidence: 1.0 },
        machine: { field: 'machine_number', confidence: 0.9 },
        amount: { field: 'amount', confidence: 1.0 },
      };

      // Act
      const result = (workflow as any).mapRows(rows, headers, columnMapping);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        transaction_date: '2025-01-15',
        machine_number: 'M-001',
        amount: '5000',
      });
    });

    it('should use header name when field mapping is null', () => {
      // Arrange
      const rows = [['2025-01-15', 'M-001', 'extra-data']];
      const headers = ['date', 'machine', 'unknown_column'];
      const columnMapping = {
        date: { field: 'transaction_date', confidence: 1.0 },
        machine: { field: 'machine_number', confidence: 0.9 },
        unknown_column: { field: null, confidence: 0 },
      };

      // Act
      const result = (workflow as any).mapRows(rows, headers, columnMapping);

      // Assert
      expect(result[0]).toHaveProperty('unknown_column', 'extra-data');
    });
  });

  describe('createSession', () => {
    it('should create new session with correct initial values', async () => {
      // Act
      const _result = await (workflow as any).createSession('user-123');

      // Assert
      expect(mockSessionRepo.create).toHaveBeenCalledWith({
        domain: DomainType.UNKNOWN,
        status: ImportSessionStatus.PENDING,
        uploaded_by_user_id: 'user-123',
        approval_status: ApprovalStatus.PENDING,
        started_at: expect.any(Date),
      });
      expect(mockSessionRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateSessionStatus', () => {
    it('should update session status', async () => {
      // Act
      await (workflow as any).updateSessionStatus('session-123', ImportSessionStatus.PARSING);

      // Assert
      expect(mockSessionRepo.update).toHaveBeenCalledWith('session-123', {
        status: ImportSessionStatus.PARSING,
      });
    });
  });

  describe('learning agent', () => {
    it('should call learning agent after successful completion', async () => {
      // Arrange
      const mockFileUpload: FileUpload = {
        buffer: Buffer.from('test'),
        filename: 'sales.csv',
        mimetype: 'text/csv',
        size: 1024,
      };

      // Act
      await workflow.execute(mockFileUpload, 'user-123');

      // Assert - Learning is called asynchronously, so we need to wait
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockLearningAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: mockSession.id }),
        expect.any(Object),
      );
    });

    it('should not fail if learning agent fails', async () => {
      // Arrange
      const mockFileUpload: FileUpload = {
        buffer: Buffer.from('test'),
        filename: 'sales.csv',
        mimetype: 'text/csv',
        size: 1024,
      };
      mockLearningAgent.execute.mockRejectedValue(new Error('Learning failed'));

      // Act - Should not throw
      const result = await workflow.execute(mockFileUpload, 'user-123');

      // Assert
      expect(result.status).toBe(ImportSessionStatus.COMPLETED);
    });
  });
});
