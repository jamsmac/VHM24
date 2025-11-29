import { TaskComment } from './task-comment.entity';

describe('TaskComment Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const comment = new TaskComment();

      expect(comment.task_id).toBeUndefined();
      expect(comment.user_id).toBeUndefined();
      expect(comment.comment).toBeUndefined();
      expect(comment.is_internal).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const comment = new TaskComment();
      comment.task_id = 'task-uuid';
      comment.user_id = 'user-uuid';
      comment.comment = 'Task completed successfully';
      comment.is_internal = false;

      expect(comment.task_id).toBe('task-uuid');
      expect(comment.user_id).toBe('user-uuid');
      expect(comment.comment).toBe('Task completed successfully');
      expect(comment.is_internal).toBe(false);
    });

    it('should accept internal comments for admins only', () => {
      const comment = new TaskComment();
      comment.task_id = 'task-uuid';
      comment.user_id = 'admin-uuid';
      comment.comment = 'Internal note: verify with manager';
      comment.is_internal = true;

      expect(comment.is_internal).toBe(true);
    });

    it('should accept public comments visible to operators', () => {
      const comment = new TaskComment();
      comment.task_id = 'task-uuid';
      comment.user_id = 'admin-uuid';
      comment.comment = 'Please check the coffee level before completing';
      comment.is_internal = false;

      expect(comment.is_internal).toBe(false);
    });

    it('should handle long comments', () => {
      const comment = new TaskComment();
      const longText = 'A'.repeat(1000);
      comment.comment = longText;

      expect(comment.comment).toBe(longText);
      expect(comment.comment.length).toBe(1000);
    });

    it('should handle multiline comments', () => {
      const comment = new TaskComment();
      comment.comment = 'Line 1\nLine 2\nLine 3';

      expect(comment.comment).toBe('Line 1\nLine 2\nLine 3');
    });
  });
});
