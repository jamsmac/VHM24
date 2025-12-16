'use client'

import { useState, useCallback } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info' | 'success' | 'default'
  requireConfirmation?: string
}

interface UseConfirmReturn {
  isOpen: boolean
  options: ConfirmOptions | null
  confirm: (options: ConfirmOptions) => Promise<boolean>
  handleConfirm: () => void
  handleCancel: () => void
}

export function useConfirm(): UseConfirmReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts)
      setResolveRef(() => resolve)
      setIsOpen(true)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setIsOpen(false)
    resolveRef?.(true)
    setResolveRef(null)
    setOptions(null)
  }, [resolveRef])

  const handleCancel = useCallback(() => {
    setIsOpen(false)
    resolveRef?.(false)
    setResolveRef(null)
    setOptions(null)
  }, [resolveRef])

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  }
}

// Shorthand hooks for common confirmations

export function useDeleteConfirm() {
  const { confirm, ...rest } = useConfirm()

  const confirmDelete = useCallback(
    (itemName?: string, itemType: string = 'элемент') => {
      return confirm({
        title: `Удалить ${itemType}?`,
        message: itemName
          ? `Вы уверены, что хотите удалить "${itemName}"? Это действие нельзя отменить.`
          : `Вы уверены, что хотите удалить этот ${itemType}? Это действие нельзя отменить.`,
        confirmLabel: 'Удалить',
        variant: 'danger',
      })
    },
    [confirm]
  )

  return { confirmDelete, ...rest }
}

export function useDiscardConfirm() {
  const { confirm, ...rest } = useConfirm()

  const confirmDiscard = useCallback(() => {
    return confirm({
      title: 'Отменить изменения?',
      message: 'У вас есть несохранённые изменения. Вы уверены, что хотите их отменить?',
      confirmLabel: 'Отменить изменения',
      cancelLabel: 'Продолжить редактирование',
      variant: 'warning',
    })
  }, [confirm])

  return { confirmDiscard, ...rest }
}

export function useBulkDeleteConfirm() {
  const { confirm, ...rest } = useConfirm()

  const confirmBulkDelete = useCallback(
    (count: number, itemType: string = 'элементов') => {
      return confirm({
        title: `Удалить ${count} ${itemType}?`,
        message: `Вы уверены, что хотите удалить ${count} ${itemType}? Это действие нельзя отменить.`,
        confirmLabel: 'Удалить все',
        variant: 'danger',
        requireConfirmation: count > 10 ? 'УДАЛИТЬ' : undefined,
      })
    },
    [confirm]
  )

  return { confirmBulkDelete, ...rest }
}
