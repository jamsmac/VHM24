import { Complaint, ComplaintType, ComplaintStatus } from './complaint.entity';

describe('Complaint Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const complaint = new Complaint();

      expect(complaint.complaint_type).toBeUndefined();
      expect(complaint.status).toBeUndefined();
      expect(complaint.machine_id).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const complaint = new Complaint();
      complaint.complaint_type = ComplaintType.PRODUCT_QUALITY;
      complaint.status = ComplaintStatus.NEW;
      complaint.machine_id = 'machine-uuid';
      complaint.description = 'Coffee was cold';

      expect(complaint.complaint_type).toBe(ComplaintType.PRODUCT_QUALITY);
      expect(complaint.status).toBe(ComplaintStatus.NEW);
      expect(complaint.machine_id).toBe('machine-uuid');
      expect(complaint.description).toBe('Coffee was cold');
    });

    it('should accept customer information', () => {
      const complaint = new Complaint();
      complaint.customer_name = 'Ivan Ivanov';
      complaint.customer_phone = '+79991234567';
      complaint.customer_email = 'client@example.com';

      expect(complaint.customer_name).toBe('Ivan Ivanov');
      expect(complaint.customer_phone).toBe('+79991234567');
      expect(complaint.customer_email).toBe('client@example.com');
    });

    it('should accept submission timestamp', () => {
      const complaint = new Complaint();
      complaint.submitted_at = new Date('2025-11-14T10:30:00Z');

      expect(complaint.submitted_at).toEqual(new Date('2025-11-14T10:30:00Z'));
    });

    it('should accept handling information', () => {
      const complaint = new Complaint();
      complaint.handled_by_user_id = 'admin-uuid';
      complaint.resolved_at = new Date('2025-11-14T15:00:00Z');
      complaint.response = 'Refund processed';

      expect(complaint.handled_by_user_id).toBe('admin-uuid');
      expect(complaint.resolved_at).toEqual(new Date('2025-11-14T15:00:00Z'));
      expect(complaint.response).toBe('Refund processed');
    });

    it('should accept refund information', () => {
      const complaint = new Complaint();
      complaint.refund_amount = 150.0;
      complaint.refund_transaction_id = 'transaction-uuid';

      expect(complaint.refund_amount).toBe(150.0);
      expect(complaint.refund_transaction_id).toBe('transaction-uuid');
    });

    it('should accept metadata and rating', () => {
      const complaint = new Complaint();
      complaint.metadata = {
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0',
      };
      complaint.rating = 5;

      expect(complaint.metadata).toEqual({
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0',
      });
      expect(complaint.rating).toBe(5);
    });

    it('should handle nullable fields', () => {
      const complaint = new Complaint();
      complaint.complaint_type = ComplaintType.OTHER;
      complaint.machine_id = 'machine-uuid';
      complaint.description = 'Test complaint';
      complaint.customer_name = null;
      complaint.customer_phone = null;
      complaint.customer_email = null;
      complaint.handled_by_user_id = null;
      complaint.resolved_at = null;
      complaint.response = null;
      complaint.refund_amount = null;
      complaint.refund_transaction_id = null;
      complaint.metadata = null;
      complaint.rating = null;

      expect(complaint.customer_name).toBeNull();
      expect(complaint.customer_phone).toBeNull();
      expect(complaint.customer_email).toBeNull();
      expect(complaint.handled_by_user_id).toBeNull();
      expect(complaint.resolved_at).toBeNull();
      expect(complaint.response).toBeNull();
      expect(complaint.refund_amount).toBeNull();
      expect(complaint.refund_transaction_id).toBeNull();
      expect(complaint.metadata).toBeNull();
      expect(complaint.rating).toBeNull();
    });

    it('should handle various ratings', () => {
      const complaint = new Complaint();

      complaint.rating = 1;
      expect(complaint.rating).toBe(1);

      complaint.rating = 5;
      expect(complaint.rating).toBe(5);

      complaint.rating = 3;
      expect(complaint.rating).toBe(3);
    });
  });

  describe('ComplaintType enum', () => {
    it('should have all expected types', () => {
      expect(ComplaintType.PRODUCT_QUALITY).toBe('product_quality');
      expect(ComplaintType.NO_CHANGE).toBe('no_change');
      expect(ComplaintType.PRODUCT_NOT_DISPENSED).toBe('product_not_dispensed');
      expect(ComplaintType.MACHINE_DIRTY).toBe('machine_dirty');
      expect(ComplaintType.OTHER).toBe('other');
    });
  });

  describe('ComplaintStatus enum', () => {
    it('should have all expected statuses', () => {
      expect(ComplaintStatus.NEW).toBe('new');
      expect(ComplaintStatus.IN_REVIEW).toBe('in_review');
      expect(ComplaintStatus.RESOLVED).toBe('resolved');
      expect(ComplaintStatus.REJECTED).toBe('rejected');
    });
  });
});
