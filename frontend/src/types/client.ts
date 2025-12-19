/**
 * Client-facing types for public pages
 */

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
