'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, Coffee, Clock, MapPin, ChevronDown, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { clientOrdersApi } from '@/lib/client-api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { ClientOrder, OrderStatus } from '@/types/client'
import { cn } from '@/lib/utils'

const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Ожидает оплаты', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  paid: { label: 'Оплачен', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  processing: { label: 'Готовится', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  completed: { label: 'Выполнен', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  cancelled: { label: 'Отменён', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  refunded: { label: 'Возврат', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<ClientOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  const fetchOrders = async (pageNum: number, append = false) => {
    try {
      const params: { page: number; limit: number; status?: string } = {
        page: pageNum,
        limit: 10,
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }

      const result = await clientOrdersApi.getOrders(params)

      if (append) {
        setOrders((prev) => [...prev, ...result.data])
      } else {
        setOrders(result.data)
      }

      setHasMore(result.data.length === 10)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    setLoading(true)
    fetchOrders(1)
  }, [statusFilter])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchOrders(nextPage, true)
  }

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">История заказов</h1>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="text-sm border border-white/10 rounded-lg px-3 py-2 bg-white/5 text-foreground"
          >
            <option value="all">Все заказы</option>
            <option value="completed">Выполненные</option>
            <option value="pending">Ожидающие</option>
            <option value="cancelled">Отменённые</option>
          </select>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Заказов не найдено</p>
              <p className="text-sm mt-2">
                {statusFilter !== 'all'
                  ? 'Попробуйте изменить фильтр'
                  : 'Сделайте первый заказ через Telegram бот'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusConfig = ORDER_STATUS_CONFIG[order.status]
            const isExpanded = expandedOrder === order.id

            return (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="pt-6">
                  {/* Order header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white/10 rounded-xl">
                        <Coffee className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="font-semibold">#{order.order_number}</p>
                          <span
                            className={cn(
                              'px-2 py-0.5 text-xs font-medium rounded-full',
                              statusConfig.bgColor,
                              statusConfig.color
                            )}
                          >
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(order.created_at)}
                          </span>
                          {order.machine_location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {order.machine_location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{formatCurrency(order.total_amount)}</p>
                      {order.points_earned > 0 && (
                        <p className="text-sm text-green-600">+{order.points_earned} бонусов</p>
                      )}
                      {order.points_used > 0 && (
                        <p className="text-sm text-orange-600">-{order.points_used} бонусов</p>
                      )}
                    </div>
                  </div>

                  {/* Order items preview */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {order.items.length} товар{order.items.length > 1 ? 'ов' : ''}:{' '}
                        <span className="text-foreground">
                          {order.items.map((i) => i.product_name).join(', ')}
                        </span>
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleOrderDetails(order.id)}
                        className="gap-1"
                      >
                        Детали
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </Button>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-4 space-y-3">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg border border-white/5"
                          >
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(item.unit_price)} × {item.quantity}
                              </p>
                            </div>
                            <p className="font-semibold">{formatCurrency(item.total_price)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={loadMore}>
                Загрузить ещё
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
