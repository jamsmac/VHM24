'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { counterpartiesApi } from '@/lib/counterparties-api'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CounterpartyType, CreateCounterpartyDto } from '@/types/counterparty'
import { toast } from 'react-toastify'

export default function CreateCounterpartyPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<CreateCounterpartyDto>({
    name: '',
    type: CounterpartyType.CLIENT,
    inn: '',
    is_vat_payer: true,
    vat_rate: 15,
    is_active: true,
  })

  const createMutation = useMutation({
    mutationFn: counterpartiesApi.create,
    onSuccess: (data) => {
      toast.success('Контрагент успешно создан')
      queryClient.invalidateQueries({ queryKey: ['counterparties'] })
      router.push(`/dashboard/counterparties/${data.id}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при создании контрагента')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handleChange = (field: keyof CreateCounterpartyDto, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/counterparties">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Создать контрагента</h1>
          <p className="mt-2 text-gray-600">Заполните данные нового контрагента</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Основная информация</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormInput
                label="Название организации"
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="ООО Пример"
              />
            </div>

            <FormInput
              label="Краткое название"
              id="short_name"
              type="text"
              value={formData.short_name || ''}
              onChange={(e) => handleChange('short_name', e.target.value)}
              placeholder="Пример"
            />

            <FormSelect
              label="Тип"
              id="type"
              required
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value as CounterpartyType)}
              options={[
                { value: 'client', label: 'Клиент' },
                { value: 'supplier', label: 'Поставщик' },
                { value: 'partner', label: 'Партнер' },
                { value: 'location_owner', label: 'Владелец локации' },
              ]}
            />
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Налоговая информация</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="ИНН (9 цифр)"
              id="inn"
              type="text"
              required
              pattern="[0-9]{9}"
              value={formData.inn}
              onChange={(e) => handleChange('inn', e.target.value)}
              placeholder="123456789"
              maxLength={9}
            />

            <FormInput
              label="ОКЭД"
              id="oked"
              type="text"
              value={formData.oked || ''}
              onChange={(e) => handleChange('oked', e.target.value)}
              placeholder="12345"
            />

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_vat_payer}
                  onChange={(e) => handleChange('is_vat_payer', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Плательщик НДС</span>
              </label>
            </div>

            {formData.is_vat_payer && (
              <FormInput
                label="Ставка НДС (%)"
                id="vat_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.vat_rate || 15}
                onChange={(e) => handleChange('vat_rate', parseFloat(e.target.value))}
              />
            )}
          </div>
        </div>

        {/* Banking Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Банковские реквизиты</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="МФО (5 цифр)"
              id="mfo"
              type="text"
              pattern="[0-9]{5}"
              value={formData.mfo || ''}
              onChange={(e) => handleChange('mfo', e.target.value)}
              placeholder="12345"
              maxLength={5}
            />

            <FormInput
              label="Расчетный счет"
              id="bank_account"
              type="text"
              value={formData.bank_account || ''}
              onChange={(e) => handleChange('bank_account', e.target.value)}
              placeholder="20208000000000000001"
            />

            <div className="md:col-span-2">
              <FormInput
                label="Название банка"
                id="bank_name"
                type="text"
                value={formData.bank_name || ''}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                placeholder="АКБ Узбекистан"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Контактная информация</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Контактное лицо"
              id="contact_person"
              type="text"
              value={formData.contact_person || ''}
              onChange={(e) => handleChange('contact_person', e.target.value)}
              placeholder="Иванов Иван Иванович"
            />

            <FormInput
              label="Телефон"
              id="phone"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+998 90 123 45 67"
            />

            <div className="md:col-span-2">
              <FormInput
                label="Email"
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="example@company.uz"
              />
            </div>

            <div className="md:col-span-2">
              <FormTextarea
                label="Юридический адрес"
                id="legal_address"
                rows={2}
                value={formData.legal_address || ''}
                onChange={(e) => handleChange('legal_address', e.target.value)}
                placeholder="г. Ташкент, ул. Амира Темура, д. 1"
              />
            </div>

            <div className="md:col-span-2">
              <FormTextarea
                label="Фактический адрес"
                id="actual_address"
                rows={2}
                value={formData.actual_address || ''}
                onChange={(e) => handleChange('actual_address', e.target.value)}
                placeholder="г. Ташкент, ул. Амира Темура, д. 1"
              />
            </div>
          </div>
        </div>

        {/* Director Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Информация о директоре</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="ФИО директора"
              id="director_name"
              type="text"
              value={formData.director_name || ''}
              onChange={(e) => handleChange('director_name', e.target.value)}
              placeholder="Иванов Иван Иванович"
            />

            <FormInput
              label="Должность"
              id="director_position"
              type="text"
              value={formData.director_position || ''}
              onChange={(e) => handleChange('director_position', e.target.value)}
              placeholder="Генеральный директор"
            />
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Дополнительная информация</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Срок оплаты (дней)"
              id="payment_term_days"
              type="number"
              min="0"
              value={formData.payment_term_days || ''}
              onChange={(e) => handleChange('payment_term_days', parseInt(e.target.value))}
              placeholder="30"
            />

            <FormInput
              label="Кредитный лимит (UZS)"
              id="credit_limit"
              type="number"
              min="0"
              value={formData.credit_limit || ''}
              onChange={(e) => handleChange('credit_limit', parseFloat(e.target.value))}
              placeholder="1000000"
            />

            <div className="md:col-span-2">
              <FormTextarea
                label="Примечания"
                id="notes"
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Дополнительная информация..."
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Активен</span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 md:flex-none"
          >
            {createMutation.isPending ? 'Создание...' : 'Создать контрагента'}
          </Button>
          <Link href="/dashboard/counterparties">
            <Button type="button" variant="outline">
              Отмена
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
