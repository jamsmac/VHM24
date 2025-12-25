'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { promoCodesApi, CreatePromoCodeDto } from '@/lib/promo-codes-api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function CreatePromoCodePage() {
  const router = useRouter()
  const [formData, setFormData] = useState<CreatePromoCodeDto>({
    code: '',
    type: 'percentage',
    value: 10,
    valid_from: new Date().toISOString().split('T')[0],
    status: 'draft',
    max_uses_per_user: 1,
  })

  const createMutation = useMutation({
    mutationFn: promoCodesApi.create,
    onSuccess: () => {
      router.push('/dashboard/promo-codes')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dto: CreatePromoCodeDto = {
      ...formData,
      code: formData.code.toUpperCase(),
      valid_from: new Date(formData.valid_from).toISOString(),
      valid_until: formData.valid_until
        ? new Date(formData.valid_until).toISOString()
        : undefined,
    }
    createMutation.mutate(dto)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/promo-codes">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Создание промокода</h1>
          <p className="mt-1 text-muted-foreground">Заполните параметры нового промокода</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Основные параметры</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Код промокода *
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                pattern="^[A-Za-z0-9_-]+$"
                placeholder="SUMMER2024"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground uppercase focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Только буквы, цифры, дефис и подчёркивание
              </p>
            </div>

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
                Тип скидки *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="percentage">Процент от суммы</option>
                <option value="fixed_amount">Фиксированная сумма</option>
                <option value="loyalty_bonus">Бонусные баллы</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Значение *
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  required
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
                Начало действия *
              </label>
              <input
                type="date"
                name="valid_from"
                value={formData.valid_from}
                onChange={handleChange}
                required
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
                min={formData.valid_from}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Оставьте пустым для бессрочного действия
              </p>
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
              </select>
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

        {createMutation.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            Ошибка: {(createMutation.error as Error).message}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Link href="/dashboard/promo-codes">
            <Button variant="outline">Отмена</Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Создание...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Создать промокод
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
