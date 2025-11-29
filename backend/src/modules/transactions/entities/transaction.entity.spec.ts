import { Transaction, TransactionType, PaymentMethod, ExpenseCategory } from './transaction.entity';

describe('Transaction Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const transaction = new Transaction();

      expect(transaction.transaction_type).toBeUndefined();
      expect(transaction.amount).toBeUndefined();
      expect(transaction.currency).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const transaction = new Transaction();
      transaction.transaction_type = TransactionType.SALE;
      transaction.transaction_date = new Date('2025-01-15T10:30:00Z');
      transaction.amount = 150000;
      transaction.currency = 'UZS';
      transaction.payment_method = PaymentMethod.CASH;

      expect(transaction.transaction_type).toBe(TransactionType.SALE);
      expect(transaction.transaction_date).toEqual(new Date('2025-01-15T10:30:00Z'));
      expect(transaction.amount).toBe(150000);
      expect(transaction.currency).toBe('UZS');
      expect(transaction.payment_method).toBe(PaymentMethod.CASH);
    });

    it('should accept machine and user relations', () => {
      const transaction = new Transaction();
      transaction.machine_id = 'machine-uuid';
      transaction.user_id = 'user-uuid';

      expect(transaction.machine_id).toBe('machine-uuid');
      expect(transaction.user_id).toBe('user-uuid');
    });

    it('should accept contract and counterparty relations', () => {
      const transaction = new Transaction();
      transaction.contract_id = 'contract-uuid';
      transaction.counterparty_id = 'counterparty-uuid';

      expect(transaction.contract_id).toBe('contract-uuid');
      expect(transaction.counterparty_id).toBe('counterparty-uuid');
    });

    it('should accept sale-specific properties', () => {
      const transaction = new Transaction();
      transaction.transaction_type = TransactionType.SALE;
      transaction.sale_date = new Date('2025-01-15T10:30:00Z');
      transaction.recipe_id = 'recipe-uuid';
      transaction.recipe_snapshot_id = 'snapshot-uuid';
      transaction.recipe_version = 5;
      transaction.quantity = 2;

      expect(transaction.sale_date).toEqual(new Date('2025-01-15T10:30:00Z'));
      expect(transaction.recipe_id).toBe('recipe-uuid');
      expect(transaction.recipe_snapshot_id).toBe('snapshot-uuid');
      expect(transaction.recipe_version).toBe(5);
      expect(transaction.quantity).toBe(2);
    });

    it('should accept expense-specific properties', () => {
      const transaction = new Transaction();
      transaction.transaction_type = TransactionType.EXPENSE;
      transaction.expense_category = ExpenseCategory.PURCHASE;

      expect(transaction.expense_category).toBe(ExpenseCategory.PURCHASE);
    });

    it('should accept collection-specific properties', () => {
      const transaction = new Transaction();
      transaction.transaction_type = TransactionType.COLLECTION;
      transaction.collection_task_id = 'task-uuid';

      expect(transaction.collection_task_id).toBe('task-uuid');
    });

    it('should accept description and metadata', () => {
      const transaction = new Transaction();
      transaction.description = 'Collection from machine M-001';
      transaction.metadata = {
        invoice_number: 'INV-2024-001',
        supplier: 'Coffee Beans Ltd',
      };
      transaction.transaction_number = 'TXN-20241114-001';

      expect(transaction.description).toBe('Collection from machine M-001');
      expect(transaction.metadata).toEqual({
        invoice_number: 'INV-2024-001',
        supplier: 'Coffee Beans Ltd',
      });
      expect(transaction.transaction_number).toBe('TXN-20241114-001');
    });

    it('should handle nullable fields', () => {
      const transaction = new Transaction();
      transaction.transaction_type = TransactionType.SALE;
      transaction.amount = 100000;
      transaction.machine_id = null;
      transaction.user_id = null;
      transaction.contract_id = null;
      transaction.counterparty_id = null;
      transaction.recipe_id = null;
      transaction.recipe_snapshot_id = null;
      transaction.recipe_version = null;
      transaction.quantity = null;
      transaction.payment_method = null;
      transaction.expense_category = null;
      transaction.collection_task_id = null;
      transaction.description = null;
      transaction.metadata = null;
      transaction.transaction_number = null;
      transaction.sale_date = null;

      expect(transaction.machine_id).toBeNull();
      expect(transaction.user_id).toBeNull();
      expect(transaction.contract_id).toBeNull();
      expect(transaction.counterparty_id).toBeNull();
      expect(transaction.recipe_id).toBeNull();
      expect(transaction.payment_method).toBeNull();
      expect(transaction.expense_category).toBeNull();
      expect(transaction.description).toBeNull();
      expect(transaction.metadata).toBeNull();
      expect(transaction.transaction_number).toBeNull();
      expect(transaction.sale_date).toBeNull();
    });

    it('should handle all payment methods', () => {
      const txCash = new Transaction();
      txCash.payment_method = PaymentMethod.CASH;
      expect(txCash.payment_method).toBe(PaymentMethod.CASH);

      const txCard = new Transaction();
      txCard.payment_method = PaymentMethod.CARD;
      expect(txCard.payment_method).toBe(PaymentMethod.CARD);

      const txMobile = new Transaction();
      txMobile.payment_method = PaymentMethod.MOBILE;
      expect(txMobile.payment_method).toBe(PaymentMethod.MOBILE);

      const txQr = new Transaction();
      txQr.payment_method = PaymentMethod.QR;
      expect(txQr.payment_method).toBe(PaymentMethod.QR);
    });

    it('should handle all expense categories', () => {
      const expenses = [
        { category: ExpenseCategory.RENT, expected: 'rent' },
        { category: ExpenseCategory.PURCHASE, expected: 'purchase' },
        { category: ExpenseCategory.REPAIR, expected: 'repair' },
        { category: ExpenseCategory.SALARY, expected: 'salary' },
        { category: ExpenseCategory.UTILITIES, expected: 'utilities' },
        { category: ExpenseCategory.DEPRECIATION, expected: 'depreciation' },
        { category: ExpenseCategory.WRITEOFF, expected: 'writeoff' },
        { category: ExpenseCategory.OTHER, expected: 'other' },
      ];

      expenses.forEach(({ category, expected }) => {
        const tx = new Transaction();
        tx.expense_category = category;
        expect(tx.expense_category).toBe(expected);
      });
    });

    it('should handle decimal amounts', () => {
      const transaction = new Transaction();
      transaction.amount = 150000.5;

      expect(transaction.amount).toBe(150000.5);
    });

    it('should handle various currencies', () => {
      const transaction = new Transaction();

      transaction.currency = 'UZS';
      expect(transaction.currency).toBe('UZS');

      transaction.currency = 'USD';
      expect(transaction.currency).toBe('USD');

      transaction.currency = 'EUR';
      expect(transaction.currency).toBe('EUR');
    });
  });

  describe('TransactionType enum', () => {
    it('should have all expected types', () => {
      expect(TransactionType.SALE).toBe('sale');
      expect(TransactionType.COLLECTION).toBe('collection');
      expect(TransactionType.EXPENSE).toBe('expense');
      expect(TransactionType.REFUND).toBe('refund');
    });
  });

  describe('PaymentMethod enum', () => {
    it('should have all expected methods', () => {
      expect(PaymentMethod.CASH).toBe('cash');
      expect(PaymentMethod.CARD).toBe('card');
      expect(PaymentMethod.MOBILE).toBe('mobile');
      expect(PaymentMethod.QR).toBe('qr');
    });
  });

  describe('ExpenseCategory enum', () => {
    it('should have all expected categories', () => {
      expect(ExpenseCategory.RENT).toBe('rent');
      expect(ExpenseCategory.PURCHASE).toBe('purchase');
      expect(ExpenseCategory.REPAIR).toBe('repair');
      expect(ExpenseCategory.SALARY).toBe('salary');
      expect(ExpenseCategory.UTILITIES).toBe('utilities');
      expect(ExpenseCategory.DEPRECIATION).toBe('depreciation');
      expect(ExpenseCategory.WRITEOFF).toBe('writeoff');
      expect(ExpenseCategory.OTHER).toBe('other');
    });
  });
});
