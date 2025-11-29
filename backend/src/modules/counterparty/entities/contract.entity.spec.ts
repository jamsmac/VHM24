import { Contract, ContractStatus, CommissionType, TieredCommissionTier } from './contract.entity';

describe('Contract Entity', () => {
  let contract: Contract;

  beforeEach(() => {
    contract = new Contract();
    contract.id = '123e4567-e89b-12d3-a456-426614174000';
    contract.contract_number = 'CONTRACT-001';
    contract.start_date = new Date('2025-01-01');
    contract.end_date = new Date('2025-12-31');
    contract.status = ContractStatus.ACTIVE;
    contract.counterparty_id = 'counterparty-123';
    contract.commission_type = CommissionType.PERCENTAGE;
    contract.commission_rate = 15;
    contract.currency = 'UZS';
    contract.payment_term_days = 30;
    contract.payment_type = 'postpayment';
  });

  describe('isCurrentlyActive', () => {
    it('should return false when status is not ACTIVE', () => {
      // Arrange
      const statuses = [
        ContractStatus.DRAFT,
        ContractStatus.SUSPENDED,
        ContractStatus.EXPIRED,
        ContractStatus.TERMINATED,
      ];

      for (const status of statuses) {
        contract.status = status;
        contract.start_date = new Date('2020-01-01');
        contract.end_date = new Date('2030-12-31');

        // Act
        const result = contract.isCurrentlyActive();

        // Assert
        expect(result).toBe(false);
      }
    });

    it('should return false when current date is before start_date', () => {
      // Arrange
      contract.status = ContractStatus.ACTIVE;
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      contract.start_date = futureDate;
      contract.end_date = null;

      // Act
      const result = contract.isCurrentlyActive();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when current date is after end_date', () => {
      // Arrange
      contract.status = ContractStatus.ACTIVE;
      contract.start_date = new Date('2020-01-01');
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      contract.end_date = pastDate;

      // Act
      const result = contract.isCurrentlyActive();

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when status is ACTIVE and current date is within range', () => {
      // Arrange
      contract.status = ContractStatus.ACTIVE;
      contract.start_date = new Date('2020-01-01');
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      contract.end_date = futureDate;

      // Act
      const result = contract.isCurrentlyActive();

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when status is ACTIVE and end_date is null (indefinite contract)', () => {
      // Arrange
      contract.status = ContractStatus.ACTIVE;
      contract.start_date = new Date('2020-01-01');
      contract.end_date = null;

      // Act
      const result = contract.isCurrentlyActive();

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when start_date is today', () => {
      // Arrange
      contract.status = ContractStatus.ACTIVE;
      contract.start_date = new Date();
      contract.end_date = null;

      // Act
      const result = contract.isCurrentlyActive();

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when end_date is today', () => {
      // Arrange
      contract.status = ContractStatus.ACTIVE;
      contract.start_date = new Date('2020-01-01');
      contract.end_date = new Date();

      // Act
      const result = contract.isCurrentlyActive();

      // Assert
      expect(result).toBe(true);
    });

    it('should handle date string conversion correctly', () => {
      // Arrange
      contract.status = ContractStatus.ACTIVE;
      contract.start_date = new Date('2020-01-01');
      contract.end_date = new Date('2030-12-31');

      // Act
      const result = contract.isCurrentlyActive();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('ContractStatus enum', () => {
    it('should have all required status values', () => {
      expect(ContractStatus.DRAFT).toBe('draft');
      expect(ContractStatus.ACTIVE).toBe('active');
      expect(ContractStatus.SUSPENDED).toBe('suspended');
      expect(ContractStatus.EXPIRED).toBe('expired');
      expect(ContractStatus.TERMINATED).toBe('terminated');
    });
  });

  describe('CommissionType enum', () => {
    it('should have all required commission type values', () => {
      expect(CommissionType.PERCENTAGE).toBe('percentage');
      expect(CommissionType.FIXED).toBe('fixed');
      expect(CommissionType.TIERED).toBe('tiered');
      expect(CommissionType.HYBRID).toBe('hybrid');
    });
  });

  describe('Commission configuration', () => {
    describe('PERCENTAGE type', () => {
      it('should store percentage commission correctly', () => {
        // Arrange & Act
        contract.commission_type = CommissionType.PERCENTAGE;
        contract.commission_rate = 15.5;

        // Assert
        expect(contract.commission_type).toBe(CommissionType.PERCENTAGE);
        expect(contract.commission_rate).toBe(15.5);
      });
    });

    describe('FIXED type', () => {
      it('should store fixed commission correctly', () => {
        // Arrange & Act
        contract.commission_type = CommissionType.FIXED;
        contract.commission_fixed_amount = 5000000;
        contract.commission_fixed_period = 'monthly';

        // Assert
        expect(contract.commission_type).toBe(CommissionType.FIXED);
        expect(contract.commission_fixed_amount).toBe(5000000);
        expect(contract.commission_fixed_period).toBe('monthly');
      });

      it('should support all fixed period values', () => {
        const periods: Array<'daily' | 'weekly' | 'monthly' | 'quarterly'> = [
          'daily',
          'weekly',
          'monthly',
          'quarterly',
        ];

        for (const period of periods) {
          // Arrange & Act
          contract.commission_fixed_period = period;

          // Assert
          expect(contract.commission_fixed_period).toBe(period);
        }
      });
    });

    describe('TIERED type', () => {
      it('should store tiered commission correctly', () => {
        // Arrange
        const tiers: TieredCommissionTier[] = [
          { from: 0, to: 10000000, rate: 10 },
          { from: 10000000, to: 50000000, rate: 12 },
          { from: 50000000, to: null, rate: 15 },
        ];

        // Act
        contract.commission_type = CommissionType.TIERED;
        contract.commission_tiers = tiers;

        // Assert
        expect(contract.commission_type).toBe(CommissionType.TIERED);
        expect(contract.commission_tiers).toEqual(tiers);
        expect(contract.commission_tiers).toHaveLength(3);
      });

      it('should handle single tier configuration', () => {
        // Arrange
        const singleTier: TieredCommissionTier[] = [{ from: 0, to: null, rate: 15 }];

        // Act
        contract.commission_tiers = singleTier;

        // Assert
        expect(contract.commission_tiers).toHaveLength(1);
        expect(contract.commission_tiers[0].to).toBeNull();
      });

      it('should allow null commission_tiers', () => {
        // Arrange & Act
        contract.commission_tiers = null;

        // Assert
        expect(contract.commission_tiers).toBeNull();
      });
    });

    describe('HYBRID type', () => {
      it('should store hybrid commission correctly', () => {
        // Arrange & Act
        contract.commission_type = CommissionType.HYBRID;
        contract.commission_hybrid_fixed = 1000000;
        contract.commission_hybrid_rate = 5;

        // Assert
        expect(contract.commission_type).toBe(CommissionType.HYBRID);
        expect(contract.commission_hybrid_fixed).toBe(1000000);
        expect(contract.commission_hybrid_rate).toBe(5);
      });
    });
  });

  describe('Payment configuration', () => {
    it('should support all payment types', () => {
      const paymentTypes: Array<'prepayment' | 'postpayment' | 'on_delivery'> = [
        'prepayment',
        'postpayment',
        'on_delivery',
      ];

      for (const paymentType of paymentTypes) {
        // Arrange & Act
        contract.payment_type = paymentType;

        // Assert
        expect(contract.payment_type).toBe(paymentType);
      }
    });

    it('should store payment term days correctly', () => {
      // Arrange & Act
      contract.payment_term_days = 45;

      // Assert
      expect(contract.payment_term_days).toBe(45);
    });
  });

  describe('Additional conditions', () => {
    it('should store minimum_monthly_revenue correctly', () => {
      // Arrange & Act
      contract.minimum_monthly_revenue = 10000000;

      // Assert
      expect(contract.minimum_monthly_revenue).toBe(10000000);
    });

    it('should store penalty_rate correctly', () => {
      // Arrange & Act
      contract.penalty_rate = 0.5;

      // Assert
      expect(contract.penalty_rate).toBe(0.5);
    });

    it('should handle nullable optional fields', () => {
      // Arrange & Act
      contract.minimum_monthly_revenue = null;
      contract.penalty_rate = null;
      contract.special_conditions = null;
      contract.notes = null;
      contract.contract_file_id = null;

      // Assert
      expect(contract.minimum_monthly_revenue).toBeNull();
      expect(contract.penalty_rate).toBeNull();
      expect(contract.special_conditions).toBeNull();
      expect(contract.notes).toBeNull();
      expect(contract.contract_file_id).toBeNull();
    });

    it('should store special_conditions text correctly', () => {
      // Arrange
      const specialConditions =
        'This contract has special terms including: ' +
        '1. Extended payment period for first 3 months. ' +
        '2. Volume discounts apply.';

      // Act
      contract.special_conditions = specialConditions;

      // Assert
      expect(contract.special_conditions).toBe(specialConditions);
    });
  });

  describe('Currency', () => {
    it('should default to UZS currency', () => {
      // Contract initialized with UZS
      expect(contract.currency).toBe('UZS');
    });

    it('should allow setting currency', () => {
      // Arrange & Act
      contract.currency = 'USD';

      // Assert
      expect(contract.currency).toBe('USD');
    });
  });

  describe('TieredCommissionTier interface', () => {
    it('should have correct structure', () => {
      // Arrange
      const tier: TieredCommissionTier = {
        from: 0,
        to: 10000000,
        rate: 10,
      };

      // Assert
      expect(tier).toHaveProperty('from');
      expect(tier).toHaveProperty('to');
      expect(tier).toHaveProperty('rate');
      expect(typeof tier.from).toBe('number');
      expect(typeof tier.rate).toBe('number');
    });

    it('should allow null for "to" field (unlimited)', () => {
      // Arrange
      const unlimitedTier: TieredCommissionTier = {
        from: 50000000,
        to: null,
        rate: 15,
      };

      // Assert
      expect(unlimitedTier.to).toBeNull();
    });
  });

  describe('Edge cases for isCurrentlyActive', () => {
    it('should handle contracts starting and ending on the same day', () => {
      // Arrange
      const today = new Date();
      contract.status = ContractStatus.ACTIVE;
      contract.start_date = today;
      contract.end_date = today;

      // Act
      const result = contract.isCurrentlyActive();

      // Assert
      expect(result).toBe(true);
    });

    it('should handle very old start dates', () => {
      // Arrange
      contract.status = ContractStatus.ACTIVE;
      contract.start_date = new Date('1990-01-01');
      contract.end_date = null;

      // Act
      const result = contract.isCurrentlyActive();

      // Assert
      expect(result).toBe(true);
    });

    it('should handle far future end dates', () => {
      // Arrange
      contract.status = ContractStatus.ACTIVE;
      contract.start_date = new Date('2020-01-01');
      contract.end_date = new Date('2099-12-31');

      // Act
      const result = contract.isCurrentlyActive();

      // Assert
      expect(result).toBe(true);
    });
  });
});
