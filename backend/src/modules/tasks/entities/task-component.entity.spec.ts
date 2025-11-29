import { TaskComponent, ComponentRole } from './task-component.entity';

describe('TaskComponent Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const taskComponent = new TaskComponent();

      expect(taskComponent.task_id).toBeUndefined();
      expect(taskComponent.component_id).toBeUndefined();
      expect(taskComponent.role).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const taskComponent = new TaskComponent();
      taskComponent.task_id = 'task-uuid';
      taskComponent.component_id = 'component-uuid';
      taskComponent.role = ComponentRole.OLD;

      expect(taskComponent.task_id).toBe('task-uuid');
      expect(taskComponent.component_id).toBe('component-uuid');
      expect(taskComponent.role).toBe(ComponentRole.OLD);
    });

    it('should accept notes and metadata', () => {
      const taskComponent = new TaskComponent();
      taskComponent.task_id = 'task-uuid';
      taskComponent.component_id = 'component-uuid';
      taskComponent.role = ComponentRole.NEW;
      taskComponent.notes = 'Replacement due to wear';
      taskComponent.metadata = { reason: 'scheduled_replacement' };

      expect(taskComponent.notes).toBe('Replacement due to wear');
      expect(taskComponent.metadata).toEqual({ reason: 'scheduled_replacement' });
    });

    it('should handle nullable fields', () => {
      const taskComponent = new TaskComponent();
      taskComponent.task_id = 'task-uuid';
      taskComponent.component_id = 'component-uuid';
      taskComponent.role = ComponentRole.TARGET;
      taskComponent.notes = null;
      taskComponent.metadata = null;

      expect(taskComponent.notes).toBeNull();
      expect(taskComponent.metadata).toBeNull();
    });

    it('should accept OLD role for component being removed', () => {
      const taskComponent = new TaskComponent();
      taskComponent.role = ComponentRole.OLD;
      taskComponent.notes = 'Component failed, needs replacement';

      expect(taskComponent.role).toBe(ComponentRole.OLD);
    });

    it('should accept NEW role for component being installed', () => {
      const taskComponent = new TaskComponent();
      taskComponent.role = ComponentRole.NEW;
      taskComponent.notes = 'Brand new component from warehouse';

      expect(taskComponent.role).toBe(ComponentRole.NEW);
    });

    it('should accept TARGET role for component being serviced', () => {
      const taskComponent = new TaskComponent();
      taskComponent.role = ComponentRole.TARGET;
      taskComponent.notes = 'Cleaning required';

      expect(taskComponent.role).toBe(ComponentRole.TARGET);
    });
  });

  describe('ComponentRole enum', () => {
    it('should have all expected roles', () => {
      expect(ComponentRole.OLD).toBe('old');
      expect(ComponentRole.NEW).toBe('new');
      expect(ComponentRole.TARGET).toBe('target');
    });
  });
});
