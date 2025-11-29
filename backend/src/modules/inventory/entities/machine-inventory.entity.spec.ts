import { MachineInventory } from './machine-inventory.entity';

describe('MachineInventory Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const inventory = new MachineInventory();

      expect(inventory.machine_id).toBeUndefined();
      expect(inventory.nomenclature_id).toBeUndefined();
      expect(inventory.current_quantity).toBeUndefined();
      expect(inventory.min_stock_level).toBeUndefined();
      expect(inventory.max_capacity).toBeUndefined();
    });

    it('should accept all properties', () => {
      const inventory = new MachineInventory();
      inventory.machine_id = 'machine-uuid';
      inventory.nomenclature_id = 'nomenclature-uuid';
      inventory.current_quantity = 15.5;
      inventory.min_stock_level = 5;
      inventory.max_capacity = 50;
      inventory.last_refilled_at = new Date('2025-11-14T10:00:00Z');
      inventory.last_refill_task_id = 'task-uuid';
      inventory.slot_number = 'A-12';

      expect(inventory.machine_id).toBe('machine-uuid');
      expect(inventory.nomenclature_id).toBe('nomenclature-uuid');
      expect(inventory.current_quantity).toBe(15.5);
      expect(inventory.min_stock_level).toBe(5);
      expect(inventory.max_capacity).toBe(50);
      expect(inventory.last_refilled_at).toEqual(new Date('2025-11-14T10:00:00Z'));
      expect(inventory.last_refill_task_id).toBe('task-uuid');
      expect(inventory.slot_number).toBe('A-12');
    });

    it('should handle nullable fields', () => {
      const inventory = new MachineInventory();
      inventory.machine_id = 'machine-uuid';
      inventory.nomenclature_id = 'nomenclature-uuid';
      inventory.current_quantity = 10;
      inventory.min_stock_level = 0;
      inventory.max_capacity = null;
      inventory.last_refilled_at = null;
      inventory.last_refill_task_id = null;
      inventory.slot_number = null;

      expect(inventory.max_capacity).toBeNull();
      expect(inventory.last_refilled_at).toBeNull();
      expect(inventory.last_refill_task_id).toBeNull();
      expect(inventory.slot_number).toBeNull();
    });

    it('should handle zero stock level', () => {
      const inventory = new MachineInventory();
      inventory.current_quantity = 0;
      inventory.min_stock_level = 0;

      expect(inventory.current_quantity).toBe(0);
      expect(inventory.min_stock_level).toBe(0);
    });

    it('should handle decimal quantities', () => {
      const inventory = new MachineInventory();
      inventory.current_quantity = 15.125;
      inventory.min_stock_level = 2.5;
      inventory.max_capacity = 50.75;

      expect(inventory.current_quantity).toBe(15.125);
      expect(inventory.min_stock_level).toBe(2.5);
      expect(inventory.max_capacity).toBe(50.75);
    });
  });
});
