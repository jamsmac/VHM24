'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { inventoryApi } from '@/lib/inventory-api'
import { usersApi } from '@/lib/users-api'
import { UserRole } from '@/types/users'
import { machinesApi } from '@/lib/machines-api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-toastify'
import { getErrorMessage } from '@/lib/utils'

interface TransferItem {
  product_id: string
  quantity: number
  notes?: string
}

export default function OperatorToMachineTransferPage() {
  const router = useRouter()
  const [operatorId, setOperatorId] = useState('')
  const [machineId, setMachineId] = useState('')
  const [items, setItems] = useState<TransferItem[]>([{ product_id: '', quantity: 0 }])

  const { data: operators } = useQuery({
    queryKey: ['users', 'operators'],
    queryFn: () => usersApi.getAll({ role: UserRole.OPERATOR }),
  })

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => machinesApi.getAll({}),
  })

  const { data: operatorInventory } = useQuery({
    queryKey: ['inventory', 'operator', operatorId],
    queryFn: () => inventoryApi.getOperatorInventory(operatorId),
    enabled: !!operatorId,
  })

  const transferMutation = useMutation({
    mutationFn: async (data: { operator_id: string; machine_id: string; items: TransferItem[] }) => {
      // Transfer each item separately
      for (const item of data.items) {
        await inventoryApi.transferOperatorToMachine({
          operator_id: data.operator_id,
          machine_id: data.machine_id,
          nomenclature_id: item.product_id,
          quantity: item.quantity,
          notes: item.notes,
        })
      }
    },
    onSuccess: () => {
      toast.success('Товары успешно загружены в аппарат')
      router.push('/inventory/machines')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при загрузке товаров'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validItems = items.filter(item => item.product_id && item.quantity > 0)

    if (validItems.length === 0) {
      toast.error('Добавьте хотя бы один товар')
      return
    }

    transferMutation.mutate({
      operator_id: operatorId,
      machine_id: machineId,
      items: validItems,
    })
  }

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof TransferItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const getAvailableQuantity = (productId: string): number => {
    const item = operatorInventory?.find(i => i.product?.id === productId)
    return item?.quantity || 0
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inventory/operators">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Загрузка товара в аппарат</h1>
          <p className="mt-2 text-gray-600">Оператор → Аппарат</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Operator Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Оператор *
            </label>
            <select
              required
              value={operatorId}
              onChange={(e) => {
                setOperatorId(e.target.value)
                setItems([{ product_id: '', quantity: 0 }])
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Выберите оператора</option>
              {operators?.map((operator) => (
                <option key={operator.id} value={operator.id}>
                  {operator.full_name} ({operator.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Machine Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Аппарат *
            </label>
            <select
              required
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Выберите аппарат</option>
              {machines?.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.machine_number} - {machine.location?.name}
                </option>
              ))}
            </select>
          </div>

          {/* Items */}
          {operatorId && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Товары *
                </label>
                <Button type="button" variant="secondary" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить товар
                </Button>
              </div>

              {operatorInventory && operatorInventory.length === 0 ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-700">
                    У выбранного оператора нет товаров. Сначала передайте товары со склада.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <select
                          required
                          value={item.product_id}
                          onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Выберите товар</option>
                          {operatorInventory?.filter(invItem => invItem.product).map((invItem) => (
                            <option key={invItem.product!.id} value={invItem.product!.id}>
                              {invItem.product!.name} (Доступно: {invItem.quantity})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-32">
                        <input
                          type="number"
                          required
                          min="1"
                          max={getAvailableQuantity(item.product_id)}
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Кол-во"
                        />
                      </div>

                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm text-gray-500 mt-2">
                Количество не должно превышать запас у оператора
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Информация</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Товары будут списаны с инвентаря оператора</li>
              <li>• Товары будут добавлены в инвентарь аппарата</li>
              <li>• Проверяется максимальная емкость слотов аппарата</li>
              <li>• Операция будет зафиксирована в истории передач</li>
              <li>• Транзакция выполняется атомарно (все или ничего)</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={transferMutation.isPending || !operatorInventory || operatorInventory.length === 0}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              {transferMutation.isPending ? 'Загрузка...' : 'Загрузить в аппарат'}
            </Button>
            <Link href="/inventory/operators">
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
