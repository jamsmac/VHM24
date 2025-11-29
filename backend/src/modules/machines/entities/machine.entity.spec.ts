import { Machine, MachineStatus } from './machine.entity';

describe('Machine Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const machine = new Machine();

      expect(machine.machine_number).toBeUndefined();
      expect(machine.name).toBeUndefined();
      expect(machine.type_code).toBeUndefined();
      expect(machine.status).toBeUndefined();
      expect(machine.location_id).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const machine = new Machine();
      machine.machine_number = 'M-001';
      machine.name = 'Coffee Machine Lobby';
      machine.type_code = 'coffee_vending';
      machine.status = MachineStatus.ACTIVE;
      machine.location_id = 'location-uuid';
      machine.contract_id = 'contract-uuid';

      expect(machine.machine_number).toBe('M-001');
      expect(machine.name).toBe('Coffee Machine Lobby');
      expect(machine.type_code).toBe('coffee_vending');
      expect(machine.status).toBe(MachineStatus.ACTIVE);
      expect(machine.location_id).toBe('location-uuid');
      expect(machine.contract_id).toBe('contract-uuid');
    });

    it('should accept machine details', () => {
      const machine = new Machine();
      machine.manufacturer = 'Saeco';
      machine.model = 'Atlante 500';
      machine.serial_number = 'SN-12345678';
      machine.year_of_manufacture = 2022;

      expect(machine.manufacturer).toBe('Saeco');
      expect(machine.model).toBe('Atlante 500');
      expect(machine.serial_number).toBe('SN-12345678');
      expect(machine.year_of_manufacture).toBe(2022);
    });

    it('should accept installation dates', () => {
      const machine = new Machine();
      const installDate = new Date('2023-01-15');
      const lastMaintenance = new Date('2024-06-15');
      const nextMaintenance = new Date('2025-01-15');

      machine.installation_date = installDate;
      machine.last_maintenance_date = lastMaintenance;
      machine.next_maintenance_date = nextMaintenance;

      expect(machine.installation_date).toEqual(installDate);
      expect(machine.last_maintenance_date).toEqual(lastMaintenance);
      expect(machine.next_maintenance_date).toEqual(nextMaintenance);
    });

    it('should accept capacity values', () => {
      const machine = new Machine();
      machine.max_product_slots = 10;
      machine.current_product_count = 5;
      machine.cash_capacity = 50000;
      machine.current_cash_amount = 15000;

      expect(machine.max_product_slots).toBe(10);
      expect(machine.current_product_count).toBe(5);
      expect(machine.cash_capacity).toBe(50000);
      expect(machine.current_cash_amount).toBe(15000);
    });

    it('should accept payment method flags', () => {
      const machine = new Machine();
      machine.accepts_cash = true;
      machine.accepts_card = true;
      machine.accepts_qr = true;
      machine.accepts_nfc = false;

      expect(machine.accepts_cash).toBe(true);
      expect(machine.accepts_card).toBe(true);
      expect(machine.accepts_qr).toBe(true);
      expect(machine.accepts_nfc).toBe(false);
    });

    it('should accept QR code information', () => {
      const machine = new Machine();
      machine.qr_code = 'QR-M001-ABC123';
      machine.qr_code_url = 'https://vendhub.uz/complaint/QR-M001-ABC123';

      expect(machine.qr_code).toBe('QR-M001-ABC123');
      expect(machine.qr_code_url).toBe('https://vendhub.uz/complaint/QR-M001-ABC123');
    });

    it('should accept assigned user IDs', () => {
      const machine = new Machine();
      machine.assigned_operator_id = 'operator-uuid';
      machine.assigned_technician_id = 'technician-uuid';

      expect(machine.assigned_operator_id).toBe('operator-uuid');
      expect(machine.assigned_technician_id).toBe('technician-uuid');
    });

    it('should accept notes and metadata', () => {
      const machine = new Machine();
      machine.notes = 'Machine near entrance';
      machine.settings = { temperature: 85, pressure: 15 };
      machine.metadata = { installation_notes: 'Floor 1' };

      expect(machine.notes).toBe('Machine near entrance');
      expect(machine.settings).toEqual({ temperature: 85, pressure: 15 });
      expect(machine.metadata).toEqual({ installation_notes: 'Floor 1' });
    });

    it('should accept inventory alert threshold', () => {
      const machine = new Machine();
      machine.low_stock_threshold_percent = 15;

      expect(machine.low_stock_threshold_percent).toBe(15);
    });

    it('should accept statistics', () => {
      const machine = new Machine();
      machine.total_sales_count = 5000;
      machine.total_revenue = 25000000;
      machine.last_refill_date = new Date('2025-01-10T08:00:00Z');
      machine.last_collection_date = new Date('2025-01-12T14:00:00Z');

      expect(machine.total_sales_count).toBe(5000);
      expect(machine.total_revenue).toBe(25000000);
      expect(machine.last_refill_date).toEqual(new Date('2025-01-10T08:00:00Z'));
      expect(machine.last_collection_date).toEqual(new Date('2025-01-12T14:00:00Z'));
    });

    it('should accept connectivity tracking', () => {
      const machine = new Machine();
      machine.last_ping_at = new Date('2025-01-15T10:00:00Z');
      machine.is_online = true;
      machine.connectivity_status = 'online';

      expect(machine.last_ping_at).toEqual(new Date('2025-01-15T10:00:00Z'));
      expect(machine.is_online).toBe(true);
      expect(machine.connectivity_status).toBe('online');
    });

    it('should accept depreciation information', () => {
      const machine = new Machine();
      machine.purchase_price = 15000000;
      machine.purchase_date = new Date('2022-01-15');
      machine.depreciation_years = 5;
      machine.depreciation_method = 'linear';
      machine.accumulated_depreciation = 6000000;
      machine.last_depreciation_date = new Date('2025-01-01');

      expect(machine.purchase_price).toBe(15000000);
      expect(machine.purchase_date).toEqual(new Date('2022-01-15'));
      expect(machine.depreciation_years).toBe(5);
      expect(machine.depreciation_method).toBe('linear');
      expect(machine.accumulated_depreciation).toBe(6000000);
      expect(machine.last_depreciation_date).toEqual(new Date('2025-01-01'));
    });

    it('should accept disposal tracking', () => {
      const machine = new Machine();
      machine.is_disposed = true;
      machine.disposal_date = new Date('2025-01-15');
      machine.disposal_reason = 'End of life';
      machine.disposal_transaction_id = 'transaction-uuid';

      expect(machine.is_disposed).toBe(true);
      expect(machine.disposal_date).toEqual(new Date('2025-01-15'));
      expect(machine.disposal_reason).toBe('End of life');
      expect(machine.disposal_transaction_id).toBe('transaction-uuid');
    });

    it('should handle nullable fields', () => {
      const machine = new Machine();
      machine.machine_number = 'M-001';
      machine.name = 'Test Machine';
      machine.type_code = 'coffee';
      machine.location_id = 'location-uuid';
      machine.qr_code = 'QR-001';
      machine.contract_id = null;
      machine.manufacturer = null;
      machine.model = null;
      machine.serial_number = null;
      machine.year_of_manufacture = null;
      machine.installation_date = null;
      machine.notes = null;
      machine.settings = null;
      machine.metadata = null;
      machine.assigned_operator_id = null;
      machine.assigned_technician_id = null;

      expect(machine.contract_id).toBeNull();
      expect(machine.manufacturer).toBeNull();
      expect(machine.model).toBeNull();
      expect(machine.serial_number).toBeNull();
      expect(machine.year_of_manufacture).toBeNull();
      expect(machine.installation_date).toBeNull();
      expect(machine.notes).toBeNull();
      expect(machine.settings).toBeNull();
      expect(machine.metadata).toBeNull();
      expect(machine.assigned_operator_id).toBeNull();
      expect(machine.assigned_technician_id).toBeNull();
    });
  });

  describe('MachineStatus enum', () => {
    it('should have all expected statuses', () => {
      expect(MachineStatus.ACTIVE).toBe('active');
      expect(MachineStatus.LOW_STOCK).toBe('low_stock');
      expect(MachineStatus.ERROR).toBe('error');
      expect(MachineStatus.MAINTENANCE).toBe('maintenance');
      expect(MachineStatus.OFFLINE).toBe('offline');
      expect(MachineStatus.DISABLED).toBe('disabled');
    });
  });
});
