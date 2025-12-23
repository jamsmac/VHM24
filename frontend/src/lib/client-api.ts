import { apiClient } from './axios'
import type {
  PublicLocation,
  MenuItem,
  QrResolveResult,
  CooperationRequest,
  ClientUser,
  ClientAuthResponse,
  ClientProfile,
  ClientOrder,
  CreateOrderDto,
  LoyaltyBalance,
  LoyaltyTransaction,
  FavoriteProduct,
  ClientStats,
} from '@/types/client'

// ============ Token Management ============

const CLIENT_TOKEN_KEY = 'vhm24_client_token'
const CLIENT_REFRESH_TOKEN_KEY = 'vhm24_client_refresh_token'

export const clientTokenManager = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(CLIENT_TOKEN_KEY)
  },

  setToken: (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CLIENT_TOKEN_KEY, token)
    }
  },

  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(CLIENT_REFRESH_TOKEN_KEY)
  },

  setRefreshToken: (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CLIENT_REFRESH_TOKEN_KEY, token)
    }
  },

  clearTokens: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CLIENT_TOKEN_KEY)
      localStorage.removeItem(CLIENT_REFRESH_TOKEN_KEY)
    }
  },

  isAuthenticated: (): boolean => {
    return !!clientTokenManager.getToken()
  },
}

// Helper for authenticated requests
const authHeaders = () => {
  const token = clientTokenManager.getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Client Public API
 * No authentication required for these endpoints
 */
export const clientPublicApi = {
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
    const { data } = await apiClient.get('/client/public/locations', { params })
    return data
  },

  getCities: async (): Promise<string[]> => {
    const { data } = await apiClient.get('/client/public/cities')
    return data
  },

  // Menu
  getMenu: async (machineId: string, category?: string): Promise<MenuItem[]> => {
    const { data } = await apiClient.get('/client/public/menu', {
      params: { machine_id: machineId, category },
    })
    return data
  },

  // QR code resolution
  resolveQr: async (qrCode: string): Promise<QrResolveResult> => {
    const { data } = await apiClient.post('/client/public/qr/resolve', {
      qr_code: qrCode,
    })
    return data
  },

  // Cooperation request
  submitCooperationRequest: async (
    request: CooperationRequest
  ): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/client/public/cooperation', request)
    return data
  },
}

/**
 * Client Auth API
 */
export const clientAuthApi = {
  // Telegram Web App authentication
  authenticateTelegram: async (initData: string): Promise<ClientAuthResponse> => {
    const { data } = await apiClient.post('/client/auth/telegram', { init_data: initData })
    if (data.access_token) {
      clientTokenManager.setToken(data.access_token)
      clientTokenManager.setRefreshToken(data.refresh_token)
    }
    return data
  },

  // Refresh token
  refreshToken: async (): Promise<ClientAuthResponse> => {
    const refreshToken = clientTokenManager.getRefreshToken()
    if (!refreshToken) throw new Error('No refresh token')

    const { data } = await apiClient.post('/client/auth/refresh', { refresh_token: refreshToken })
    if (data.access_token) {
      clientTokenManager.setToken(data.access_token)
      clientTokenManager.setRefreshToken(data.refresh_token)
    }
    return data
  },

  // Get current user profile
  getMe: async (): Promise<ClientUser> => {
    const { data } = await apiClient.get('/client/auth/me', { headers: authHeaders() })
    return data
  },

  // Update profile
  updateProfile: async (profile: ClientProfile): Promise<ClientUser> => {
    const { data } = await apiClient.patch('/client/auth/profile', profile, { headers: authHeaders() })
    return data
  },

  // Logout
  logout: (): void => {
    clientTokenManager.clearTokens()
  },
}

/**
 * Client Orders API
 */
