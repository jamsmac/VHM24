'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { machinesApi } from '@/lib/machines-api'
import { locationsApi } from '@/lib/locations-api'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-toastify'
import { getErrorMessage } from '@/lib/utils'
import { MachineStatus } from '@/types/machines'

export default function CreateMachinePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    machine_number: '',
    name: '',
    type_code: 'vending',
    location_id: '',
    model: '',
    serial_number: '',
    status: 'active' as MachineStatus,
    max_product_slots: 20,
    cash_capacity: '',
    accepts_cash: true,
    accepts_card: false,
    accepts_qr: false,
    accepts_nfc: false,
    description: '',
  })

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: machinesApi.create,
    onSuccess: () => {
      toast.success('Аппарат создан успешно')
      router.push('/machines')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при создании аппарата'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      machine_number: formData.machine_number,
      name: formData.name,
      type_code: formData.type_code,
      location_id: formData.location_id,
      model: formData.model,
      serial_number: formData.serial_number,
      max_product_slots: formData.max_product_slots,
      cash_capacity: parseFloat(formData.cash_capacity) || 0,
      accepts_cash: formData.accepts_cash,
      accepts_card: formData.accepts_card,
      accepts_qr: formData.accepts_qr,
      accepts_nfc: formData.accepts_nfc,
    })
  }

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/machines">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Добавить аппарат</h1>
          <p className="mt-2 text-gray-600">Регистрация нового вендингового автомата</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormInput
            label="Номер аппарата"
            id="machine_number"
            type="text"
            required
            value={formData.machine_number}
            onChange={(e) => handleChange('machine_number', e.target.value)}
            placeholder="VM-001"
          />

          <FormSelect
            label="Локация"
            id="location_id"
            required
            value={formData.location_id}
            onChange={(e) => handleChange('location_id', e.target.value)}
            options={[
              { value: '', label: 'Выберите локацию' },
              ...(locations?.map((location) => ({
                value: location.id,
                label: `${location.name} - ${location.address}`,
              })) || []),
            ]}
          />

          <FormInput
            label="Модель"
            id="model"
            type="text"
            value={formData.model}
            onChange={(e) => handleChange('model', e.target.value)}
            placeholder="Vendo VMax"
          />

          <FormInput
            label="Серийный номер"
            id="serial_number"
            type="text"
            value={formData.serial_number}
            onChange={(e) => handleChange('serial_number', e.target.value)}
            placeholder="SN123456789"
          />

          <FormInput
            label="Емкость купюроприемника (сўм)"
            id="cash_capacity"
            type="number"
            step="0.01"
            required
            value={formData.cash_capacity}
            onChange={(e) => handleChange('cash_capacity', e.target.value)}
            placeholder="50000"
            helpText="Максимальная сумма наличных, которую может вместить купюроприемник"
          />

          <FormSelect
            label="Статус"
            id="status"
            required
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as MachineStatus)}
            options={[
              { value: 'active', label: 'Активный' },
              { value: 'offline', label: 'Offline' },
              { value: 'maintenance', label: 'На обслуживании' },
            ]}
          />

          <FormTextarea
            label="Описание"
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Дополнительная информация об аппарате..."
          />

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Создание...' : 'Создать аппарат'}
            </Button>
            <Link href="/machines">
              <Button type="button" variant="secondary">
                Отмена
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
