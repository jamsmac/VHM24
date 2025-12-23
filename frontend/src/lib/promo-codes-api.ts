import api from './axios'

export type PromoCodeType = 'percentage' | 'fixed_amount' | 'loyalty_bonus'
export type PromoCodeStatus = 'draft' | 'active' | 'paused' | 'expired'

export interface PromoCode {
  id: string
  code: string
  type: PromoCodeType
  value: number
  valid_from: string
  valid_until: string | null
  status: PromoCodeStatus
  max_uses: number | null
  max_uses_per_user: number
  current_uses: number
  minimum_order_amount: number | null
  maximum_discount: number | null
  applicable_products: string[] | null
  applicable_locations: string[] | null
  applicable_machines: string[] | null
  name: string | null
  description: string | null
  organization_id: string | null
  created_by_id: string | null
  created_at: string
  updated_at: string
}

export interface CreatePromoCodeDto {
  code: string
  type: PromoCodeType
  value: number
  valid_from: string
  valid_until?: string
  status?: PromoCodeStatus
  max_uses?: number
  max_uses_per_user?: number
  minimum_order_amount?: number
  maximum_discount?: number
  applicable_products?: string[]
  applicable_locations?: string[]
  applicable_machines?: string[]
  name?: string
  description?: string
  organization_id?: string
}

export type UpdatePromoCodeDto = Partial<Omit<CreatePromoCodeDto, 'code'>>

export interface PromoCodeQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: PromoCodeStatus
  type?: PromoCodeType
  active_only?: boolean
  sort_by?: string
  sort_order?: 'ASC' | 'DESC'
}

export interface PromoCodeStats {
  total_redemptions: number
  total_discount_given: number
  total_bonus_awarded: number
  unique_users: number
  redemptions_by_day: Array<{ date: string; count: number; discount: number }>
}

export const promoCodesApi = {
  async getAll(params?: PromoCodeQueryParams): Promise<{ data: PromoCode[]; total: number }> {
    const { data } = await api.get('/promo-codes', { params })
    return data
  },

  async getOne(id: string): Promise<PromoCode> {
    const { data } = await api.get(`/promo-codes/${id}`)
    return data
  },

  async getStats(id: string): Promise<PromoCodeStats> {
    const { data } = await api.get(`/promo-codes/${id}/stats`)
    return data
  },

  async create(dto: CreatePromoCodeDto): Promise<PromoCode> {
    const { data } = await api.post('/promo-codes', dto)
    return data
  },

  async update(id: string, dto: UpdatePromoCodeDto): Promise<PromoCode> {
    const { data } = await api.patch(`/promo-codes/${id}`, dto)
    return data
  },

  async activate(id: string): Promise<PromoCode> {
    const { data } = await api.post(`/promo-codes/${id}/activate`)
    return data
  },

  async pause(id: string): Promise<PromoCode> {
    const { data } = await api.post(`/promo-codes/${id}/pause`)
    return data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/promo-codes/${id}`)
  },
}
