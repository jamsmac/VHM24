/**
 * Counterparty Types (Контрагенты)
 * Adapted for Uzbekistan market
 */

export enum CounterpartyType {
  CLIENT = 'client',
  SUPPLIER = 'supplier',
  PARTNER = 'partner',
  LOCATION_OWNER = 'location_owner',
}

export interface Counterparty {
  id: string
  name: string // Название организации
  short_name: string | null // Краткое название
  type: CounterpartyType // Тип контрагента

  // Uzbekistan tax identifiers
  inn: string // ИНН: 9 цифр
  oked: string | null // ОКЭД: код вида экономической деятельности

  // Banking details (Uzbekistan)
  mfo: string | null // МФО: 5 цифр (код банка)
  bank_account: string | null // Расчетный счет
  bank_name: string | null // Название банка

  // Addresses
  legal_address: string | null // Юридический адрес
  actual_address: string | null // Фактический адрес

  // Contact information
  contact_person: string | null // Контактное лицо
  phone: string | null // Телефон
  email: string | null // Email

  // Director information
  director_name: string | null // ФИО директора
  director_position: string | null // Должность

  // VAT registration (НДС в Узбекистане - 15%)
  is_vat_payer: boolean // Плательщик НДС
  vat_rate: number // Ставка НДС (обычно 15%)

  // Payment terms
  payment_term_days: number | null // Срок оплаты (дней)
  credit_limit: number | null // Кредитный лимит (UZS)

  // Status
  is_active: boolean // Активен
  notes: string | null // Примечания

  // Timestamps
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateCounterpartyDto {
  name: string
  short_name?: string
  type: CounterpartyType
  inn: string // Must be exactly 9 digits
  oked?: string
  mfo?: string // Must be exactly 5 digits
  bank_account?: string
  bank_name?: string
  legal_address?: string
  actual_address?: string
  contact_person?: string
  phone?: string
  email?: string
  director_name?: string
  director_position?: string
  is_vat_payer?: boolean
  vat_rate?: number
  payment_term_days?: number
  credit_limit?: number
  is_active?: boolean
  notes?: string
}

export type UpdateCounterpartyDto = Partial<CreateCounterpartyDto>

export interface CounterpartyListParams {
  type?: CounterpartyType
  is_active?: boolean
  search?: string
  page?: number
  limit?: number
}

export interface CounterpartyStats {
  total_counterparties: number
  by_type: Record<CounterpartyType, number>
  active_count: number
  inactive_count: number
}
