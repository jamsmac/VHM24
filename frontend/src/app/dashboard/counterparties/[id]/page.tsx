'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { counterpartiesApi } from '@/lib/counterparties-api'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { ArrowLeft, Edit2, Trash2, Phone, Mail, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UpdateCounterpartyDto, CounterpartyType } from '@/types/counterparty'
import type { Contract } from '@/types/contract'
import { toast } from 'react-toastify'
import { getErrorMessage } from '@/lib/utils'

export default function CounterpartyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<UpdateCounterpartyDto>({})

  const { data: counterparty, isLoading } = useQuery({
    queryKey: ['counterparties', params.id],
    queryFn: () => counterpartiesApi.getById(params.id),
  })

  // React Query v5: Use useEffect instead of onSuccess
  useEffect(() => {
    if (counterparty) {
      setFormData({
        name: counterparty.name,
        short_name: counterparty.short_name ?? undefined,
        type: counterparty.type,
        inn: counterparty.inn,
        oked: counterparty.oked ?? undefined,
        mfo: counterparty.mfo ?? undefined,
        bank_account: counterparty.bank_account ?? undefined,
        bank_name: counterparty.bank_name ?? undefined,
        legal_address: counterparty.legal_address ?? undefined,
        actual_address: counterparty.actual_address ?? undefined,
        contact_person: counterparty.contact_person ?? undefined,
        phone: counterparty.phone ?? undefined,
        email: counterparty.email ?? undefined,
        director_name: counterparty.director_name ?? undefined,
        director_position: counterparty.director_position ?? undefined,
        notes: counterparty.notes ?? undefined,
        is_active: counterparty.is_active,
      })
    }
  }, [counterparty])

  const { data: contracts } = useQuery({
    queryKey: ['counterparties', params.id, 'contracts'],
    queryFn: () => counterpartiesApi.getContracts(params.id),
    enabled: !!counterparty,
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCounterpartyDto) => counterpartiesApi.update(params.id, data),
    onSuccess: () => {
      toast.success('Контрагент успешно обновлен')
      queryClient.invalidateQueries({ queryKey: ['counterparties'] })
      setIsEditing(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при обновлении контрагента'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => counterpartiesApi.delete(params.id),
    onSuccess: () => {
      toast.success('Контрагент успешно удален')
      queryClient.invalidateQueries({ queryKey: ['counterparties'] })
      router.push('/dashboard/counterparties')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при удалении контрагента'))
    },
  })

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  const handleDelete = () => {
    if (confirm('Вы уверены, что хотите удалить этого контрагента?')) {
      deleteMutation.mutate()
    }
  }

  const handleChange = (field: keyof UpdateCounterpartyDto, value: UpdateCounterpartyDto[keyof UpdateCounterpartyDto]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
      </div>
    )
  }

  if (!counterparty) {
    return <div className="text-center text-gray-500 py-12">Контрагент не найден</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/counterparties">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{counterparty.name}</h1>
            <p className="mt-2 text-gray-600">ИНН: {counterparty.inn}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Редактировать
              </Button>
              <Button variant="outline" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Отмена
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Edit form - similar to create page but with pre-filled values */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Основная информация</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тип *</label>
                <select
                  value={formData.type || ''}
                  onChange={(e) => handleChange('type', e.target.value as CounterpartyType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="client">Клиент</option>
                  <option value="supplier">Поставщик</option>
                  <option value="partner">Партнер</option>
                  <option value="location_owner">Владелец локации</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ИНН *</label>
                <input
                  type="text"
                  required
                  pattern="[0-9]{9}"
                  value={formData.inn || ''}
                  onChange={(e) => handleChange('inn', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  maxLength={9}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Активен</span>
                </label>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <>
          {/* View mode - display counterparty details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Основная информация</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Тип</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {counterparty.type === 'client' && 'Клиент'}
                    {counterparty.type === 'supplier' && 'Поставщик'}
                    {counterparty.type === 'partner' && 'Партнер'}
                    {counterparty.type === 'location_owner' && 'Владелец локации'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Статус</dt>
                  <dd className="mt-1">
                    {counterparty.is_active ? (
                      <span className="flex items-center text-sm text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Активен
                      </span>
                    ) : (
                      <span className="flex items-center text-sm text-gray-400">
                        <XCircle className="h-4 w-4 mr-1" />
                        Неактивен
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">ИНН</dt>
                  <dd className="mt-1 text-sm text-gray-900">{counterparty.inn}</dd>
                </div>
                {counterparty.oked && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ОКЭД</dt>
                    <dd className="mt-1 text-sm text-gray-900">{counterparty.oked}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">НДС</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {counterparty.is_vat_payer
                      ? `Плательщик НДС (${counterparty.vat_rate}%)`
                      : 'Не плательщик НДС'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Контактная информация</h3>
              <dl className="space-y-3">
                {counterparty.contact_person && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Контактное лицо</dt>
                    <dd className="mt-1 text-sm text-gray-900">{counterparty.contact_person}</dd>
                  </div>
                )}
                {counterparty.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Телефон</dt>
                    <dd className="mt-1 text-sm text-gray-900 flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {counterparty.phone}
                    </dd>
                  </div>
                )}
                {counterparty.email && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900 flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {counterparty.email}
                    </dd>
                  </div>
                )}
                {counterparty.legal_address && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Юридический адрес</dt>
                    <dd className="mt-1 text-sm text-gray-900">{counterparty.legal_address}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Contracts section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Договоры</h3>
              <Link href={`/dashboard/contracts/create?counterparty_id=${counterparty.id}`}>
                <Button variant="outline" size="sm">
                  Создать договор
                </Button>
              </Link>
            </div>
            {contracts && contracts.length > 0 ? (
              <div className="space-y-2">
                {contracts.map((contract: Contract) => (
                  <Link
                    key={contract.id}
                    href={`/dashboard/contracts/${contract.id}`}
                    className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{contract.contract_number}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(contract.start_date).toLocaleDateString('ru-RU')} -{' '}
                          {contract.end_date
                            ? new Date(contract.end_date).toLocaleDateString('ru-RU')
                            : 'Бессрочный'}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          contract.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {contract.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Договоры отсутствуют</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
