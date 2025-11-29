import { TaskItem } from './task-item.entity';

describe('TaskItem Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const taskItem = new TaskItem();

      expect(taskItem.task_id).toBeUndefined();
      expect(taskItem.nomenclature_id).toBeUndefined();
      expect(taskItem.planned_quantity).toBeUndefined();
      expect(taskItem.actual_quantity).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const taskItem = new TaskItem();
      taskItem.task_id = 'task-uuid';
      taskItem.nomenclature_id = 'nomenclature-uuid';
      taskItem.planned_quantity = 100;
      taskItem.actual_quantity = 95;
      taskItem.unit_of_measure_code = 'pcs';

      expect(taskItem.task_id).toBe('task-uuid');
      expect(taskItem.nomenclature_id).toBe('nomenclature-uuid');
      expect(taskItem.planned_quantity).toBe(100);
      expect(taskItem.actual_quantity).toBe(95);
      expect(taskItem.unit_of_measure_code).toBe('pcs');
    });

    it('should accept notes', () => {
      const taskItem = new TaskItem();
      taskItem.task_id = 'task-uuid';
      taskItem.nomenclature_id = 'nom-uuid';
      taskItem.planned_quantity = 50;
      taskItem.unit_of_measure_code = 'kg';
      taskItem.notes = 'Check expiration date';

      expect(taskItem.notes).toBe('Check expiration date');
    });

    it('should handle nullable fields', () => {
      const taskItem = new TaskItem();
      taskItem.task_id = 'task-uuid';
      taskItem.nomenclature_id = 'nom-uuid';
      taskItem.planned_quantity = 50;
      taskItem.unit_of_measure_code = 'kg';
      taskItem.actual_quantity = null;
      taskItem.notes = null;

      expect(taskItem.actual_quantity).toBeNull();
      expect(taskItem.notes).toBeNull();
    });

    it('should handle decimal quantities', () => {
      const taskItem = new TaskItem();
      taskItem.planned_quantity = 15.5;
      taskItem.actual_quantity = 15.25;

      expect(taskItem.planned_quantity).toBe(15.5);
      expect(taskItem.actual_quantity).toBe(15.25);
    });

    it('should handle zero quantities', () => {
      const taskItem = new TaskItem();
      taskItem.planned_quantity = 0;
      taskItem.actual_quantity = 0;

      expect(taskItem.planned_quantity).toBe(0);
      expect(taskItem.actual_quantity).toBe(0);
    });

    it('should handle various units of measure', () => {
      const taskItem1 = new TaskItem();
      taskItem1.unit_of_measure_code = 'pcs';
      expect(taskItem1.unit_of_measure_code).toBe('pcs');

      const taskItem2 = new TaskItem();
      taskItem2.unit_of_measure_code = 'kg';
      expect(taskItem2.unit_of_measure_code).toBe('kg');

      const taskItem3 = new TaskItem();
      taskItem3.unit_of_measure_code = 'l';
      expect(taskItem3.unit_of_measure_code).toBe('l');

      const taskItem4 = new TaskItem();
      taskItem4.unit_of_measure_code = 'g';
      expect(taskItem4.unit_of_measure_code).toBe('g');
    });
  });
});
