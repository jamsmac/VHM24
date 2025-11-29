// Extended interface for warehouse inventory with additional fields
export interface WarehouseInventoryItem {
  id: string
  nomenclature_id: string
  product?: {
    id: string
    name: string
    sku: string
    price: number
    unit_of_measure_code: string
  }
  quantity: number
  reserved_quantity?: number
  min_stock: number
  batch_number?: string
  expiration_date?: string
  created_at: string
  updated_at: string
}

// General inventory item interface used across the app
export interface InventoryItem {
  id: string
  nomenclature_id: string
  product?: {
    id: string
    name: string
    sku: string
    price: number
    unit_of_measure_code: string
  }
  quantity: number
  min_stock?: number
  max_capacity?: number
  reserved_quantity?: number
  batch_number?: string
  expiration_date?: string
  created_at: string
  updated_at: string
}
