'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Gift, Coffee, TrendingUp, ArrowRight, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { clientStatsApi, clientOrdersApi, clientLoyaltyApi } from '@/lib/client-api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ClientStats, ClientOrder, LoyaltyBalance } from '@/types/client'

export default function ClientDashboardPage() {
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<ClientOrder[]>([])
  const [balance, setBalance] = useState<LoyaltyBalance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, ordersData, balanceData] = await Promise.all([
          clientStatsApi.getStats().catch(() => null),
          clientOrdersApi.getOrders({ limit: 3 }).catch(() => ({ data: [] })),
          clientLoyaltyApi.getBalance().catch(() => null),
        ])

        setStats(statsData)
        setRecentOrders(ordersData.data)
        setBalance(balanceData)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const orderStatusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'Ожидает', color: 'text-yellow-600' },
    paid: { label: 'Оплачен', color: 'text-blue-600' },
    processing: { label: 'Готовится', color: 'text-purple-600' },
    completed: { label: 'Выполнен', color: 'text-green-600' },
    cancelled: { label: 'Отменён', color: 'text-red-600' },
    refunded: { label: 'Возврат', color: 'text-gray-600' },
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Бонусы</p>
                <p className="text-2xl font-bold">{balance?.points_balance ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  ≈ {formatCurrency(balance?.points_value_uzs ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <ShoppingBag className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Заказов</p>
                <p className="text-2xl font-bold">{stats?.total_orders ?? 0}</p>
                <p className="text-xs text-muted-foreground">выполнено</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Потрачено</p>
                <p className="text-2xl font-bold">{formatCurrency(stats?.total_spent ?? 0)}</p>
                <p className="text-xs text-muted-foreground">всего</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Coffee className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Любимое</p>
                <p className="text-lg font-semibold truncate max-w-[150px]">
                  {stats?.favorite_product ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground">товар</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Последние заказы</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/my/history">
              Все заказы
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>У вас пока нет заказов</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/locations">Найти автомат</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-lg">
                      <Coffee className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {order.items.map((i) => i.product_name).join(', ')}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(order.created_at)}
                        <span className="mx-1">•</span>
                        <span className={orderStatusLabels[order.status]?.color}>
                          {orderStatusLabels[order.status]?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(order.total_amount)}</p>
                    {order.points_earned > 0 && (
                      <p className="text-xs text-green-600">+{order.points_earned} бонусов</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Найти автомат</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Посмотрите ближайшие точки на карте
                </p>
              </div>
              <Button asChild>
                <Link href="/locations">
                  Открыть карту
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Бонусная программа</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Копите баллы и получайте скидки
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/my/bonuses">
                  Подробнее
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
