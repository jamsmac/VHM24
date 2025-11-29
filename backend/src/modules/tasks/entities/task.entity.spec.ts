import { Task, TaskType, TaskStatus, TaskPriority } from './task.entity';

describe('Task Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const task = new Task();

      expect(task.type_code).toBeUndefined();
      expect(task.status).toBeUndefined();
      expect(task.priority).toBeUndefined();
      expect(task.machine_id).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const task = new Task();
      task.type_code = TaskType.REFILL;
      task.status = TaskStatus.PENDING;
      task.priority = TaskPriority.NORMAL;
      task.machine_id = 'machine-uuid';
      task.assigned_to_user_id = 'operator-uuid';
      task.created_by_user_id = 'admin-uuid';

      expect(task.type_code).toBe(TaskType.REFILL);
      expect(task.status).toBe(TaskStatus.PENDING);
      expect(task.priority).toBe(TaskPriority.NORMAL);
      expect(task.machine_id).toBe('machine-uuid');
      expect(task.assigned_to_user_id).toBe('operator-uuid');
      expect(task.created_by_user_id).toBe('admin-uuid');
    });

    it('should accept scheduling dates', () => {
      const task = new Task();
      const scheduledDate = new Date('2025-01-16T10:00:00Z');
      const dueDate = new Date('2025-01-16T18:00:00Z');

      task.scheduled_date = scheduledDate;
      task.due_date = dueDate;

      expect(task.scheduled_date).toEqual(scheduledDate);
      expect(task.due_date).toEqual(dueDate);
    });

    it('should accept execution tracking dates', () => {
      const task = new Task();
      const startedAt = new Date('2025-01-16T09:00:00Z');
      const completedAt = new Date('2025-01-16T11:00:00Z');
      const operationDate = new Date('2025-01-16T10:00:00Z');

      task.started_at = startedAt;
      task.completed_at = completedAt;
      task.operation_date = operationDate;

      expect(task.started_at).toEqual(startedAt);
      expect(task.completed_at).toEqual(completedAt);
      expect(task.operation_date).toEqual(operationDate);
    });

    it('should accept description and notes', () => {
      const task = new Task();
      task.description = 'Refill coffee beans';
      task.completion_notes = 'Completed without issues';
      task.postpone_reason = null;

      expect(task.description).toBe('Refill coffee beans');
      expect(task.completion_notes).toBe('Completed without issues');
      expect(task.postpone_reason).toBeNull();
    });

    it('should accept checklist as JSONB', () => {
      const task = new Task();
      task.checklist = [
        { item: 'Check water level', completed: true },
        { item: 'Check coffee beans', completed: false },
        { item: 'Clean drip tray', completed: true },
      ];

      expect(task.checklist).toHaveLength(3);
      expect(task.checklist![0]).toEqual({ item: 'Check water level', completed: true });
      expect(task.checklist![1].completed).toBe(false);
    });

    it('should accept collection task amounts', () => {
      const task = new Task();
      task.type_code = TaskType.COLLECTION;
      task.expected_cash_amount = 500000;
      task.actual_cash_amount = 485000;

      expect(task.expected_cash_amount).toBe(500000);
      expect(task.actual_cash_amount).toBe(485000);
    });

    it('should accept photo validation flags', () => {
      const task = new Task();
      task.has_photo_before = true;
      task.has_photo_after = true;

      expect(task.has_photo_before).toBe(true);
      expect(task.has_photo_after).toBe(true);
    });

    it('should accept offline mode flags', () => {
      const task = new Task();
      task.pending_photos = true;
      task.offline_completed = true;

      expect(task.pending_photos).toBe(true);
      expect(task.offline_completed).toBe(true);
    });

    it('should accept rejection tracking', () => {
      const task = new Task();
      task.rejected_by_user_id = 'admin-uuid';
      task.rejected_at = new Date('2025-01-16T12:00:00Z');
      task.rejection_reason = 'Photos not clear';

      expect(task.rejected_by_user_id).toBe('admin-uuid');
      expect(task.rejected_at).toEqual(new Date('2025-01-16T12:00:00Z'));
      expect(task.rejection_reason).toBe('Photos not clear');
    });

    it('should accept metadata', () => {
      const task = new Task();
      task.metadata = {
        source: 'mobile_app',
        version: '1.0.0',
        sync_id: 'sync-123',
      };

      expect(task.metadata).toEqual({
        source: 'mobile_app',
        version: '1.0.0',
        sync_id: 'sync-123',
      });
    });

    it('should handle nullable fields', () => {
      const task = new Task();
      task.type_code = TaskType.INSPECTION;
      task.machine_id = 'machine-uuid';
      task.created_by_user_id = 'admin-uuid';
      task.assigned_to_user_id = null;
      task.scheduled_date = null;
      task.due_date = null;
      task.started_at = null;
      task.completed_at = null;
      task.operation_date = null;
      task.description = null;
      task.completion_notes = null;
      task.postpone_reason = null;
      task.checklist = null;
      task.expected_cash_amount = null;
      task.actual_cash_amount = null;
      task.rejected_by_user_id = null;
      task.rejected_at = null;
      task.rejection_reason = null;
      task.metadata = null;

      expect(task.assigned_to_user_id).toBeNull();
      expect(task.scheduled_date).toBeNull();
      expect(task.description).toBeNull();
      expect(task.checklist).toBeNull();
      expect(task.metadata).toBeNull();
    });
  });

  describe('TaskType enum', () => {
    it('should have all expected types', () => {
      expect(TaskType.REFILL).toBe('refill');
      expect(TaskType.COLLECTION).toBe('collection');
      expect(TaskType.CLEANING).toBe('cleaning');
      expect(TaskType.REPAIR).toBe('repair');
      expect(TaskType.INSTALL).toBe('install');
      expect(TaskType.REMOVAL).toBe('removal');
      expect(TaskType.AUDIT).toBe('audit');
      expect(TaskType.INSPECTION).toBe('inspection');
      expect(TaskType.REPLACE_HOPPER).toBe('replace_hopper');
      expect(TaskType.REPLACE_GRINDER).toBe('replace_grinder');
      expect(TaskType.REPLACE_BREW_UNIT).toBe('replace_brew_unit');
      expect(TaskType.REPLACE_MIXER).toBe('replace_mixer');
    });
  });

  describe('TaskStatus enum', () => {
    it('should have all expected statuses', () => {
      expect(TaskStatus.PENDING).toBe('pending');
      expect(TaskStatus.ASSIGNED).toBe('assigned');
      expect(TaskStatus.IN_PROGRESS).toBe('in_progress');
      expect(TaskStatus.COMPLETED).toBe('completed');
      expect(TaskStatus.REJECTED).toBe('rejected');
      expect(TaskStatus.POSTPONED).toBe('postponed');
      expect(TaskStatus.CANCELLED).toBe('cancelled');
    });
  });

  describe('TaskPriority enum', () => {
    it('should have all expected priorities', () => {
      expect(TaskPriority.LOW).toBe('low');
      expect(TaskPriority.NORMAL).toBe('normal');
      expect(TaskPriority.HIGH).toBe('high');
      expect(TaskPriority.URGENT).toBe('urgent');
    });
  });
});
