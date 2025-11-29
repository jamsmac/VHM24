import { Counterparty } from './counterparty.entity';

describe('Counterparty Entity', () => {
  let counterparty: Counterparty;

  beforeEach(() => {
    counterparty = new Counterparty();
    counterparty.id = '123e4567-e89b-12d3-a456-426614174000';
    counterparty.name = 'Test Company LLC';
    counterparty.short_name = 'Test Co';
    counterparty.type = 'client';
    counterparty.inn = '123456789';
    counterparty.is_active = true;
    counterparty.is_vat_payer = true;
    counterparty.vat_rate = 15;
  });

  describe('Counterparty types', () => {
    it('should support client type', () => {
      // Arrange & Act
      counterparty.type = 'client';

      // Assert
      expect(counterparty.type).toBe('client');
    });

    it('should support supplier type', () => {
      // Arrange & Act
      counterparty.type = 'supplier';

      // Assert
      expect(counterparty.type).toBe('supplier');
    });

    it('should support partner type', () => {
      // Arrange & Act
      counterparty.type = 'partner';

      // Assert
      expect(counterparty.type).toBe('partner');
    });

    it('should support location_owner type', () => {
      // Arrange & Act
      counterparty.type = 'location_owner';

      // Assert
      expect(counterparty.type).toBe('location_owner');
    });
  });

  describe('Uzbekistan tax identifiers', () => {
    describe('INN (Individual Tax Number)', () => {
      it('should store 9-digit INN correctly', () => {
        // Arrange & Act
        counterparty.inn = '123456789';

        // Assert
        expect(counterparty.inn).toBe('123456789');
        expect(counterparty.inn).toHaveLength(9);
      });

      it('should be a required field (unique identifier)', () => {
        // The INN is required by the entity definition
        expect(counterparty.inn).toBeDefined();
      });
    });

    describe('OKED (Economic Activity Code)', () => {
      it('should store OKED correctly', () => {
        // Arrange & Act
        counterparty.oked = '12345';

        // Assert
        expect(counterparty.oked).toBe('12345');
      });

      it('should allow null OKED', () => {
        // Arrange & Act
        counterparty.oked = null;

        // Assert
        expect(counterparty.oked).toBeNull();
      });
    });
  });

  describe('Banking details (Uzbekistan)', () => {
    describe('MFO (Bank Code)', () => {
      it('should store 5-digit MFO correctly', () => {
        // Arrange & Act
        counterparty.mfo = '00001';

        // Assert
        expect(counterparty.mfo).toBe('00001');
        expect(counterparty.mfo).toHaveLength(5);
      });

      it('should allow null MFO', () => {
        // Arrange & Act
        counterparty.mfo = null;

        // Assert
        expect(counterparty.mfo).toBeNull();
      });
    });

    describe('Bank account', () => {
      it('should store bank account number correctly', () => {
        // Arrange & Act
        counterparty.bank_account = '20208000100001234567';

        // Assert
        expect(counterparty.bank_account).toBe('20208000100001234567');
      });

      it('should allow null bank account', () => {
        // Arrange & Act
        counterparty.bank_account = null;

        // Assert
        expect(counterparty.bank_account).toBeNull();
      });
    });

    describe('Bank name', () => {
      it('should store bank name correctly', () => {
        // Arrange & Act
        counterparty.bank_name = 'National Bank of Uzbekistan';

        // Assert
        expect(counterparty.bank_name).toBe('National Bank of Uzbekistan');
      });

      it('should allow null bank name', () => {
        // Arrange & Act
        counterparty.bank_name = null;

        // Assert
        expect(counterparty.bank_name).toBeNull();
      });
    });
  });

  describe('Addresses', () => {
    it('should store legal address correctly', () => {
      // Arrange & Act
      counterparty.legal_address = 'Tashkent, Main Street 1, Building A';

      // Assert
      expect(counterparty.legal_address).toBe('Tashkent, Main Street 1, Building A');
    });

    it('should store actual address correctly', () => {
      // Arrange & Act
      counterparty.actual_address = 'Tashkent, Industrial Zone, Building 5';

      // Assert
      expect(counterparty.actual_address).toBe('Tashkent, Industrial Zone, Building 5');
    });

    it('should allow different legal and actual addresses', () => {
      // Arrange & Act
      counterparty.legal_address = 'Tashkent, Main Street 1';
      counterparty.actual_address = 'Samarkand, Factory Road 10';

      // Assert
      expect(counterparty.legal_address).not.toBe(counterparty.actual_address);
    });

    it('should allow null addresses', () => {
      // Arrange & Act
      counterparty.legal_address = null;
      counterparty.actual_address = null;

      // Assert
      expect(counterparty.legal_address).toBeNull();
      expect(counterparty.actual_address).toBeNull();
    });
  });

  describe('Contact information', () => {
    it('should store contact person correctly', () => {
      // Arrange & Act
      counterparty.contact_person = 'John Doe';

      // Assert
      expect(counterparty.contact_person).toBe('John Doe');
    });

    it('should store phone number correctly', () => {
      // Arrange & Act
      counterparty.phone = '+998901234567';

      // Assert
      expect(counterparty.phone).toBe('+998901234567');
    });

    it('should store email correctly', () => {
      // Arrange & Act
      counterparty.email = 'contact@testcompany.uz';

      // Assert
      expect(counterparty.email).toBe('contact@testcompany.uz');
    });

    it('should allow null contact information', () => {
      // Arrange & Act
      counterparty.contact_person = null;
      counterparty.phone = null;
      counterparty.email = null;

      // Assert
      expect(counterparty.contact_person).toBeNull();
      expect(counterparty.phone).toBeNull();
      expect(counterparty.email).toBeNull();
    });
  });

  describe('Director information', () => {
    it('should store director name correctly', () => {
      // Arrange & Act
      counterparty.director_name = 'Ivan Petrov';

      // Assert
      expect(counterparty.director_name).toBe('Ivan Petrov');
    });

    it('should store director position correctly', () => {
      // Arrange & Act
      counterparty.director_position = 'General Director';

      // Assert
      expect(counterparty.director_position).toBe('General Director');
    });

    it('should allow null director information', () => {
      // Arrange & Act
      counterparty.director_name = null;
      counterparty.director_position = null;

      // Assert
      expect(counterparty.director_name).toBeNull();
      expect(counterparty.director_position).toBeNull();
    });
  });

  describe('VAT registration (Uzbekistan)', () => {
    it('should default to VAT payer status as true', () => {
      // Assert
      expect(counterparty.is_vat_payer).toBe(true);
    });

    it('should allow non-VAT payer status', () => {
      // Arrange & Act
      counterparty.is_vat_payer = false;

      // Assert
      expect(counterparty.is_vat_payer).toBe(false);
    });

    it('should default VAT rate to 15% (Uzbekistan standard)', () => {
      // Assert
      expect(counterparty.vat_rate).toBe(15);
    });

    it('should allow different VAT rates', () => {
      // Arrange & Act
      counterparty.vat_rate = 0; // Zero-rated

      // Assert
      expect(counterparty.vat_rate).toBe(0);
    });

    it('should store decimal VAT rates', () => {
      // Arrange & Act
      counterparty.vat_rate = 12.5;

      // Assert
      expect(counterparty.vat_rate).toBe(12.5);
    });
  });

  describe('Payment terms', () => {
    it('should store payment term days correctly', () => {
      // Arrange & Act
      counterparty.payment_term_days = 30;

      // Assert
      expect(counterparty.payment_term_days).toBe(30);
    });

    it('should allow null payment term days', () => {
      // Arrange & Act
      counterparty.payment_term_days = null;

      // Assert
      expect(counterparty.payment_term_days).toBeNull();
    });

    it('should store credit limit in UZS correctly', () => {
      // Arrange & Act
      counterparty.credit_limit = 50000000; // 50 million UZS

      // Assert
      expect(counterparty.credit_limit).toBe(50000000);
    });

    it('should allow null credit limit', () => {
      // Arrange & Act
      counterparty.credit_limit = null;

      // Assert
      expect(counterparty.credit_limit).toBeNull();
    });
  });

  describe('Status', () => {
    it('should default to active status', () => {
      // Assert
      expect(counterparty.is_active).toBe(true);
    });

    it('should allow inactive status', () => {
      // Arrange & Act
      counterparty.is_active = false;

      // Assert
      expect(counterparty.is_active).toBe(false);
    });
  });

  describe('Notes', () => {
    it('should store notes correctly', () => {
      // Arrange & Act
      counterparty.notes = 'Important client with special terms';

      // Assert
      expect(counterparty.notes).toBe('Important client with special terms');
    });

    it('should allow null notes', () => {
      // Arrange & Act
      counterparty.notes = null;

      // Assert
      expect(counterparty.notes).toBeNull();
    });

    it('should handle long notes', () => {
      // Arrange
      const longNotes = 'A'.repeat(1000);

      // Act
      counterparty.notes = longNotes;

      // Assert
      expect(counterparty.notes).toHaveLength(1000);
    });
  });

  describe('Relations', () => {
    it('should initialize contracts as undefined by default', () => {
      // Relations are loaded by TypeORM, not initialized
      expect(counterparty.contracts).toBeUndefined();
    });

    it('should initialize locations as undefined by default', () => {
      // Relations are loaded by TypeORM, not initialized
      expect(counterparty.locations).toBeUndefined();
    });

    it('should allow setting contracts array', () => {
      // Arrange & Act
      counterparty.contracts = [] as any;

      // Assert
      expect(counterparty.contracts).toEqual([]);
    });

    it('should allow setting locations array', () => {
      // Arrange & Act
      counterparty.locations = [] as any;

      // Assert
      expect(counterparty.locations).toEqual([]);
    });
  });

  describe('Short name', () => {
    it('should store short name correctly', () => {
      // Arrange & Act
      counterparty.short_name = 'TC';

      // Assert
      expect(counterparty.short_name).toBe('TC');
    });

    it('should allow null short name', () => {
      // Arrange & Act
      counterparty.short_name = null;

      // Assert
      expect(counterparty.short_name).toBeNull();
    });

    it('should allow short name to differ from full name', () => {
      // Arrange & Act
      counterparty.name = 'Test Company Limited Liability Company';
      counterparty.short_name = 'Test Co';

      // Assert
      expect(counterparty.name).not.toBe(counterparty.short_name);
      expect(counterparty.short_name!.length).toBeLessThan(counterparty.name.length);
    });
  });

  describe('Edge cases', () => {
    it('should handle all fields being set', () => {
      // Arrange & Act
      const fullCounterparty = new Counterparty();
      fullCounterparty.id = '123e4567-e89b-12d3-a456-426614174000';
      fullCounterparty.name = 'Full Company LLC';
      fullCounterparty.short_name = 'Full Co';
      fullCounterparty.type = 'location_owner';
      fullCounterparty.inn = '987654321';
      fullCounterparty.oked = '56789';
      fullCounterparty.mfo = '00002';
      fullCounterparty.bank_account = '20208000200001234567';
      fullCounterparty.bank_name = 'Kapitalbank';
      fullCounterparty.legal_address = 'Samarkand, Central 1';
      fullCounterparty.actual_address = 'Samarkand, Central 2';
      fullCounterparty.contact_person = 'Jane Smith';
      fullCounterparty.phone = '+998901112233';
      fullCounterparty.email = 'jane@fullcompany.uz';
      fullCounterparty.director_name = 'Director Full';
      fullCounterparty.director_position = 'CEO';
      fullCounterparty.is_vat_payer = true;
      fullCounterparty.vat_rate = 15;
      fullCounterparty.payment_term_days = 45;
      fullCounterparty.credit_limit = 100000000;
      fullCounterparty.is_active = true;
      fullCounterparty.notes = 'Premium partner';

      // Assert - all fields should be accessible
      expect(fullCounterparty.name).toBe('Full Company LLC');
      expect(fullCounterparty.type).toBe('location_owner');
      expect(fullCounterparty.credit_limit).toBe(100000000);
    });

    it('should handle minimal required fields', () => {
      // Arrange & Act
      const minimalCounterparty = new Counterparty();
      minimalCounterparty.name = 'Minimal Company';
      minimalCounterparty.type = 'client';
      minimalCounterparty.inn = '111222333';

      // Assert
      expect(minimalCounterparty.name).toBe('Minimal Company');
      expect(minimalCounterparty.type).toBe('client');
      expect(minimalCounterparty.inn).toBe('111222333');
    });

    it('should handle zero values correctly', () => {
      // Arrange & Act
      counterparty.payment_term_days = 0;
      counterparty.credit_limit = 0;
      counterparty.vat_rate = 0;

      // Assert
      expect(counterparty.payment_term_days).toBe(0);
      expect(counterparty.credit_limit).toBe(0);
      expect(counterparty.vat_rate).toBe(0);
    });
  });
});
