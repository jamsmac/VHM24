import { InventoryMovement, MovementType } from './inventory-movement.entity';

describe('InventoryMovement Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const movement = new InventoryMovement();

      expect(movement.movement_type).toBeUndefined();
      expect(movement.nomenclature_id).toBeUndefined();
      expect(movement.quantity).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const movement = new InventoryMovement();
      movement.movement_type = MovementType.WAREHOUSE_TO_OPERATOR;
      movement.nomenclature_id = 'nomenclature-uuid';
      movement.quantity = 50.5;
      movement.performed_by_user_id = 'user-uuid';

      expect(movement.movement_type).toBe(MovementType.WAREHOUSE_TO_OPERATOR);
      expect(movement.nomenclature_id).toBe('nomenclature-uuid');
      expect(movement.quantity).toBe(50.5);
      expect(movement.performed_by_user_id).toBe('user-uuid');
    });

    it('should accept operator-related properties', () => {
      const movement = new InventoryMovement();
      movement.movement_type = MovementType.WAREHOUSE_TO_OPERATOR;
      movement.operator_id = 'operator-uuid';

      expect(movement.operator_id).toBe('operator-uuid');
    });

    it('should accept machine-related properties', () => {
      const movement = new InventoryMovement();
      movement.movement_type = MovementType.OPERATOR_TO_MACHINE;
      movement.machine_id = 'machine-uuid';

      expect(movement.machine_id).toBe('machine-uuid');
    });

    it('should accept task-related properties', () => {
      const movement = new InventoryMovement();
      movement.task_id = 'task-uuid';

      expect(movement.task_id).toBe('task-uuid');
    });

    it('should accept operation date and notes', () => {
      const movement = new InventoryMovement();
      movement.operation_date = new Date('2025-11-15T14:30:00Z');
      movement.notes = 'Refill task for machine M-001';

      expect(movement.operation_date).toEqual(new Date('2025-11-15T14:30:00Z'));
      expect(movement.notes).toBe('Refill task for machine M-001');
    });

    it('should accept metadata', () => {
      const movement = new InventoryMovement();
      movement.metadata = {
        purchase_price: 150.5,
        invoice_number: 'INV-2024-001',
      };

      expect(movement.metadata).toEqual({
        purchase_price: 150.5,
        invoice_number: 'INV-2024-001',
      });
    });

    it('should handle nullable fields', () => {
      const movement = new InventoryMovement();
      movement.movement_type = MovementType.WAREHOUSE_IN;
      movement.nomenclature_id = 'nom-uuid';
      movement.quantity = 100;
      movement.performed_by_user_id = null;
      movement.operator_id = null;
      movement.machine_id = null;
      movement.task_id = null;
      movement.operation_date = null;
      movement.notes = null;
      movement.metadata = null;

      expect(movement.performed_by_user_id).toBeNull();
      expect(movement.operator_id).toBeNull();
      expect(movement.machine_id).toBeNull();
      expect(movement.task_id).toBeNull();
      expect(movement.operation_date).toBeNull();
      expect(movement.notes).toBeNull();
      expect(movement.metadata).toBeNull();
    });

    it('should handle decimal quantities', () => {
      const movement = new InventoryMovement();
      movement.quantity = 15.125;

      expect(movement.quantity).toBe(15.125);
    });
  });

  describe('MovementType enum', () => {
    it('should have all warehouse movement types', () => {
      expect(MovementType.WAREHOUSE_IN).toBe('warehouse_in');
      expect(MovementType.WAREHOUSE_OUT).toBe('warehouse_out');
    });

    it('should have all warehouse-operator movement types', () => {
      expect(MovementType.WAREHOUSE_TO_OPERATOR).toBe('warehouse_to_operator');
      expect(MovementType.OPERATOR_TO_WAREHOUSE).toBe('operator_to_warehouse');
    });

    it('should have all operator-machine movement types', () => {
      expect(MovementType.OPERATOR_TO_MACHINE).toBe('operator_to_machine');
      expect(MovementType.MACHINE_TO_OPERATOR).toBe('machine_to_operator');
    });

    it('should have sale movement type', () => {
      expect(MovementType.MACHINE_SALE).toBe('machine_sale');
    });

    it('should have correction movement types', () => {
      expect(MovementType.ADJUSTMENT).toBe('adjustment');
      expect(MovementType.WRITE_OFF).toBe('write_off');
    });

    it('should have reservation movement types', () => {
      expect(MovementType.WAREHOUSE_RESERVATION).toBe('warehouse_reservation');
      expect(MovementType.WAREHOUSE_RESERVATION_RELEASE).toBe('warehouse_reservation_release');
    });
  });
});
