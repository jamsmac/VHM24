'use client'

import * as React from 'react'
import { MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface RowAction<TData> {
  label: string
  icon?: React.ReactNode
  onClick: (row: TData) => void
  disabled?: boolean | ((row: TData) => boolean)
  hidden?: boolean | ((row: TData) => boolean)
  variant?: 'default' | 'destructive'
}

export interface RowActionGroup<TData> {
  label?: string
  actions: RowAction<TData>[]
}

interface DataTableRowActionsProps<TData> {
  row: TData
  actions: (RowAction<TData> | RowActionGroup<TData>)[]
  menuLabel?: string
}

function isActionGroup<TData>(
  item: RowAction<TData> | RowActionGroup<TData>
): item is RowActionGroup<TData> {
  return 'actions' in item
}

export function DataTableRowActions<TData>({
  row,
  actions,
  menuLabel = 'Действия',
}: DataTableRowActionsProps<TData>) {
  const isDisabled = (action: RowAction<TData>) => {
    if (typeof action.disabled === 'function') {
      return action.disabled(row)
    }
    return action.disabled ?? false
  }

  const isHidden = (action: RowAction<TData>) => {
    if (typeof action.hidden === 'function') {
      return action.hidden(row)
    }
    return action.hidden ?? false
  }

  const renderAction = (action: RowAction<TData>, key: string) => {
    if (isHidden(action)) {
      return null
    }

    return (
      <DropdownMenuItem
        key={key}
        onClick={() => action.onClick(row)}
        disabled={isDisabled(action)}
        className={action.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''}
      >
        {action.icon && <span className="mr-2">{action.icon}</span>}
        {action.label}
      </DropdownMenuItem>
    )
  }

  const renderItems = () => {
    const items: React.ReactNode[] = []

    actions.forEach((item, index) => {
      if (isActionGroup(item)) {
        const groupActions = item.actions.filter((a) => !isHidden(a))
        if (groupActions.length === 0) {
          return
        }

        if (items.length > 0) {
          items.push(<DropdownMenuSeparator key={`sep-${index}`} />)
        }

        if (item.label) {
          items.push(
            <DropdownMenuLabel key={`label-${index}`}>
              {item.label}
            </DropdownMenuLabel>
          )
        }

        groupActions.forEach((action, actionIndex) => {
          const rendered = renderAction(action, `group-${index}-action-${actionIndex}`)
          /* v8 ignore start - defensive check: groupActions is pre-filtered, so rendered is always truthy */
          if (rendered) {
            items.push(rendered)
          }
          /* v8 ignore stop */
        })
      } else {
        const rendered = renderAction(item, `action-${index}`)
        if (rendered) {
          items.push(rendered)
        }
      }
    })

    return items
  }

  const renderedItems = renderItems()
  if (renderedItems.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          aria-label={menuLabel}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">{menuLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {renderedItems}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
