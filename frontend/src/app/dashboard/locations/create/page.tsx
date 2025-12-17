'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { locationsApi } from '@/lib/locations-api'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-toastify'
import { getErrorMessage } from '@/lib/utils'

export default function CreateLocationPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    location_type: '',
    foot_traffic: '',
    contact_person: '',
    contact_phone: '',
    notes: '',
  })

  const createMutation = useMutation({
    mutationFn: locationsApi.create,
    onSuccess: () => {
      toast.success('Локация создана успешно')
      router.push('/locations')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при создании локации'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...formData,
      foot_traffic: formData.foot_traffic,
    })
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/locations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Добавить локацию</h1>
          <p className="mt-2 text-gray-600">Создание новой точки размещения</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <FormInput
                label="Название"
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="ТЦ Мега"
              />
            </div>

            <div className="md:col-span-2">
              <FormInput
                label="Адрес"
                id="address"
                type="text"
                required
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="г. Москва, ул. Ленина, д. 1"
              />
            </div>

            <div>
              <FormSelect
                label="Тип локации"
                id="location_type"
                value={formData.location_type}
                onChange={(e) => handleChange('location_type', e.target.value)}
                options={[
                  { value: '', label: 'Выберите тип' },
                  { value: 'shopping_mall', label: 'Торговый центр' },
                  { value: 'office', label: 'Офис' },
                  { value: 'metro', label: 'Метро' },
                  { value: 'university', label: 'Университет' },
                  { value: 'hospital', label: 'Больница' },
                  { value: 'airport', label: 'Аэропорт' },
                  { value: 'other', label: 'Другое' },
                ]}
              />
            </div>

            <div>
              <FormInput
                label="Проходимость (чел/день)"
                id="foot_traffic"
                type="number"
                value={formData.foot_traffic}
                onChange={(e) => handleChange('foot_traffic', e.target.value)}
                placeholder="1000"
              />
            </div>

            <div>
              <FormInput
                label="Контактное лицо"
                id="contact_person"
                type="text"
                value={formData.contact_person}
                onChange={(e) => handleChange('contact_person', e.target.value)}
                placeholder="Иванов И.И."
              />
            </div>

            <div>
              <FormInput
                label="Телефон"
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div className="md:col-span-2">
              <FormTextarea
                label="Примечания"
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Дополнительная информация о локации..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать локацию'}
            </Button>
            <Link href="/locations">
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
