'use client'

import { useState } from 'react'
import { Modal, ModalContent, ModalFooter } from './Modal'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Trash2,
  LogOut,
  XCircle,
  CheckCircle,
  Info,
  HelpCircle,
  LucideIcon,
} from 'lucide-react'

type DialogVariant = 'danger' | 'warning' | 'info' | 'success' | 'default'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: DialogVariant
  icon?: LucideIcon
  isLoading?: boolean
  requireConfirmation?: string // Text user must type to confirm
}

const variantConfig: Record<
  DialogVariant,
  { icon: LucideIcon; iconColor: string; buttonClass: string }
> = {
  danger: {
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    buttonClass: 'bg-green-600 hover:bg-green-700 text-white',
  },
  default: {
    icon: HelpCircle,
    iconColor: 'text-muted-foreground',
    buttonClass: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  },
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  variant = 'default',
  icon,
  isLoading = false,
  requireConfirmation,
}: ConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  const config = variantConfig[variant]
  const Icon = icon || config.icon

  const canConfirm = requireConfirmation
    ? confirmText === requireConfirmation
    : true

  const handleConfirm = async () => {
    if (!canConfirm) return

    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setLoading(false)
      setConfirmText('')
    }
  }

  const handleClose = () => {
    if (loading || isLoading) return
    setConfirmText('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="sm"
      showCloseButton={false}
      closeOnBackdrop={!loading && !isLoading}
    >
      <ModalContent>
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              'rounded-full p-3 mb-4',
              variant === 'danger' && 'bg-red-100 dark:bg-red-950/30',
              variant === 'warning' && 'bg-yellow-100 dark:bg-yellow-950/30',
              variant === 'info' && 'bg-blue-100 dark:bg-blue-950/30',
              variant === 'success' && 'bg-green-100 dark:bg-green-950/30',
              variant === 'default' && 'bg-muted'
            )}
          >
            <Icon className={cn('h-6 w-6', config.iconColor)} />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground">{message}</p>

          {requireConfirmation && (
            <div className="w-full mt-4">
              <p className="text-sm text-muted-foreground mb-2">
                Введите <strong>{requireConfirmation}</strong> для подтверждения:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={requireConfirmation}
                disabled={loading || isLoading}
              />
            </div>
          )}
        </div>
      </ModalContent>

      <ModalFooter className="justify-center">
        <button
          onClick={handleClose}
          disabled={loading || isLoading}
          className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-md hover:bg-accent transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          onClick={handleConfirm}
          disabled={!canConfirm || loading || isLoading}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50',
            config.buttonClass
          )}
        >
          {loading || isLoading ? 'Загрузка...' : confirmLabel}
        </button>
      </ModalFooter>
    </Modal>
  )
}

// Pre-configured dialogs

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'элемент',
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  itemName?: string
  itemType?: string
  isLoading?: boolean
}) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Удалить ${itemType}?`}
      message={
        itemName
          ? `Вы уверены, что хотите удалить "${itemName}"? Это действие нельзя отменить.`
          : `Вы уверены, что хотите удалить этот ${itemType}? Это действие нельзя отменить.`
      }
      confirmLabel="Удалить"
      variant="danger"
      icon={Trash2}
      isLoading={isLoading}
    />
  )
}

export function LogoutConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Выйти из системы?"
      message="Вы уверены, что хотите выйти? Несохранённые изменения будут потеряны."
      confirmLabel="Выйти"
      variant="warning"
      icon={LogOut}
    />
  )
}

export function CancelConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  itemType = 'операцию',
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemType?: string
}) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Отменить ${itemType}?`}
      message="Все несохранённые изменения будут потеряны."
      confirmLabel="Отменить"
      cancelLabel="Продолжить"
      variant="warning"
      icon={XCircle}
    />
  )
}

export function DiscardChangesDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Отменить изменения?"
      message="У вас есть несохранённые изменения. Вы уверены, что хотите их отменить?"
      confirmLabel="Отменить изменения"
      cancelLabel="Продолжить редактирование"
      variant="warning"
    />
  )
}

export function BulkDeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  count,
  itemType = 'элементов',
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  count: number
  itemType?: string
  isLoading?: boolean
}) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Удалить ${count} ${itemType}?`}
      message={`Вы уверены, что хотите удалить ${count} ${itemType}? Это действие нельзя отменить.`}
      confirmLabel="Удалить все"
      variant="danger"
      icon={Trash2}
      isLoading={isLoading}
      requireConfirmation={count > 10 ? 'УДАЛИТЬ' : undefined}
    />
  )
}

export function DangerousActionDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmText: string
  isLoading?: boolean
}) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmLabel="Подтвердить"
      variant="danger"
      isLoading={isLoading}
      requireConfirmation={confirmText}
    />
  )
}
