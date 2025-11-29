import {
  InventoryReservation,
  ReservationStatus,
  InventoryLevel,
} from './inventory-reservation.entity';

describe('InventoryReservation Entity', () => {
  describe('generateReservationNumber hook', () => {
    it('should generate a reservation number if not provided', () => {
      const reservation = new InventoryReservation();
      reservation.task_id = 'task-uuid';
      reservation.nomenclature_id = 'nom-uuid';

      reservation.generateReservationNumber();

      expect(reservation.reservation_number).toBeDefined();
      expect(reservation.reservation_number).toMatch(/^RSV-\d+-\d{4}$/);
    });

    it('should not overwrite existing reservation number', () => {
      const reservation = new InventoryReservation();
      reservation.reservation_number = 'RSV-EXISTING-0001';

      reservation.generateReservationNumber();

      expect(reservation.reservation_number).toBe('RSV-EXISTING-0001');
    });

    it('should generate unique numbers for different instances', () => {
      const reservation1 = new InventoryReservation();
      const reservation2 = new InventoryReservation();

      reservation1.generateReservationNumber();
      reservation2.generateReservationNumber();

      // Numbers might be similar but should be different due to random component
      expect(reservation1.reservation_number).not.toBe(reservation2.reservation_number);
    });
  });

  describe('quantity_remaining getter', () => {
    it('should calculate remaining quantity correctly', () => {
      const reservation = new InventoryReservation();
      reservation.quantity_reserved = 100;
      reservation.quantity_fulfilled = 30;

      expect(reservation.quantity_remaining).toBe(70);
    });

    it('should return 0 when fully fulfilled', () => {
      const reservation = new InventoryReservation();
      reservation.quantity_reserved = 50;
      reservation.quantity_fulfilled = 50;

      expect(reservation.quantity_remaining).toBe(0);
    });

    it('should return negative when over-fulfilled', () => {
      const reservation = new InventoryReservation();
      reservation.quantity_reserved = 50;
      reservation.quantity_fulfilled = 60;

      expect(reservation.quantity_remaining).toBe(-10);
    });

    it('should handle decimal values', () => {
      const reservation = new InventoryReservation();
      reservation.quantity_reserved = 100.5;
      reservation.quantity_fulfilled = 50.5;

      expect(reservation.quantity_remaining).toBe(50);
    });

    it('should handle string values from database', () => {
      const reservation = new InventoryReservation();
      (reservation as any).quantity_reserved = '100';
      (reservation as any).quantity_fulfilled = '25';

      expect(reservation.quantity_remaining).toBe(75);
    });
  });

  describe('is_expired getter', () => {
    it('should return false when expires_at is null', () => {
      const reservation = new InventoryReservation();
      reservation.expires_at = null;

      expect(reservation.is_expired).toBe(false);
    });

    it('should return false when expires_at is in the future', () => {
      const reservation = new InventoryReservation();
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      reservation.expires_at = futureDate;

      expect(reservation.is_expired).toBe(false);
    });

    it('should return true when expires_at is in the past', () => {
      const reservation = new InventoryReservation();
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);
      reservation.expires_at = pastDate;

      expect(reservation.is_expired).toBe(true);
    });
  });

  describe('is_active getter', () => {
    it('should return true when status is PENDING', () => {
      const reservation = new InventoryReservation();
      reservation.status = ReservationStatus.PENDING;

      expect(reservation.is_active).toBe(true);
    });

    it('should return true when status is CONFIRMED', () => {
      const reservation = new InventoryReservation();
      reservation.status = ReservationStatus.CONFIRMED;

      expect(reservation.is_active).toBe(true);
    });

    it('should return true when status is PARTIALLY_FULFILLED', () => {
      const reservation = new InventoryReservation();
      reservation.status = ReservationStatus.PARTIALLY_FULFILLED;

      expect(reservation.is_active).toBe(true);
    });

    it('should return false when status is FULFILLED', () => {
      const reservation = new InventoryReservation();
      reservation.status = ReservationStatus.FULFILLED;

      expect(reservation.is_active).toBe(false);
    });

    it('should return false when status is CANCELLED', () => {
      const reservation = new InventoryReservation();
      reservation.status = ReservationStatus.CANCELLED;

      expect(reservation.is_active).toBe(false);
    });

    it('should return false when status is EXPIRED', () => {
      const reservation = new InventoryReservation();
      reservation.status = ReservationStatus.EXPIRED;

      expect(reservation.is_active).toBe(false);
    });
  });

  describe('entity properties', () => {
    it('should accept all properties', () => {
      const reservation = new InventoryReservation();
      reservation.reservation_number = 'RSV-TEST-0001';
      reservation.task_id = 'task-uuid';
      reservation.nomenclature_id = 'nom-uuid';
      reservation.quantity_reserved = 100;
      reservation.quantity_fulfilled = 0;
      reservation.status = ReservationStatus.PENDING;
      reservation.inventory_level = InventoryLevel.OPERATOR;
      reservation.reference_id = 'operator-uuid';
      reservation.reserved_at = new Date('2025-11-16T10:00:00Z');
      reservation.expires_at = new Date('2025-11-17T10:00:00Z');
      reservation.fulfilled_at = null;
      reservation.cancelled_at = null;
      reservation.notes = 'Test reservation';

      expect(reservation.reservation_number).toBe('RSV-TEST-0001');
      expect(reservation.task_id).toBe('task-uuid');
      expect(reservation.nomenclature_id).toBe('nom-uuid');
      expect(reservation.quantity_reserved).toBe(100);
      expect(reservation.quantity_fulfilled).toBe(0);
      expect(reservation.status).toBe(ReservationStatus.PENDING);
      expect(reservation.inventory_level).toBe(InventoryLevel.OPERATOR);
      expect(reservation.reference_id).toBe('operator-uuid');
      expect(reservation.reserved_at).toEqual(new Date('2025-11-16T10:00:00Z'));
      expect(reservation.expires_at).toEqual(new Date('2025-11-17T10:00:00Z'));
      expect(reservation.fulfilled_at).toBeNull();
      expect(reservation.cancelled_at).toBeNull();
      expect(reservation.notes).toBe('Test reservation');
    });

    it('should handle warehouse inventory level', () => {
      const reservation = new InventoryReservation();
      reservation.inventory_level = InventoryLevel.WAREHOUSE;
      reservation.reference_id = 'warehouse-uuid';

      expect(reservation.inventory_level).toBe(InventoryLevel.WAREHOUSE);
      expect(reservation.reference_id).toBe('warehouse-uuid');
    });
  });

  describe('ReservationStatus enum', () => {
    it('should have all expected statuses', () => {
      expect(ReservationStatus.PENDING).toBe('pending');
      expect(ReservationStatus.CONFIRMED).toBe('confirmed');
      expect(ReservationStatus.PARTIALLY_FULFILLED).toBe('partially_fulfilled');
      expect(ReservationStatus.FULFILLED).toBe('fulfilled');
      expect(ReservationStatus.CANCELLED).toBe('cancelled');
      expect(ReservationStatus.EXPIRED).toBe('expired');
    });
  });

  describe('InventoryLevel enum', () => {
    it('should have all expected levels', () => {
      expect(InventoryLevel.WAREHOUSE).toBe('warehouse');
      expect(InventoryLevel.OPERATOR).toBe('operator');
    });
  });
});
