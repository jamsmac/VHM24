'use client'

import { useState, useEffect } from 'react'
import { MoveRight, Download, Upload, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { FormSelect, FormTextarea } from '../ui/form-field'
import { componentsApi } from '@/lib/equipment-api'
import type {
  EquipmentComponent,
} from '@/types/equipment'
import {
  ComponentLocationType,
  MovementType,
  ComponentLocationTypeLabels,
} from '@/types/equipment'

interface ComponentMovementModalProps {
  isOpen: boolean
  onClose: () => void
  component: EquipmentComponent
  action: 'move' | 'install' | 'remove'
  onSuccess: () => void
}

export function ComponentMovementModal({
  isOpen,
  onClose,
  component,
  action,
  onSuccess,
}: ComponentMovementModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [toLocation, setToLocation] = useState<ComponentLocationType>(ComponentLocationType.WAREHOUSE)
  const [machineId, setMachineId] = useState('')
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setComment('')
      if (action === 'remove') {
        setToLocation(ComponentLocationType.WAREHOUSE)
      }
    }
  }, [isOpen, action])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (action === 'install') {
        if (!machineId) {
          setError('Выберите машину для установки')
          setLoading(false)
          return
        }
        await componentsApi.install(component.id, {
          machine_id: machineId,
          comment: comment || undefined,
        })
      } else if (action === 'remove') {
        await componentsApi.remove(component.id, {
          target_location: toLocation,
          comment: comment || undefined,
        })
      } else if (action === 'move') {
        await componentsApi.move(component.id, {
          to_location_type: toLocation,
          movement_type: getMovementType(toLocation),
          comment: comment || undefined,
        })
      }

      onSuccess()
    } catch (err: any) {
      console.error('Error moving component:', err)
      setError(err.response?.data?.message || 'Ошибка при перемещении компонента')
    } finally {
      setLoading(false)
    }
  }

  const getMovementType = (targetLocation: ComponentLocationType): MovementType => {
    const currentLocation = component.current_location_type

    if (targetLocation === ComponentLocationType.WASHING) {return MovementType.SEND_TO_WASH}
    if (targetLocation === ComponentLocationType.DRYING) {return MovementType.SEND_TO_DRYING}
    if (targetLocation === ComponentLocationType.REPAIR) {return MovementType.SEND_TO_REPAIR}
    if (targetLocation === ComponentLocationType.WAREHOUSE) {
      if (currentLocation === ComponentLocationType.WASHING) {return MovementType.RETURN_FROM_WASH}
      if (currentLocation === ComponentLocationType.DRYING) {return MovementType.RETURN_FROM_DRYING}
      if (currentLocation === ComponentLocationType.REPAIR) {return MovementType.RETURN_FROM_REPAIR}
      return MovementType.MOVE_TO_WAREHOUSE
    }
    return MovementType.MOVE_TO_WAREHOUSE
  }

  const getIcon = () => {
    if (action === 'install') {return <Download className="h-5 w-5" />}
    if (action === 'remove') {return <Upload className="h-5 w-5" />}
    return <MoveRight className="h-5 w-5" />
  }

  const getTitle = () => {
    if (action === 'install') {return 'Установить компонент в машину'}
    if (action === 'remove') {return 'Снять компонент с машины'}
    return 'Переместить компонент'
  }

  const getLocationOptions = () => {
    if (action === 'remove') {
      return [
        { value: 'warehouse', label: ComponentLocationTypeLabels.warehouse },
        { value: 'washing', label: ComponentLocationTypeLabels.washing },
        { value: 'repair', label: ComponentLocationTypeLabels.repair },
      ]
    }

    // For move action
    const options = [
      { value: 'warehouse', label: ComponentLocationTypeLabels.warehouse },
      { value: 'washing', label: ComponentLocationTypeLabels.washing },
      { value: 'drying', label: ComponentLocationTypeLabels.drying },
      { value: 'repair', label: ComponentLocationTypeLabels.repair },
    ]

    // Exclude current location
    return options.filter(opt => opt.value !== component.current_location_type)
  }

  const handleChange = (field: string, value: any) => {
    if (field === 'toLocation') {
      setToLocation(value as ComponentLocationType)
    } else if (field === 'machineId') {
      setMachineId(value)
    } else if (field === 'comment') {
      setComment(value)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Component info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Компонент</p>
            <p className="font-medium text-gray-900">{component.name}</p>
            {component.serial_number && (
              <p className="text-sm text-gray-600">SN: {component.serial_number}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Текущее местоположение: {ComponentLocationTypeLabels[component.current_location_type]}
            </p>
          </div>

          {/* Install action: select machine */}
          {action === 'install' && (
            <FormSelect
              label="Машина"
              id="machineId"
              required
              value={machineId}
              onChange={(e) => handleChange('machineId', e.target.value)}
              options={[
                { value: '', label: 'Выберите машину...' },
                { value: 'mock-machine-1', label: 'Машина #1' },
                { value: 'mock-machine-2', label: 'Машина #2' },
              ]}
              helpText="Выберите машину для установки компонента"
            />
          )}

          {/* Remove/Move action: select target location */}
          {(action === 'remove' || action === 'move') && (
            <FormSelect
              label={action === 'remove' ? 'Куда снять' : 'Куда переместить'}
              id="toLocation"
              required
              value={toLocation}
              onChange={(e) => handleChange('toLocation', e.target.value)}
              options={getLocationOptions()}
            />
          )}

          {/* Comment */}
          <FormTextarea
            label="Комментарий"
            id="comment"
            rows={3}
            value={comment}
            onChange={(e) => handleChange('comment', e.target.value)}
            placeholder="Опциональный комментарий к перемещению..."
          />

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Выполняется...
                </>
              ) : (
                <>
                  {getIcon()}
                  {action === 'install' ? 'Установить' : action === 'remove' ? 'Снять' : 'Переместить'}
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
