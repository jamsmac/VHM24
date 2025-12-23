'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { FormInput, FormSelect, FormTextarea } from '../ui/form-field'
import { sparePartsApi } from '@/lib/equipment-api'
import { getErrorMessage } from '@/lib/utils'
import {
  ComponentType,
  ComponentTypeLabels,
  type CreateSparePartDto,
  type SparePart,
} from '@/types/equipment'

interface SparePartModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  sparePart?: SparePart | null
}

export function SparePartModal({
  isOpen,
  onClose,
  onSuccess,
  sparePart,
}: SparePartModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<CreateSparePartDto>({
    part_number: '',
    name: '',
    description: '',
    component_type: ComponentType.OTHER,
    manufacturer: '',
    quantity_in_stock: 0,
    min_stock_level: 0,
    max_stock_level: 0,
    unit: 'pcs',
    unit_price: 0,
    currency: 'UZS',
    supplier_name: '',
    supplier_part_number: '',
    storage_location: '',
    notes: '',
  })

  useEffect(() => {
    if (sparePart) {
      setFormData({
        part_number: sparePart.part_number,
        name: sparePart.name,
        description: sparePart.description || '',
        component_type: sparePart.component_type,
        manufacturer: sparePart.manufacturer || '',
        quantity_in_stock: sparePart.quantity_in_stock,
        min_stock_level: sparePart.min_stock_level,
        max_stock_level: sparePart.max_stock_level,
        unit: sparePart.unit,
        unit_price: sparePart.unit_price,
        currency: sparePart.currency,
        supplier_name: sparePart.supplier_name || '',
        supplier_part_number: sparePart.supplier_part_number || '',
        storage_location: sparePart.storage_location || '',
        notes: sparePart.notes || '',
      })
    }
  }, [sparePart])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (sparePart) {
        await sparePartsApi.update(sparePart.id, formData)
      } else {
        await sparePartsApi.create(formData)
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Ошибка при сохранении запчасти'))
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{sparePart ? 'Редактировать запчасть' : 'Добавить запчасть'}</DialogTitle>
        </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormInput
              label="Артикул"
              id="part_number"
              type="text"
              required
              disabled={!!sparePart}
              value={formData.part_number}
              onChange={(e) => handleChange('part_number', e.target.value)}
              helpText={sparePart ? 'Артикул нельзя изменить' : undefined}
            />
          </div>

          <FormInput
            label="Название"
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />

          <FormSelect
            label="Тип компонента"
            id="component_type"
            required
            value={formData.component_type}
            onChange={(e) => handleChange('component_type', e.target.value)}
            options={Object.entries(ComponentTypeLabels).map(([key, label]) => ({
              value: key,
              label,
            }))}
          />

          <FormInput
            label="Производитель"
            id="manufacturer"
            type="text"
            value={formData.manufacturer}
            onChange={(e) => handleChange('manufacturer', e.target.value)}
          />

          <FormInput
            label="Количество на складе"
            id="quantity_in_stock"
            type="number"
            required
            min={0}
            value={formData.quantity_in_stock}
            onChange={(e) => handleChange('quantity_in_stock', e.target.value, 'number')}
          />

          <FormInput
            label="Минимальный остаток"
            id="min_stock_level"
            type="number"
            required
            min={0}
            value={formData.min_stock_level}
            onChange={(e) => handleChange('min_stock_level', e.target.value, 'number')}
          />

          <FormInput
            label="Максимальный остаток"
            id="max_stock_level"
            type="number"
            min={0}
            value={formData.max_stock_level}
            onChange={(e) => handleChange('max_stock_level', e.target.value, 'number')}
          />

          <FormSelect
            label="Единица измерения"
            id="unit"
            value={formData.unit}
            onChange={(e) => handleChange('unit', e.target.value)}
            options={[
              { value: 'pcs', label: 'шт' },
              { value: 'set', label: 'компл' },
              { value: 'kg', label: 'кг' },
              { value: 'l', label: 'л' },
              { value: 'm', label: 'м' },
            ]}
          />

          <FormInput
            label="Цена за единицу"
            id="unit_price"
            type="number"
            required
            min={0}
            step="0.01"
            value={formData.unit_price}
            onChange={(e) => handleChange('unit_price', e.target.value, 'number')}
          />

          <FormSelect
            label="Валюта"
            id="currency"
            value={formData.currency}
            onChange={(e) => handleChange('currency', e.target.value)}
            options={[
              { value: 'UZS', label: 'сўм UZS' },
              { value: 'USD', label: '$ USD' },
              { value: 'EUR', label: '€ EUR' },
            ]}
          />

          <FormInput
            label="Поставщик"
            id="supplier_name"
            type="text"
            value={formData.supplier_name}
            onChange={(e) => handleChange('supplier_name', e.target.value)}
          />

          <FormInput
            label="Артикул у поставщика"
            id="supplier_part_number"
            type="text"
            value={formData.supplier_part_number}
            onChange={(e) => handleChange('supplier_part_number', e.target.value)}
          />

          <FormInput
            label="Место хранения"
            id="storage_location"
            type="text"
            value={formData.storage_location}
            onChange={(e) => handleChange('storage_location', e.target.value)}
            placeholder="Склад A, Полка 5"
          />
        </div>

        <FormTextarea
          label="Описание"
          id="description"
          rows={2}
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
        />

        <FormTextarea
          label="Примечания"
          id="notes"
          rows={2}
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
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
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Сохранение...' : sparePart ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>
      </DialogContent>
    </Dialog>
  )
}
