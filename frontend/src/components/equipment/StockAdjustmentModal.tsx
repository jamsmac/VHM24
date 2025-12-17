'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { FormInput, FormTextarea } from '../ui/form-field'
import { sparePartsApi } from '@/lib/equipment-api'
import { getErrorMessage } from '@/lib/utils'
import type { SparePart, AdjustStockDto } from '@/types/equipment'

interface StockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  sparePart: SparePart | null
}

export function StockAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  sparePart,
}: StockAdjustmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<AdjustStockDto>({
    quantity: 0,
    reason: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sparePart) {return}

    setLoading(true)
    setError(null)

    try {
      await sparePartsApi.adjustStock(sparePart.id, formData)
      onSuccess()
      onClose()
      // Reset form
      setFormData({ quantity: 0, reason: '' })
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Ошибка при изменении остатка'))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string | number, type?: string) => {
    if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [field]: value ? Number(value) : 0,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value || '',
      }))
    }
  }

  const newStock = sparePart ? sparePart.quantity_in_stock + formData.quantity : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Изменить остаток: {sparePart?.name || ''}</DialogTitle>
        </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Current Stock */}
        {sparePart && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Текущий остаток:</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sparePart.quantity_in_stock} {sparePart.unit}
                </p>
              </div>
              <div>
                <p className="text-gray-600">После изменения:</p>
                <p className={`text-2xl font-bold ${
                  newStock < sparePart.min_stock_level
                    ? 'text-red-600'
                    : newStock >= sparePart.min_stock_level && newStock <= sparePart.max_stock_level
                    ? 'text-green-600'
                    : 'text-orange-600'
                }`}>
                  {newStock} {sparePart.unit}
                </p>
              </div>
            </div>
            {newStock < 0 && (
              <p className="text-xs text-red-600 mt-2">
                ⚠️ Отрицательный остаток недопустим
              </p>
            )}
          </div>
        )}

        {/* Quantity Adjustment */}
        <div>
          <FormInput
            label="Изменение"
            id="quantity"
            type="number"
            required
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', e.target.value, 'number')}
            placeholder="Положительное - поступление, отрицательное - расход"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, quantity: 10 }))}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              +10
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, quantity: 1 }))}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, quantity: -1 }))}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              -1
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, quantity: -10 }))}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              -10
            </button>
          </div>
        </div>

        {/* Reason */}
        <FormTextarea
          label="Причина"
          id="reason"
          required
          rows={3}
          value={formData.reason}
          onChange={(e) => handleChange('reason', e.target.value)}
          placeholder="Например: Поступление от поставщика XYZ, Использовано при ремонте, Инвентаризация"
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading || newStock < 0}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Сохранение...' : 'Применить'}
          </button>
        </div>
      </form>
      </DialogContent>
    </Dialog>
  )
}
