'use client'

import { useEffect, useState } from 'react'
import { Gift, TrendingUp, TrendingDown, Clock, Sparkles, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { clientLoyaltyApi } from '@/lib/client-api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { LoyaltyBalance, LoyaltyTransaction, LoyaltyTransactionType } from '@/types/client'
import { cn } from '@/lib/utils'

const TRANSACTION_TYPE_CONFIG: Record<
  LoyaltyTransactionType,
  { label: string; icon: typeof TrendingUp; color: string; bgColor: string }
> = {
  earned: {
    label: 'Начислено',
    icon: TrendingUp,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  redeemed: {
    label: 'Списано',
    icon: TrendingDown,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
  },
  expired: {
    label: 'Сгорело',
    icon: Clock,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
  bonus: {
    label: 'Бонус',
    icon: Sparkles,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  adjustment: {
    label: 'Корректировка',
    icon: Info,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
}

export default function BonusesPage() {
  const [balance, setBalance] = useState<LoyaltyBalance | null>(null)
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchData = async (pageNum: number, append = false) => {
    try {
      const [balanceData, historyData] = await Promise.all([
        pageNum === 1 ? clientLoyaltyApi.getBalance() : Promise.resolve(balance),
        clientLoyaltyApi.getHistory({ page: pageNum, limit: 20 }),
      ])

      if (pageNum === 1 && balanceData) {
        setBalance(balanceData)
      }

      if (append) {
        setTransactions((prev) => [...prev, ...historyData.data])
      } else {
        setTransactions(historyData.data)
      }

      setHasMore(historyData.data.length === 20)
    } catch (error) {
      console.error('Failed to fetch loyalty data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(1)
  }, [])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchData(nextPage, true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="pt-6">
            <div className="h-32 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Бонусная программа</h1>

      {/* Balance card */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <CardContent className="pt-8 pb-8 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm">Ваш баланс</p>
              <p className="text-5xl font-bold mt-2">{balance?.points_balance ?? 0}</p>
              <p className="text-primary-foreground/80 mt-2">
                бонусных баллов ≈ {formatCurrency(balance?.points_value_uzs ?? 0)}
              </p>
            </div>
            <div className="p-6 bg-white/10 rounded-full">
              <Gift className="h-12 w-12" />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/20 grid grid-cols-2 gap-4">
            <div>
              <p className="text-primary-foreground/80 text-sm">Накоплено всего</p>
              <p className="text-2xl font-semibold mt-1">
                {balance?.lifetime_points ?? 0} баллов
              </p>
            </div>
            <div>
              <p className="text-primary-foreground/80 text-sm">Конвертация</p>
              <p className="text-2xl font-semibold mt-1">1 балл = 100 сўм</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Как это работает</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="font-medium">Накапливайте</p>
                <p className="text-sm text-muted-foreground">
                  Получайте 1 балл за каждые 1000 сўм покупки
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Gift className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="font-medium">Используйте</p>
                <p className="text-sm text-muted-foreground">
                  Оплачивайте до 50% покупки баллами
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium">Бонусы</p>
                <p className="text-sm text-muted-foreground">
                  Получайте дополнительные баллы в акциях
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">История операций</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>История пуста</p>
              <p className="text-sm mt-2">Начните копить баллы с первой покупки</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => {
                const config = TRANSACTION_TYPE_CONFIG[transaction.type]
                const Icon = config.icon
                const isPositive = transaction.points > 0

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn('p-2 rounded-lg', config.bgColor)}>
                        <Icon className={cn('h-5 w-5', config.color)} />
                      </div>
                      <div>
                        <p className="font-medium">{config.label}</p>
                        {transaction.description && (
                          <p className="text-sm text-muted-foreground">
                            {transaction.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          'text-lg font-semibold',
                          isPositive ? 'text-green-600' : 'text-orange-600'
                        )}
                      >
                        {isPositive ? '+' : ''}
                        {transaction.points}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Баланс: {transaction.balance_after}
                      </p>
                    </div>
                  </div>
                )
              })}

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMore}
                    className="text-sm text-primary hover:underline"
                  >
                    Загрузить ещё
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
