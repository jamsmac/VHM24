import {
  EquipmentComponent,
  ComponentType,
  ComponentStatus,
  ComponentLocationType,
} from './equipment-component.entity';

describe('EquipmentComponent Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const component = new EquipmentComponent();

      expect(component.component_type).toBeUndefined();
      expect(component.name).toBeUndefined();
      expect(component.status).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const component = new EquipmentComponent();
      component.machine_id = 'machine-uuid';
      component.component_type = ComponentType.HOPPER;
      component.name = 'Coffee Hopper';
      component.model = 'H-500';
      component.serial_number = 'SN-12345';
      component.manufacturer = 'CoffeeTech';
      component.status = ComponentStatus.ACTIVE;

      expect(component.machine_id).toBe('machine-uuid');
      expect(component.component_type).toBe(ComponentType.HOPPER);
      expect(component.name).toBe('Coffee Hopper');
      expect(component.model).toBe('H-500');
      expect(component.serial_number).toBe('SN-12345');
      expect(component.manufacturer).toBe('CoffeeTech');
      expect(component.status).toBe(ComponentStatus.ACTIVE);
    });

    it('should accept location tracking properties', () => {
      const component = new EquipmentComponent();
      component.current_location_type = ComponentLocationType.MACHINE;
      component.current_location_ref = 'M-001';

      expect(component.current_location_type).toBe(ComponentLocationType.MACHINE);
      expect(component.current_location_ref).toBe('M-001');
    });

    it('should accept lifecycle properties', () => {
      const component = new EquipmentComponent();
      component.installation_date = new Date('2024-01-15');
      component.last_maintenance_date = new Date('2024-06-15');
      component.next_maintenance_date = new Date('2024-12-15');
      component.maintenance_interval_days = 180;
      component.working_hours = 5000;
      component.expected_lifetime_hours = 20000;

      expect(component.installation_date).toEqual(new Date('2024-01-15'));
      expect(component.last_maintenance_date).toEqual(new Date('2024-06-15'));
      expect(component.next_maintenance_date).toEqual(new Date('2024-12-15'));
      expect(component.maintenance_interval_days).toBe(180);
      expect(component.working_hours).toBe(5000);
      expect(component.expected_lifetime_hours).toBe(20000);
    });

    it('should accept replacement tracking properties', () => {
      const component = new EquipmentComponent();
      component.replacement_date = new Date('2025-01-15');
      component.replaced_by_component_id = 'new-component-uuid';
      component.replaces_component_id = 'old-component-uuid';

      expect(component.replacement_date).toEqual(new Date('2025-01-15'));
      expect(component.replaced_by_component_id).toBe('new-component-uuid');
      expect(component.replaces_component_id).toBe('old-component-uuid');
    });

    it('should accept notes and metadata', () => {
      const component = new EquipmentComponent();
      component.notes = 'Regular maintenance performed';
      component.metadata = {
        capacity_grams: 2000,
        material: 'stainless_steel',
      };

      expect(component.notes).toBe('Regular maintenance performed');
      expect(component.metadata).toEqual({
        capacity_grams: 2000,
        material: 'stainless_steel',
      });
    });

    it('should accept warranty expiration', () => {
      const component = new EquipmentComponent();
      component.warranty_expiration_date = new Date('2026-01-15');

      expect(component.warranty_expiration_date).toEqual(new Date('2026-01-15'));
    });

    it('should handle nullable fields', () => {
      const component = new EquipmentComponent();
      component.component_type = ComponentType.OTHER;
      component.name = 'Test Component';
      component.machine_id = null;
      component.model = null;
      component.serial_number = null;
      component.manufacturer = null;
      component.current_location_ref = null;
      component.installation_date = null;
      component.last_maintenance_date = null;
      component.next_maintenance_date = null;
      component.maintenance_interval_days = null;
      component.expected_lifetime_hours = null;
      component.replacement_date = null;
      component.replaced_by_component_id = null;
      component.replaces_component_id = null;
      component.notes = null;
      component.metadata = null;
      component.warranty_expiration_date = null;

      expect(component.machine_id).toBeNull();
      expect(component.model).toBeNull();
      expect(component.serial_number).toBeNull();
      expect(component.manufacturer).toBeNull();
      expect(component.current_location_ref).toBeNull();
      expect(component.installation_date).toBeNull();
      expect(component.notes).toBeNull();
      expect(component.metadata).toBeNull();
      expect(component.warranty_expiration_date).toBeNull();
    });
  });

  describe('ComponentType enum', () => {
    it('should have all expected types', () => {
      expect(ComponentType.HOPPER).toBe('hopper');
      expect(ComponentType.GRINDER).toBe('grinder');
      expect(ComponentType.BREWER).toBe('brewer');
      expect(ComponentType.MIXER).toBe('mixer');
      expect(ComponentType.COOLING_UNIT).toBe('cooling_unit');
      expect(ComponentType.PAYMENT_TERMINAL).toBe('payment_terminal');
      expect(ComponentType.DISPENSER).toBe('dispenser');
      expect(ComponentType.PUMP).toBe('pump');
      expect(ComponentType.WATER_FILTER).toBe('water_filter');
      expect(ComponentType.COIN_ACCEPTOR).toBe('coin_acceptor');
      expect(ComponentType.BILL_ACCEPTOR).toBe('bill_acceptor');
      expect(ComponentType.DISPLAY).toBe('display');
      expect(ComponentType.OTHER).toBe('other');
    });
  });

  describe('ComponentStatus enum', () => {
    it('should have all expected statuses', () => {
      expect(ComponentStatus.ACTIVE).toBe('active');
      expect(ComponentStatus.NEEDS_MAINTENANCE).toBe('needs_maintenance');
      expect(ComponentStatus.NEEDS_REPLACEMENT).toBe('needs_replacement');
      expect(ComponentStatus.REPLACED).toBe('replaced');
      expect(ComponentStatus.BROKEN).toBe('broken');
    });
  });

  describe('ComponentLocationType enum', () => {
    it('should have all expected location types', () => {
      expect(ComponentLocationType.MACHINE).toBe('machine');
      expect(ComponentLocationType.WAREHOUSE).toBe('warehouse');
      expect(ComponentLocationType.WASHING).toBe('washing');
      expect(ComponentLocationType.DRYING).toBe('drying');
      expect(ComponentLocationType.REPAIR).toBe('repair');
    });
  });
});
