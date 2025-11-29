'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { FormInput, FormSelect, FormTextarea } from '../ui/form-field'
import { componentsApi } from '@/lib/equipment-api'
import {
  ComponentType,
  ComponentStatus,
  ComponentTypeLabels,
  ComponentStatusLabels,
  type CreateComponentDto,
  type EquipmentComponent,
} from '@/types/equipment'

interface ComponentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  component?: EquipmentComponent | null
  machineId?: string
}

export function ComponentModal({
  isOpen,
  onClose,
  onSuccess,
  component,
  machineId,
}: ComponentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<CreateComponentDto>({
    machine_id: machineId || '',
    component_type: ComponentType.OTHER,
    name: '',
    model: '',
    serial_number: '',
    manufacturer: '',
    status: ComponentStatus.ACTIVE,
    installation_date: undefined,
    maintenance_interval_days: undefined,
    expected_lifetime_hours: undefined,
    warranty_expiration_date: undefined,
    notes: '',
  })

  useEffect(() => {
    if (component) {
      setFormData({
        machine_id: component.machine_id || '',
        component_type: component.component_type,
        name: component.name,
        model: component.model || '',
        serial_number: component.serial_number || '',
        manufacturer: component.manufacturer || '',
        status: component.status,
        installation_date: component.installation_date
          ? new Date(component.installation_date)
          : undefined,
        maintenance_interval_days: component.maintenance_interval_days || undefined,
        expected_lifetime_hours: component.expected_lifetime_hours || undefined,
        warranty_expiration_date: component.warranty_expiration_date
          ? new Date(component.warranty_expiration_date)
          : undefined,
        notes: component.notes || '',
      })
    } else if (machineId) {
      setFormData((prev) => ({ ...prev, machine_id: machineId }))
    }
  }, [component, machineId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (component) {
        await componentsApi.update(component.id, formData)
      } else {
        await componentsApi.create(formData)
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при сохранении компонента')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: any, type?: string) => {
    if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [field]: value ? Number(value) : undefined,
      }))
    } else if (type === 'date') {
      setFormData((prev) => ({
        ...prev,
        [field]: value ? new Date(value) : undefined,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value || undefined,
      }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{component ? 'Редактировать компонент' : 'Добавить компонент'}</DialogTitle>
        </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="ID Аппарата"
            id="machine_id"
            type="text"
            required
            value={formData.machine_id}
            onChange={(e) => handleChange('machine_id', e.target.value)}
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
            label="Название"
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />

          <FormInput
            label="Модель"
            id="model"
            type="text"
            value={formData.model}
            onChange={(e) => handleChange('model', e.target.value)}
          />

          <FormInput
            label="Серийный номер"
            id="serial_number"
            type="text"
            value={formData.serial_number}
            onChange={(e) => handleChange('serial_number', e.target.value)}
          />

          <FormInput
            label="Производитель"
            id="manufacturer"
            type="text"
            value={formData.manufacturer}
            onChange={(e) => handleChange('manufacturer', e.target.value)}
          />

          <FormSelect
            label="Статус"
            id="status"
            required
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            options={Object.entries(ComponentStatusLabels).map(([key, label]) => ({
              value: key,
              label,
            }))}
          />

          <FormInput
            label="Дата установки"
            id="installation_date"
            type="date"
            value={
              formData.installation_date instanceof Date
                ? formData.installation_date.toISOString().split('T')[0]
                : ''
            }
            onChange={(e) => handleChange('installation_date', e.target.value, 'date')}
          />

          <FormInput
            label="Интервал ТО (дни)"
            id="maintenance_interval_days"
            type="number"
            min={1}
            value={formData.maintenance_interval_days || ''}
            onChange={(e) => handleChange('maintenance_interval_days', e.target.value, 'number')}
          />

          <FormInput
            label="Ожидаемый срок службы (часы)"
            id="expected_lifetime_hours"
            type="number"
            min={1}
            value={formData.expected_lifetime_hours || ''}
            onChange={(e) => handleChange('expected_lifetime_hours', e.target.value, 'number')}
          />

          <FormInput
            label="Гарантия до"
            id="warranty_expiration_date"
            type="date"
            value={
              formData.warranty_expiration_date instanceof Date
                ? formData.warranty_expiration_date.toISOString().split('T')[0]
                : ''
            }
            onChange={(e) => handleChange('warranty_expiration_date', e.target.value, 'date')}
          />
        </div>

        <FormTextarea
          label="Примечания"
          id="notes"
          rows={3}
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
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Сохранение...' : component ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>
      </DialogContent>
    </Dialog>
  )
}
