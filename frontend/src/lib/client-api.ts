import { httpClient } from './axios'
import type {
  PublicLocation,
  MenuItem,
  QrResolveResult,
  CooperationRequest,
} from '@/types/client'

/**
 * Client Public API
 * No authentication required for these endpoints
 */
export const clientApi = {
  // Locations
  getLocations: async (params?: {
    search?: string
    city?: string
    lat?: number
    lng?: number
    page?: number
    limit?: number
  }): Promise<{
    data: PublicLocation[]
    total: number
    page: number
    limit: number
  }> => {
    const { data } = await httpClient.get('/client/public/locations', { params })
    return data
  },

  getCities: async (): Promise<string[]> => {
    const { data } = await httpClient.get('/client/public/cities')
    return data
  },

  // Menu
  getMenu: async (machineId: string, category?: string): Promise<MenuItem[]> => {
    const { data } = await httpClient.get('/client/public/menu', {
      params: { machine_id: machineId, category },
    })
    return data
  },

  // QR code resolution
  resolveQr: async (qrCode: string): Promise<QrResolveResult> => {
    const { data } = await httpClient.post('/client/public/qr/resolve', {
      qr_code: qrCode,
    })
    return data
  },

  // Cooperation request
  submitCooperationRequest: async (
    request: CooperationRequest
  ): Promise<{ success: boolean; message: string }> => {
    const { data } = await httpClient.post('/client/public/cooperation', request)
    return data
  },
}
