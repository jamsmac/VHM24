import { Location, LocationStatus } from './location.entity';

describe('Location Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const location = new Location();

      expect(location.name).toBeUndefined();
      expect(location.type_code).toBeUndefined();
      expect(location.status).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const location = new Location();
      location.name = 'Shopping Mall Entrance';
      location.type_code = 'mall';
      location.status = LocationStatus.ACTIVE;
      location.description = 'High traffic area';

      expect(location.name).toBe('Shopping Mall Entrance');
      expect(location.type_code).toBe('mall');
      expect(location.status).toBe(LocationStatus.ACTIVE);
      expect(location.description).toBe('High traffic area');
    });

    it('should accept address fields', () => {
      const location = new Location();
      location.city = 'Tashkent';
      location.address = 'Amir Temur Avenue 123';
      location.postal_code = '100000';
      location.latitude = 41.311081;
      location.longitude = 69.279737;

      expect(location.city).toBe('Tashkent');
      expect(location.address).toBe('Amir Temur Avenue 123');
      expect(location.postal_code).toBe('100000');
      expect(location.latitude).toBe(41.311081);
      expect(location.longitude).toBe(69.279737);
    });

    it('should accept contact information', () => {
      const location = new Location();
      location.contact_person = 'John Doe';
      location.contact_phone = '+998901234567';
      location.contact_email = 'location@example.com';

      expect(location.contact_person).toBe('John Doe');
      expect(location.contact_phone).toBe('+998901234567');
      expect(location.contact_email).toBe('location@example.com');
    });

    it('should accept business information', () => {
      const location = new Location();
      location.monthly_rent = 5000000;
      location.counterparty_id = 'counterparty-uuid';
      location.estimated_traffic = 10000;

      expect(location.monthly_rent).toBe(5000000);
      expect(location.counterparty_id).toBe('counterparty-uuid');
      expect(location.estimated_traffic).toBe(10000);
    });

    it('should accept working hours', () => {
      const location = new Location();
      location.working_hours = {
        monday: { from: '09:00', to: '18:00' },
        tuesday: { from: '09:00', to: '18:00' },
        wednesday: { from: '09:00', to: '18:00' },
        thursday: { from: '09:00', to: '18:00' },
        friday: { from: '09:00', to: '18:00' },
        saturday: { from: '10:00', to: '16:00' },
        sunday: { from: '10:00', to: '16:00' },
      };

      expect(location.working_hours?.monday).toEqual({ from: '09:00', to: '18:00' });
      expect(location.working_hours?.saturday).toEqual({ from: '10:00', to: '16:00' });
    });

    it('should accept contract details', () => {
      const location = new Location();
      location.contract_start_date = new Date('2024-01-01');
      location.contract_end_date = new Date('2025-12-31');
      location.contract_notes = 'Two year contract with renewal option';

      expect(location.contract_start_date).toEqual(new Date('2024-01-01'));
      expect(location.contract_end_date).toEqual(new Date('2025-12-31'));
      expect(location.contract_notes).toBe('Two year contract with renewal option');
    });

    it('should accept metadata', () => {
      const location = new Location();
      location.metadata = {
        floor: 1,
        area_sqm: 2.5,
        power_available: true,
      };

      expect(location.metadata).toEqual({
        floor: 1,
        area_sqm: 2.5,
        power_available: true,
      });
    });

    it('should handle nullable fields', () => {
      const location = new Location();
      location.name = 'Test Location';
      location.type_code = 'test';
      location.city = 'Test City';
      location.address = 'Test Address';
      location.description = null;
      location.postal_code = null;
      location.latitude = null;
      location.longitude = null;
      location.contact_person = null;
      location.contact_phone = null;
      location.contact_email = null;
      location.monthly_rent = null;
      location.counterparty_id = null;
      location.working_hours = null;
      location.contract_start_date = null;
      location.contract_end_date = null;
      location.contract_notes = null;
      location.metadata = null;

      expect(location.description).toBeNull();
      expect(location.postal_code).toBeNull();
      expect(location.latitude).toBeNull();
      expect(location.longitude).toBeNull();
      expect(location.contact_person).toBeNull();
      expect(location.contact_phone).toBeNull();
      expect(location.contact_email).toBeNull();
      expect(location.monthly_rent).toBeNull();
      expect(location.counterparty_id).toBeNull();
      expect(location.working_hours).toBeNull();
      expect(location.contract_start_date).toBeNull();
      expect(location.contract_end_date).toBeNull();
      expect(location.contract_notes).toBeNull();
      expect(location.metadata).toBeNull();
    });
  });

  describe('LocationStatus enum', () => {
    it('should have all expected statuses', () => {
      expect(LocationStatus.ACTIVE).toBe('active');
      expect(LocationStatus.INACTIVE).toBe('inactive');
      expect(LocationStatus.PENDING).toBe('pending');
    });
  });
});
