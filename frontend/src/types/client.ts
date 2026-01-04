/**
 * Client-facing types for public and personal cabinet pages
 */

// ============ Public Types ============

export interface PublicLocation {
  id: string
  name: string
  address?: string
  city?: string
  lat?: number
  lng?: number
  distance_km?: number
  machine_count: number
  working_hours?: string
}

export interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  category?: string
  image_url?: string
  is_available: boolean
  is_new?: boolean
  is_popular?: boolean
  stock?: number
  points_earned?: number
}

export interface QrResolveResult {
  machine_id: string
  machine_number: string
  machine_name: string
  location?: PublicLocation
  is_available: boolean
  unavailable_reason?: string
}

export interface CooperationRequest {
  name: string
  phone: string
  email?: string
  company?: string
  message: string
}

// ============ Client User Types ============

export interface ClientUser {
  id: string
  telegram_id: string
  telegram_username?: string
  first_name: string
  last_name?: string
  phone?: string
  email?: string
  language_code?: string
  created_at: string
  updated_at: string
}

export interface ClientAuthResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: ClientUser
}

export interface ClientProfile {
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
}

// ============ Orders Types ============

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled' | 'refunded'

export interface ClientOrder {
  id: string
  order_number: string
  machine_id: string
  machine_name?: string
  machine_location?: string
  status: OrderStatus
  total_amount: number
  currency: string
  points_earned: number
  points_used: number
  items: ClientOrderItem[]
  created_at: string
  completed_at?: string
}

export interface ClientOrderItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface CreateOrderDto {
  machine_id: string
  items: {
    product_id: string
    quantity: number
  }[]
  use_points?: number
}

// ============ Loyalty Types ============

export interface LoyaltyBalance {
  points_balance: number
  lifetime_points: number
  points_value_uzs: number
}

export type LoyaltyTransactionType = 'earned' | 'redeemed' | 'expired' | 'bonus' | 'adjustment'

export interface LoyaltyTransaction {
  id: string
  type: LoyaltyTransactionType
  points: number
  balance_after: number
  description?: string
  order_id?: string
  created_at: string
}

// ============ Favorites Types ============

export interface FavoriteProduct {
  id: string
  product_id: string
  product_name: string
  category?: string
  image_url?: string
  last_ordered_at?: string
  order_count: number
  average_price: number
}

// ============ Stats Types ============

export interface ClientStats {
  total_orders: number
  total_spent: number
  current_points: number
  total_points_earned: number
  favorite_product?: string
  member_since: string
  last_order_at?: string
}
