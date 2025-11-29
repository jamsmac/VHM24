import { WarehouseInventory } from './warehouse-inventory.entity';

describe('WarehouseInventory Entity', () => {
  describe('available_quantity getter', () => {
    it('should calculate available quantity as current minus reserved', () => {
      const inventory = new WarehouseInventory();
      inventory.current_quantity = 100;
      inventory.reserved_quantity = 30;

      expect(inventory.available_quantity).toBe(70);
    });

    it('should return 0 when current equals reserved', () => {
      const inventory = new WarehouseInventory();
      inventory.current_quantity = 50;
      inventory.reserved_quantity = 50;

      expect(inventory.available_quantity).toBe(0);
    });

    it('should return negative when reserved exceeds current', () => {
      const inventory = new WarehouseInventory();
      inventory.current_quantity = 20;
      inventory.reserved_quantity = 30;

      expect(inventory.available_quantity).toBe(-10);
    });

    it('should handle decimal values correctly', () => {
      const inventory = new WarehouseInventory();
      inventory.current_quantity = 150.5;
      inventory.reserved_quantity = 10.5;

      expect(inventory.available_quantity).toBe(140);
    });

    it('should handle zero values', () => {
      const inventory = new WarehouseInventory();
      inventory.current_quantity = 0;
      inventory.reserved_quantity = 0;

      expect(inventory.available_quantity).toBe(0);
    });

    it('should handle string values from database by converting to numbers', () => {
      const inventory = new WarehouseInventory();
      (inventory as any).current_quantity = '100.5';
      (inventory as any).reserved_quantity = '20.5';

      expect(inventory.available_quantity).toBe(80);
    });
  });

  describe('entity properties', () => {
    it('should have default values', () => {
      const inventory = new WarehouseInventory();

      expect(inventory.current_quantity).toBeUndefined();
      expect(inventory.reserved_quantity).toBeUndefined();
      expect(inventory.min_stock_level).toBeUndefined();
      expect(inventory.max_stock_level).toBeUndefined();
      expect(inventory.nomenclature_id).toBeUndefined();
    });

    it('should accept all properties', () => {
      const inventory = new WarehouseInventory();
      inventory.nomenclature_id = 'test-uuid';
      inventory.current_quantity = 100;
      inventory.reserved_quantity = 20;
      inventory.min_stock_level = 10;
      inventory.max_stock_level = 200;
      inventory.last_restocked_at = new Date('2025-01-15');
      inventory.location_in_warehouse = 'A-12';

      expect(inventory.nomenclature_id).toBe('test-uuid');
      expect(inventory.current_quantity).toBe(100);
      expect(inventory.reserved_quantity).toBe(20);
      expect(inventory.min_stock_level).toBe(10);
      expect(inventory.max_stock_level).toBe(200);
      expect(inventory.last_restocked_at).toEqual(new Date('2025-01-15'));
      expect(inventory.location_in_warehouse).toBe('A-12');
    });
  });
});
