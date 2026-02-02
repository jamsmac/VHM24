export enum MachineStatus {
  ACTIVE = 'active',
  LOW_STOCK = 'low_stock',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline',
  DISABLED = 'disabled',
}

export interface Machine {
  id: string
  machine_number: string
  name: string
  type_code: string
  status: MachineStatus
  location_id: string
  location?: {
    id: string
    name: string
    address: string
  }
  manufacturer?: string
  model?: string
  serial_number?: string
  installation_date?: string
  last_maintenance_date?: string
  next_maintenance_date?: string
  max_product_slots: number
  current_product_count: number
  cash_capacity: number
  current_cash_amount: number
  accepts_cash: boolean
  accepts_card: boolean
  accepts_qr: boolean
  accepts_nfc: boolean
  qr_code: string
  last_collection_date?: string
  last_refill_date?: string
  current_cash?: number
  last_sync?: string
  description?: string
  created_at: string
  updated_at: string

  // Dashboard/Analytics fields (computed or from API)
  /** Today's sales amount in UZS */
  today_sales?: number
  /** Number of brews today */
  today_brews?: number
  /** Average check amount in UZS */
  avg_check?: number
  /** Is machine in favorites */
  is_favorite?: boolean
  /** Overall inventory level percentage (0-100) */
  inventory_level?: number
  /** Sales trend percentage (positive or negative) */
  sales_trend?: number
  /** Has active alerts */
  has_alerts?: boolean
  /** Number of active alerts */
  alert_count?: number
}

export interface MachineStats {
  total_machines: number
  by_status: Record<MachineStatus, number>
  total_revenue_today: number
  low_stock_count: number
}

export interface CreateMachineDto {
  machine_number: string
  name: string
  type_code: string
  location_id: string
  manufacturer?: string
  model?: string
  serial_number?: string
  installation_date?: string
  max_product_slots: number
  cash_capacity: number
  accepts_cash: boolean
  accepts_card: boolean
  accepts_qr: boolean
  accepts_nfc: boolean
}
