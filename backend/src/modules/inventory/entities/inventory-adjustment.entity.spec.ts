import {
  InventoryAdjustment,
  AdjustmentStatus,
  AdjustmentReason,
} from './inventory-adjustment.entity';
import { InventoryLevelType } from './inventory-actual-count.entity';

describe('InventoryAdjustment Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const adjustment = new InventoryAdjustment();

      expect(adjustment.nomenclature_id).toBeUndefined();
      expect(adjustment.level_type).toBeUndefined();
      expect(adjustment.old_quantity).toBeUndefined();
      expect(adjustment.new_quantity).toBeUndefined();
      expect(adjustment.status).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const adjustment = new InventoryAdjustment();
      adjustment.nomenclature_id = 'nom-uuid';
      adjustment.level_type = InventoryLevelType.WAREHOUSE;
      adjustment.level_ref_id = 'warehouse-uuid';
      adjustment.old_quantity = 100;
      adjustment.new_quantity = 95;
      adjustment.adjustment_quantity = -5;
      adjustment.reason = AdjustmentReason.INVENTORY_DIFFERENCE;
      adjustment.status = AdjustmentStatus.PENDING;
      adjustment.created_by_user_id = 'user-uuid';

      expect(adjustment.nomenclature_id).toBe('nom-uuid');
      expect(adjustment.level_type).toBe(InventoryLevelType.WAREHOUSE);
      expect(adjustment.level_ref_id).toBe('warehouse-uuid');
      expect(adjustment.old_quantity).toBe(100);
      expect(adjustment.new_quantity).toBe(95);
      expect(adjustment.adjustment_quantity).toBe(-5);
      expect(adjustment.reason).toBe(AdjustmentReason.INVENTORY_DIFFERENCE);
      expect(adjustment.status).toBe(AdjustmentStatus.PENDING);
      expect(adjustment.created_by_user_id).toBe('user-uuid');
    });

    it('should accept approval workflow properties', () => {
      const adjustment = new InventoryAdjustment();
      adjustment.requires_approval = true;
      adjustment.approved_by_user_id = 'admin-uuid';
      adjustment.approved_at = new Date('2025-01-15T12:00:00Z');
      adjustment.applied_at = new Date('2025-01-15T12:05:00Z');

      expect(adjustment.requires_approval).toBe(true);
      expect(adjustment.approved_by_user_id).toBe('admin-uuid');
      expect(adjustment.approved_at).toEqual(new Date('2025-01-15T12:00:00Z'));
      expect(adjustment.applied_at).toEqual(new Date('2025-01-15T12:05:00Z'));
    });

    it('should accept actual count reference', () => {
      const adjustment = new InventoryAdjustment();
      adjustment.actual_count_id = 'count-uuid';

      expect(adjustment.actual_count_id).toBe('count-uuid');
    });

    it('should accept comment and metadata', () => {
      const adjustment = new InventoryAdjustment();
      adjustment.comment = 'Adjustment due to damaged goods';
      adjustment.metadata = { reason_details: 'Water damage' };

      expect(adjustment.comment).toBe('Adjustment due to damaged goods');
      expect(adjustment.metadata).toEqual({ reason_details: 'Water damage' });
    });

    it('should handle nullable fields', () => {
      const adjustment = new InventoryAdjustment();
      adjustment.nomenclature_id = 'nom-uuid';
      adjustment.level_type = InventoryLevelType.OPERATOR;
      adjustment.level_ref_id = 'operator-uuid';
      adjustment.old_quantity = 50;
      adjustment.new_quantity = 45;
      adjustment.adjustment_quantity = -5;
      adjustment.reason = AdjustmentReason.DAMAGE;
      adjustment.created_by_user_id = 'user-uuid';
      adjustment.actual_count_id = null;
      adjustment.comment = null;
      adjustment.approved_by_user_id = null;
      adjustment.approved_at = null;
      adjustment.applied_at = null;
      adjustment.metadata = null;

      expect(adjustment.actual_count_id).toBeNull();
      expect(adjustment.comment).toBeNull();
      expect(adjustment.approved_by_user_id).toBeNull();
      expect(adjustment.approved_at).toBeNull();
      expect(adjustment.applied_at).toBeNull();
      expect(adjustment.metadata).toBeNull();
    });

    it('should handle positive adjustments', () => {
      const adjustment = new InventoryAdjustment();
      adjustment.old_quantity = 50;
      adjustment.new_quantity = 55;
      adjustment.adjustment_quantity = 5;
      adjustment.reason = AdjustmentReason.RETURN;

      expect(adjustment.adjustment_quantity).toBe(5);
    });

    it('should handle negative adjustments', () => {
      const adjustment = new InventoryAdjustment();
      adjustment.old_quantity = 50;
      adjustment.new_quantity = 40;
      adjustment.adjustment_quantity = -10;
      adjustment.reason = AdjustmentReason.THEFT;

      expect(adjustment.adjustment_quantity).toBe(-10);
    });

    it('should handle decimal quantities', () => {
      const adjustment = new InventoryAdjustment();
      adjustment.old_quantity = 50.5;
      adjustment.new_quantity = 48.75;
      adjustment.adjustment_quantity = -1.75;

      expect(adjustment.old_quantity).toBe(50.5);
      expect(adjustment.new_quantity).toBe(48.75);
      expect(adjustment.adjustment_quantity).toBe(-1.75);
    });
  });

  describe('AdjustmentStatus enum', () => {
    it('should have all expected statuses', () => {
      expect(AdjustmentStatus.PENDING).toBe('pending');
      expect(AdjustmentStatus.APPROVED).toBe('approved');
      expect(AdjustmentStatus.REJECTED).toBe('rejected');
      expect(AdjustmentStatus.APPLIED).toBe('applied');
      expect(AdjustmentStatus.CANCELLED).toBe('cancelled');
    });
  });

  describe('AdjustmentReason enum', () => {
    it('should have all expected reasons', () => {
      expect(AdjustmentReason.INVENTORY_DIFFERENCE).toBe('inventory_difference');
      expect(AdjustmentReason.DAMAGE).toBe('damage');
      expect(AdjustmentReason.THEFT).toBe('theft');
      expect(AdjustmentReason.EXPIRY).toBe('expiry');
      expect(AdjustmentReason.RETURN).toBe('return');
      expect(AdjustmentReason.CORRECTION).toBe('correction');
      expect(AdjustmentReason.OTHER).toBe('other');
    });
  });
});
