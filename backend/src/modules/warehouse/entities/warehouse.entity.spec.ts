import { Warehouse, WarehouseType } from './warehouse.entity';

describe('Warehouse Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const warehouse = new Warehouse();

      expect(warehouse.name).toBeUndefined();
      expect(warehouse.code).toBeUndefined();
      expect(warehouse.warehouse_type).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const warehouse = new Warehouse();
      warehouse.name = 'Main Warehouse';
      warehouse.code = 'WH-001';
      warehouse.warehouse_type = WarehouseType.MAIN;
      warehouse.is_active = true;

      expect(warehouse.name).toBe('Main Warehouse');
      expect(warehouse.code).toBe('WH-001');
      expect(warehouse.warehouse_type).toBe(WarehouseType.MAIN);
      expect(warehouse.is_active).toBe(true);
    });

    it('should accept location properties', () => {
      const warehouse = new Warehouse();
      warehouse.location_id = 'location-uuid';
      warehouse.address = '123 Warehouse Street';

      expect(warehouse.location_id).toBe('location-uuid');
      expect(warehouse.address).toBe('123 Warehouse Street');
    });

    it('should accept area and contact properties', () => {
      const warehouse = new Warehouse();
      warehouse.total_area_sqm = 500.5;
      warehouse.manager_id = 'manager-uuid';
      warehouse.phone = '+998901234567';
      warehouse.email = 'warehouse@example.com';

      expect(warehouse.total_area_sqm).toBe(500.5);
      expect(warehouse.manager_id).toBe('manager-uuid');
      expect(warehouse.phone).toBe('+998901234567');
      expect(warehouse.email).toBe('warehouse@example.com');
    });

    it('should accept working hours', () => {
      const warehouse = new Warehouse();
      warehouse.working_hours = ['Mon-Fri: 9-18', 'Sat: 10-14'];

      expect(warehouse.working_hours).toEqual(['Mon-Fri: 9-18', 'Sat: 10-14']);
    });

    it('should accept metadata', () => {
      const warehouse = new Warehouse();
      warehouse.metadata = {
        capacity: 10000,
        temperature_controlled: true,
        security_level: 'high',
        equipment: ['forklift', 'shelving'],
      };

      expect(warehouse.metadata).toEqual({
        capacity: 10000,
        temperature_controlled: true,
        security_level: 'high',
        equipment: ['forklift', 'shelving'],
      });
    });

    it('should handle nullable fields', () => {
      const warehouse = new Warehouse();
      warehouse.name = 'Test Warehouse';
      warehouse.code = 'WH-TEST';
      warehouse.location_id = null;
      warehouse.address = null;
      warehouse.total_area_sqm = null;
      warehouse.manager_id = null;
      warehouse.phone = null;
      warehouse.email = null;
      warehouse.working_hours = null;

      expect(warehouse.location_id).toBeNull();
      expect(warehouse.address).toBeNull();
      expect(warehouse.total_area_sqm).toBeNull();
      expect(warehouse.manager_id).toBeNull();
      expect(warehouse.phone).toBeNull();
      expect(warehouse.email).toBeNull();
      expect(warehouse.working_hours).toBeNull();
    });
  });

  describe('WarehouseType enum', () => {
    it('should have all expected types', () => {
      expect(WarehouseType.MAIN).toBe('main');
      expect(WarehouseType.REGIONAL).toBe('regional');
      expect(WarehouseType.TRANSIT).toBe('transit');
      expect(WarehouseType.VIRTUAL).toBe('virtual');
    });
  });
});
