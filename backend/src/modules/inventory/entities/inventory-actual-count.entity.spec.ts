import { InventoryActualCount, InventoryLevelType } from './inventory-actual-count.entity';

describe('InventoryActualCount Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const count = new InventoryActualCount();

      expect(count.nomenclature_id).toBeUndefined();
      expect(count.level_type).toBeUndefined();
      expect(count.actual_quantity).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const count = new InventoryActualCount();
      count.nomenclature_id = 'nom-uuid';
      count.level_type = InventoryLevelType.WAREHOUSE;
      count.level_ref_id = 'warehouse-uuid';
      count.counted_at = new Date('2025-11-20T10:30:00Z');
      count.counted_by_user_id = 'user-uuid';
      count.actual_quantity = 150.5;

      expect(count.nomenclature_id).toBe('nom-uuid');
      expect(count.level_type).toBe(InventoryLevelType.WAREHOUSE);
      expect(count.level_ref_id).toBe('warehouse-uuid');
      expect(count.counted_at).toEqual(new Date('2025-11-20T10:30:00Z'));
      expect(count.counted_by_user_id).toBe('user-uuid');
      expect(count.actual_quantity).toBe(150.5);
    });

    it('should accept unit of measure', () => {
      const count = new InventoryActualCount();
      count.unit_of_measure = 'pcs';

      expect(count.unit_of_measure).toBe('pcs');
    });

    it('should accept notes and session', () => {
      const count = new InventoryActualCount();
      count.notes = 'Inventory count completed';
      count.session_id = 'session-uuid';

      expect(count.notes).toBe('Inventory count completed');
      expect(count.session_id).toBe('session-uuid');
    });

    it('should accept metadata', () => {
      const count = new InventoryActualCount();
      count.metadata = {
        photos: ['photo1.jpg', 'photo2.jpg'],
        location: { lat: 41.2, lon: 69.2 },
      };

      expect(count.metadata).toEqual({
        photos: ['photo1.jpg', 'photo2.jpg'],
        location: { lat: 41.2, lon: 69.2 },
      });
    });

    it('should handle nullable fields', () => {
      const count = new InventoryActualCount();
      count.nomenclature_id = 'nom-uuid';
      count.level_type = InventoryLevelType.OPERATOR;
      count.level_ref_id = 'operator-uuid';
      count.counted_at = new Date();
      count.counted_by_user_id = 'user-uuid';
      count.actual_quantity = 100;
      count.unit_of_measure = null;
      count.notes = null;
      count.session_id = null;
      count.metadata = null;

      expect(count.unit_of_measure).toBeNull();
      expect(count.notes).toBeNull();
      expect(count.session_id).toBeNull();
      expect(count.metadata).toBeNull();
    });

    it('should handle decimal quantities', () => {
      const count = new InventoryActualCount();
      count.actual_quantity = 125.456;

      expect(count.actual_quantity).toBe(125.456);
    });

    it('should handle zero quantity', () => {
      const count = new InventoryActualCount();
      count.actual_quantity = 0;

      expect(count.actual_quantity).toBe(0);
    });

    it('should handle WAREHOUSE level type', () => {
      const count = new InventoryActualCount();
      count.level_type = InventoryLevelType.WAREHOUSE;
      count.level_ref_id = 'warehouse-uuid';

      expect(count.level_type).toBe(InventoryLevelType.WAREHOUSE);
    });

    it('should handle OPERATOR level type', () => {
      const count = new InventoryActualCount();
      count.level_type = InventoryLevelType.OPERATOR;
      count.level_ref_id = 'operator-uuid';

      expect(count.level_type).toBe(InventoryLevelType.OPERATOR);
    });

    it('should handle MACHINE level type', () => {
      const count = new InventoryActualCount();
      count.level_type = InventoryLevelType.MACHINE;
      count.level_ref_id = 'machine-uuid';

      expect(count.level_type).toBe(InventoryLevelType.MACHINE);
    });
  });

  describe('InventoryLevelType enum', () => {
    it('should have all expected level types', () => {
      expect(InventoryLevelType.WAREHOUSE).toBe('WAREHOUSE');
      expect(InventoryLevelType.OPERATOR).toBe('OPERATOR');
      expect(InventoryLevelType.MACHINE).toBe('MACHINE');
    });
  });
});
