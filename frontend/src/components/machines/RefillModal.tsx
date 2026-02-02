'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LevelBar } from '@/components/ui/level-bar'
import {
  Coffee,
  Droplets,
  CupSoda,
  Package,
  Plus,
  Minus,
  Check,
  AlertTriangle,
} from 'lucide-react'

export interface BunkerInfo {
  id: string
  name: string
  type: 'coffee' | 'water' | 'milk' | 'cups' | 'sugar' | 'other'
  currentLevel: number
  maxCapacity: number
  unit: string
}

export interface RefillModalProps {
  bunker: BunkerInfo | null
  open: boolean
  onClose: () => void
  onConfirm: (bunkerId: string, amount: number) => void
  isLoading?: boolean
}

const bunkerIcons: Record<BunkerInfo['type'], React.ElementType> = {
  coffee: Coffee,
  water: Droplets,
  milk: Droplets,
  cups: CupSoda,
  sugar: Package,
  other: Package,
}

const bunkerColors: Record<BunkerInfo['type'], { bg: string; icon: string }> = {
  coffee: { bg: 'bg-amber-100', icon: 'text-amber-600' },
  water: { bg: 'bg-blue-100', icon: 'text-blue-600' },
  milk: { bg: 'bg-stone-100', icon: 'text-stone-600' },
  cups: { bg: 'bg-orange-100', icon: 'text-orange-600' },
  sugar: { bg: 'bg-stone-100', icon: 'text-stone-600' },
  other: { bg: 'bg-stone-100', icon: 'text-stone-600' },
}

/**
 * RefillModal - Modal for bunker refill operation
 * Part of VendHub "Warm Brew" design system
 */
export function RefillModal({
  bunker,
  open,
  onClose,
  onConfirm,
  isLoading = false,
}: RefillModalProps) {
  const [amount, setAmount] = useState<number>(0)

  if (!bunker) return null

  const Icon = bunkerIcons[bunker.type]
  const colors = bunkerColors[bunker.type]

  const available = bunker.maxCapacity - bunker.currentLevel
  const newLevel = Math.min(bunker.currentLevel + amount, bunker.maxCapacity)
  const newPercentage = Math.round((newLevel / bunker.maxCapacity) * 100)

  const presets = [
    { label: '25%', value: Math.round(bunker.maxCapacity * 0.25) },
    { label: '50%', value: Math.round(bunker.maxCapacity * 0.5) },
    { label: '75%', value: Math.round(bunker.maxCapacity * 0.75) },
    { label: 'До полного', value: available },
  ]

  const handlePresetClick = (value: number) => {
    setAmount(Math.min(value, available))
  }

  const handleIncrement = (delta: number) => {
    setAmount((prev) => Math.max(0, Math.min(prev + delta, available)))
  }

  const handleConfirm = () => {
    if (amount > 0) {
      onConfirm(bunker.id, amount)
      setAmount(0)
    }
  }

  const handleClose = () => {
    setAmount(0)
    onClose()
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Пополнение бункера"
      size="md"
    >
      <div className="space-y-6">
        {/* Bunker Info */}
        <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl">
          <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center', colors.bg)}>
            <Icon className={cn('w-7 h-7', colors.icon)} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-stone-800">{bunker.name}</h3>
            <p className="text-sm text-stone-500">
              Текущий уровень: {bunker.currentLevel.toLocaleString()} / {bunker.maxCapacity.toLocaleString()} {bunker.unit}
            </p>
            <div className="mt-2">
              <LevelBar
                value={bunker.currentLevel}
                max={bunker.maxCapacity}
                threshold={30}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <Label className="text-sm font-medium text-stone-700 mb-2 block">
            Количество для пополнения
          </Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleIncrement(-10)}
              disabled={amount <= 0}
              className="border-stone-200 hover:border-amber-300"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="relative flex-1">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Math.min(Number(e.target.value), available)))}
                className="text-center text-lg font-semibold pr-16"
                min={0}
                max={available}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">
                {bunker.unit}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleIncrement(10)}
              disabled={amount >= available}
              className="border-stone-200 hover:border-amber-300"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Доступно для добавления: {available.toLocaleString()} {bunker.unit}
          </p>
        </div>

        {/* Quick Presets */}
        <div>
          <Label className="text-sm font-medium text-stone-700 mb-2 block">
            Быстрый выбор
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset.value)}
                disabled={preset.value > available}
                className={cn(
                  'py-2 px-3 text-sm font-medium rounded-lg border transition-all',
                  amount === preset.value
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-stone-200 text-stone-600 hover:border-amber-300 hover:bg-amber-50',
                  preset.value > available && 'opacity-50 cursor-not-allowed'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {amount > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 text-amber-700 mb-2">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">После пополнения</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Новый уровень:</span>
              <span className="font-bold text-stone-800">
                {newLevel.toLocaleString()} {bunker.unit} ({newPercentage}%)
              </span>
            </div>
            <div className="mt-2">
              <LevelBar
                value={newLevel}
                max={bunker.maxCapacity}
                threshold={30}
                size="sm"
                showPercent
              />
            </div>
          </div>
        )}

        {/* Warning if overfill */}
        {amount > available && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              Введённое количество превышает доступное место. Максимум: {available} {bunker.unit}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-stone-200"
          >
            Отмена
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={amount <= 0 || isLoading}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isLoading ? 'Сохранение...' : 'Подтвердить пополнение'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default RefillModal
