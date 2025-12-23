'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promoCodesApi, PromoCodeStatus, PromoCodeType } from '@/lib/promo-codes-api'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import {
  Plus,
  Filter,
  Tag,
  Percent,
  Gift,
  CheckCircle,
  PauseCircle,
  Clock,
  XCircle,
  MoreVertical,
  Play,
  Pause,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

const STATUS_CONFIG: Record<PromoCodeStatus, { label: string; icon: typeof CheckCircle; color: string; bgColor: string }> = {
  draft: { label: 'Черновик', icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  active: { label: 'Активен', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  paused: { label: 'Приостановлен', icon: PauseCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  expired: { label: 'Истёк', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
}

const TYPE_CONFIG: Record<PromoCodeType, { label: string; icon: typeof Percent }> = {
  percentage: { label: 'Процент', icon: Percent },
  fixed_amount: { label: 'Фикс. сумма', icon: Tag },
  loyalty_bonus: { label: 'Бонусы', icon: Gift },
}

export default function PromoCodesPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<PromoCodeStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState<PromoCodeType | ''>('')
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['promo-codes', statusFilter, typeFilter, search],
    queryFn: () => promoCodesApi.getAll({
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      search: search || undefined,
      limit: 50,
    }),
  })

  const activateMutation = useMutation({
    mutationFn: promoCodesApi.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
    },
  })

  const pauseMutation = useMutation({
    mutationFn: promoCodesApi.pause,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: promoCodesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
    },
  })

  const promoCodes = data?.data || []
  const total = data?.total || 0

  const activeCount = promoCodes.filter(p => p.status === 'active').length
  const totalUsage = promoCodes.reduce((sum, p) => sum + p.current_uses, 0)

  const formatValue = (promo: { type: PromoCodeType; value: number }) => {
    switch (promo.type) {
      case 'percentage':
        return `${promo.value}%`
      case 'fixed_amount':
        return `${promo.value.toLocaleString()} UZS`
      case 'loyalty_bonus':
        return `+${promo.value} баллов`
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Промокоды</h1>
          <p className="mt-2 text-muted-foreground">Управление промокодами и акциями</p>
        </div>
        <Link href="/dashboard/promo-codes/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Создать промокод
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Всего</p>
          <p className="text-2xl font-bold text-foreground">{total}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Активных</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Использований</p>
          <p className="text-2xl font-bold text-indigo-600">{totalUsage}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Черновиков</p>
          <p className="text-2xl font-bold text-gray-600">
            {promoCodes.filter(p => p.status === 'draft').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-foreground">Фильтры</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Поиск</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Код или название..."
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Статус</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PromoCodeStatus | '')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Все статусы</option>
              <option value="draft">Черновик</option>
              <option value="active">Активен</option>
              <option value="paused">Приостановлен</option>
              <option value="expired">Истёк</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Тип</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as PromoCodeType | '')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Все типы</option>
              <option value="percentage">Процент</option>
              <option value="fixed_amount">Фиксированная сумма</option>
              <option value="loyalty_bonus">Бонусные баллы</option>
            </select>
          </div>
        </div>
      </div>

      {/* Promo Codes Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Код
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Значение
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Срок действия
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Использований
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12">
                    <div className="flex justify-center">
                      <CardSkeleton />
                    </div>
                  </td>
                </tr>
              ) : promoCodes.length > 0 ? (
                promoCodes.map((promo) => {
                  const statusConfig = STATUS_CONFIG[promo.status]
                  const typeConfig = TYPE_CONFIG[promo.type]
                  const StatusIcon = statusConfig.icon
                  const TypeIcon = typeConfig.icon

                  return (
                    <tr key={promo.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-mono font-bold text-foreground">
                            {promo.code}
                          </div>
                          {promo.name && (
                            <div className="text-sm text-muted-foreground">{promo.name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center text-sm text-muted-foreground">
                          <TypeIcon className="h-4 w-4 mr-1" />
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-foreground">
                          {formatValue(promo)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-muted-foreground">
                          {formatDate(promo.valid_from)}
                          {promo.valid_until && (
                            <>
                              <br />
                              до {formatDate(promo.valid_until)}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-foreground">
                          {promo.current_uses}
                          {promo.max_uses && ` / ${promo.max_uses}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`flex items-center text-sm ${statusConfig.color}`}>
                          <StatusIcon className="h-4 w-4 mr-1" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === promo.id ? null : promo.id)}
                            className="p-2 hover:bg-muted rounded-md"
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                          {menuOpen === promo.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-md shadow-lg z-10">
                              <Link
                                href={`/dashboard/promo-codes/${promo.id}`}
                                className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                              >
                                Редактировать
                              </Link>
                              {promo.status === 'draft' && (
                                <button
                                  onClick={() => {
                                    activateMutation.mutate(promo.id)
                                    setMenuOpen(null)
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-muted"
                                >
                                  <Play className="h-4 w-4 inline mr-2" />
                                  Активировать
                                </button>
                              )}
                              {promo.status === 'active' && (
                                <button
                                  onClick={() => {
                                    pauseMutation.mutate(promo.id)
                                    setMenuOpen(null)
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-yellow-600 hover:bg-muted"
                                >
                                  <Pause className="h-4 w-4 inline mr-2" />
                                  Приостановить
                                </button>
                              )}
                              {promo.status === 'paused' && (
                                <button
                                  onClick={() => {
                                    activateMutation.mutate(promo.id)
                                    setMenuOpen(null)
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-muted"
                                >
                                  <Play className="h-4 w-4 inline mr-2" />
                                  Возобновить
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (confirm('Удалить промокод?')) {
                                    deleteMutation.mutate(promo.id)
                                    setMenuOpen(null)
                                  }
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-muted"
                              >
                                <Trash2 className="h-4 w-4 inline mr-2" />
                                Удалить
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    Промокоды не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