export const clientOrdersApi = {
  // Get orders list
  getOrders: async (params?: {
    page?: number
    limit?: number
    status?: string
  }): Promise<{ data: ClientOrder[]; total: number }> => {
    const { data } = await apiClient.get('/client/orders', {
      params,
      headers: authHeaders(),
    })
    return data
  },

  // Get single order
  getOrder: async (orderId: string): Promise<ClientOrder> => {
    const { data } = await apiClient.get(`/client/orders/${orderId}`, { headers: authHeaders() })
    return data
  },

  // Create order
  createOrder: async (order: CreateOrderDto): Promise<ClientOrder> => {
    const { data } = await apiClient.post('/client/orders', order, { headers: authHeaders() })
    return data
  },

  // Cancel order
  cancelOrder: async (orderId: string): Promise<ClientOrder> => {
    const { data } = await apiClient.delete(`/client/orders/${orderId}`, { headers: authHeaders() })
    return data
  },
}

/**
 * Client Loyalty API
 */
export const clientLoyaltyApi = {
  // Get points balance
  getBalance: async (): Promise<LoyaltyBalance> => {
    const { data } = await apiClient.get('/client/loyalty/balance', { headers: authHeaders() })
    return data
  },

  // Get transaction history
  getHistory: async (params?: {
    page?: number
    limit?: number
  }): Promise<{ data: LoyaltyTransaction[]; total: number; page: number; limit: number }> => {
    const { data } = await apiClient.get('/client/loyalty/history', {
      params,
      headers: authHeaders(),
    })
    return data
  },
}

/**
 * Client Stats API (computed from orders/loyalty)
 */
export const clientStatsApi = {
  getStats: async (): Promise<ClientStats> => {
    // Fetch orders and loyalty in parallel
    const [ordersResult, balanceResult] = await Promise.all([
      clientOrdersApi.getOrders({ limit: 100 }),
      clientLoyaltyApi.getBalance(),
    ])

    const orders = ordersResult.data
    const completedOrders = orders.filter(o => o.status === 'completed')

    // Calculate stats
    const totalSpent = completedOrders.reduce((sum, o) => sum + o.total_amount, 0)

    // Find most ordered product
    const productCounts: Record<string, number> = {}
    completedOrders.forEach(order => {
      order.items.forEach(item => {
        productCounts[item.product_name] = (productCounts[item.product_name] || 0) + item.quantity
      })
    })
    const favoriteProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

    return {
      total_orders: completedOrders.length,
      total_spent: totalSpent,
      current_points: balanceResult.points_balance,
      total_points_earned: balanceResult.lifetime_points,
      favorite_product: favoriteProduct,
      member_since: orders[orders.length - 1]?.created_at || new Date().toISOString(),
      last_order_at: orders[0]?.created_at,
    }
  },

  // Get favorite products based on order history
  getFavorites: async (): Promise<FavoriteProduct[]> => {
    const { data: orders } = await clientOrdersApi.getOrders({ limit: 100 })

    // Aggregate products from orders
    const productMap: Record<string, {
      product_id: string
      product_name: string
      order_count: number
      total_price: number
      last_ordered_at: string
    }> = {}

    orders
      .filter(o => o.status === 'completed')
      .forEach(order => {
        order.items.forEach(item => {
          if (!productMap[item.product_id]) {
            productMap[item.product_id] = {
              product_id: item.product_id,
              product_name: item.product_name,
              order_count: 0,
              total_price: 0,
              last_ordered_at: order.created_at,
            }
          }
          productMap[item.product_id].order_count += item.quantity
          productMap[item.product_id].total_price += item.total_price
          if (order.created_at > productMap[item.product_id].last_ordered_at) {
            productMap[item.product_id].last_ordered_at = order.created_at
          }
        })
      })

    return Object.values(productMap)
      .map(p => ({
        id: p.product_id,
        product_id: p.product_id,
        product_name: p.product_name,
        order_count: p.order_count,
        average_price: p.total_price / p.order_count,
        last_ordered_at: p.last_ordered_at,
      }))
      .sort((a, b) => b.order_count - a.order_count)
      .slice(0, 10)
  },
}

// Backwards compatibility
export const clientApi = clientPublicApi
