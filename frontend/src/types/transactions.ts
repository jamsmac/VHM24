export enum TransactionType {
  SALE = 'sale',
  COLLECTION = 'collection',
  EXPENSE = 'expense',
  REFUND = 'refund',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  QR_CODE = 'qr_code',
  NFC = 'nfc',
}

export enum ExpenseCategory {
  RENT = 'rent',
  SALARY = 'salary',
  SUPPLIES = 'supplies',
  MAINTENANCE = 'maintenance',
  OTHER = 'other',
}

export interface Transaction {
  id: string
  transaction_number: string
  transaction_type: TransactionType
  transaction_date: string
  amount: number
  payment_method?: PaymentMethod
  machine_id?: string
  machine?: {
    id: string
    machine_number: string
    location?: {
      name: string
    }
  }
  user_id?: string
  user?: {
    full_name: string
  }
  recipe_id?: string
  quantity?: number
  collection_task_id?: string
  expense_category?: ExpenseCategory
  description?: string
  metadata?: Record<string, any>
  created_at: string
  created_by?: {
    full_name: string
    phone?: string
  }
  payment_system?: string
  payment_transaction_id?: string
  items?: Array<{
    nomenclature_id: string
    nomenclature?: {
      name: string
    }
    recipe?: {
      id: string
      name: string
      sku?: string
    }
    quantity: number
    price: number
    unit_price?: number
    total: number
  }>
  expense_description?: string
  task?: {
    id: string
    type_code: string
  }
  notes?: string
}

export interface TransactionStats {
  total: number
  by_type: Array<{ type: TransactionType; count: number; total_amount: number }>
  by_payment_method: Array<{ method: PaymentMethod; count: number; total_amount: number }>
  by_expense_category: Array<{ category: ExpenseCategory; count: number; total_amount: number }>
  total_revenue: number
  total_expenses: number
  total_collections: number
  net_profit: number
  transaction_count: number
  profit_margin: number
}
