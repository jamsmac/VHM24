'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promoCodesApi, UpdatePromoCodeDto } from '@/lib/promo-codes-api'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import {
  ArrowLeft,
  Save,
  Loader2,
  Play,
  Pause,
  BarChart3,
  Users,
  Gift,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

export default function EditPromoCodePage() {
  const params = useParams()
  const queryClient = useQueryClient()
  const id = params.id as string

  const [formData, setFormData] = useState<UpdatePromoCodeDto>({})

  const { data: promoCode, isLoading } = useQuery({
    queryKey: ['promo-code', id],
    queryFn: () => promoCodesApi.getOne(id),
  })

  const { data: stats } = useQuery({
    queryKey: ['promo-code-stats', id],
    queryFn: () => promoCodesApi.getStats(id),
  })

  useEffect(() => {
    if (promoCode) {
      setFormData({
        type: promoCode.type,
        value: promoCode.value,
        valid_from: promoCode.valid_from.split('T')[0],
        valid_until: promoCode.valid_until?.split('T')[0] || undefined,
        status: promoCode.status,
        max_uses: promoCode.max_uses || undefined,
        max_uses_per_user: promoCode.max_uses_per_user,
        minimum_order_amount: promoCode.minimum_order_amount || undefined,
        maximum_discount: promoCode.maximum_discount || undefined,
        name: promoCode.name || undefined,
        description: promoCode.description || undefined,
      })
    }
  }, [promoCode])

  const updateMutation = useMutation({
    mutationFn: (dto: UpdatePromoCodeDto) => promoCodesApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-code', id] })
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
    },
  })

  const activateMutation = useMutation({
    mutationFn: () => promoCodesApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-code', id] })
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
    },
  })

  const pauseMutation = useMutation({
    mutationFn: () => promoCodesApi.pause(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-code', id] })
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dto: UpdatePromoCodeDto = {
      ...formData,
      valid_from: formData.valid_from
        ? new Date(formData.valid_from).toISOString()
        : undefined,
      valid_until: formData.valid_until
        ? new Date(formData.valid_until).toISOString()
        : undefined,
    }
    updateMutation.mutate(dto)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : undefined) : value,
    }))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
      </div>
    )
  }

  if (!promoCode) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Промокод не найден</p>
        <Link href="/dashboard/promo-codes">
          <Button className="mt-4">Вернуться к списку</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/promo-codes">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground font-mono">{promoCode.code}</h1>
            <p className="mt-1 text-muted-foreground">
              {promoCode.name || 'Редактирование промокода'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {promoCode.status === 'draft' && (
            <Button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Активировать
            </Button>
          )}
          {promoCode.status === 'active' && (
            <Button
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              variant="outline"
            >
              <Pause className="h-4 w-4 mr-2" />
              Приостановить
            </Button>
          )}
          {promoCode.status === 'paused' && (
            <Button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Возобновить
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="h-4 w-4" />
              <p className="text-sm">Использований</p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.total_redemptions}
              {promoCode.max_uses && ` / ${promoCode.max_uses}`}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <p className="text-sm">Уникальных клиентов</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.unique_users}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <p className="text-sm">Скидок выдано</p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.total_discount_given)}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Gift className="h-4 w-4" />
              <p className="text-sm">Бонусов выдано</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.total_bonus_awarded}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Основные параметры</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Название
              </label>
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                placeholder="Летняя распродажа"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Тип скидки
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="percentage">Процент от суммы</option>
                <option value="fixed_amount">Фиксированная сумма</option>
                <option value="loyalty_bonus">Бонусные баллы</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Значение
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  min={0}
                  max={formData.type === 'percentage' ? 100 : undefined}
                  step={formData.type === 'percentage' ? 0.1 : 1}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {formData.type === 'percentage'
                    ? '%'
                    : formData.type === 'fixed_amount'
                    ? 'UZS'
                    : 'баллов'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Статус
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="draft">Черновик</option>
                <option value="active">Активен</option>
                <option value="paused">Приостановлен</option>
                <option value="expired">Истёк</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Начало действия
              </label>
              <input
                type="date"
                name="valid_from"
                value={formData.valid_from || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Окончание действия
              </label>
              <input
                type="date"
                name="valid_until"
                value={formData.valid_until || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Ограничения</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Максимум использований
              </label>
              <input
                type="number"
                name="max_uses"
                value={formData.max_uses || ''}
                onChange={handleChange}
                min={1}
                placeholder="Без ограничения"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Максимум на пользователя
              </label>
              <input
                type="number"
                name="max_uses_per_user"
                value={formData.max_uses_per_user}
                onChange={handleChange}
                min={1}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Минимальная сумма заказа
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="minimum_order_amount"
                  value={formData.minimum_order_amount || ''}
                  onChange={handleChange}
                  min={0}
                  placeholder="Без ограничения"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  UZS
                </span>
              </div>
            </div>

            {formData.type === 'percentage' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Максимальная скидка
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="maximum_discount"
                    value={formData.maximum_discount || ''}
                    onChange={handleChange}
                    min={0}
                    placeholder="Без ограничения"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    UZS
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Описание</h2>

          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows={3}
            placeholder="Описание промокода для клиентов..."
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {updateMutation.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            Ошибка: {(updateMutation.error as Error).message}
          </div>
        )}

        {updateMutation.isSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            Промокод успешно обновлён
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Link href="/dashboard/promo-codes">
            <Button variant="outline">Отмена</Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Сохранить изменения
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
