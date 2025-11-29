import { OperatorInventory } from './operator-inventory.entity';

describe('OperatorInventory Entity', () => {
  describe('available_quantity getter', () => {
    it('should calculate available quantity as current minus reserved', () => {
      const inventory = new OperatorInventory();
      inventory.current_quantity = 50;
      inventory.reserved_quantity = 10;

      expect(inventory.available_quantity).toBe(40);
    });

    it('should return 0 when current equals reserved', () => {
      const inventory = new OperatorInventory();
      inventory.current_quantity = 25;
      inventory.reserved_quantity = 25;

      expect(inventory.available_quantity).toBe(0);
    });

    it('should return negative when reserved exceeds current', () => {
      const inventory = new OperatorInventory();
      inventory.current_quantity = 10;
      inventory.reserved_quantity = 15;

      expect(inventory.available_quantity).toBe(-5);
    });

    it('should handle decimal values correctly', () => {
      const inventory = new OperatorInventory();
      inventory.current_quantity = 25.5;
      inventory.reserved_quantity = 5.5;

      expect(inventory.available_quantity).toBe(20);
    });

    it('should handle zero values', () => {
      const inventory = new OperatorInventory();
      inventory.current_quantity = 0;
      inventory.reserved_quantity = 0;

      expect(inventory.available_quantity).toBe(0);
    });

    it('should handle string values from database by converting to numbers', () => {
      const inventory = new OperatorInventory();
      (inventory as any).current_quantity = '50.5';
      (inventory as any).reserved_quantity = '10.5';

      expect(inventory.available_quantity).toBe(40);
    });
  });

  describe('entity properties', () => {
    it('should have default values', () => {
      const inventory = new OperatorInventory();

      expect(inventory.operator_id).toBeUndefined();
      expect(inventory.nomenclature_id).toBeUndefined();
      expect(inventory.current_quantity).toBeUndefined();
      expect(inventory.reserved_quantity).toBeUndefined();
    });

    it('should accept all properties', () => {
      const inventory = new OperatorInventory();
      inventory.operator_id = 'operator-uuid';
      inventory.nomenclature_id = 'nomenclature-uuid';
      inventory.current_quantity = 25.5;
      inventory.reserved_quantity = 5.5;
      inventory.last_received_at = new Date('2025-11-14T10:00:00Z');
      inventory.last_task_id = 'task-uuid';

      expect(inventory.operator_id).toBe('operator-uuid');
      expect(inventory.nomenclature_id).toBe('nomenclature-uuid');
      expect(inventory.current_quantity).toBe(25.5);
      expect(inventory.reserved_quantity).toBe(5.5);
      expect(inventory.last_received_at).toEqual(new Date('2025-11-14T10:00:00Z'));
      expect(inventory.last_task_id).toBe('task-uuid');
    });
  });
});
