'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Machine, MachineStatus } from '@/types/machines'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/ui/data-table'
import { Eye, Edit } from 'lucide-react'
import Link from 'next/link'

// Status badge mapping
const statusConfig: Record<MachineStatus, { variant: 'success' | 'warning' | 'error' | 'default' | 'info', label: string }> = {
  [MachineStatus.ACTIVE]: { variant: 'success', label: 'Активен' },
  [MachineStatus.LOW_STOCK]: { variant: 'warning', label: 'Низкий запас' },
  [MachineStatus.ERROR]: { variant: 'error', label: 'Ошибка' },
  [MachineStatus.MAINTENANCE]: { variant: 'info', label: 'Обслуживание' },
  [MachineStatus.OFFLINE]: { variant: 'default', label: 'Offline' },
  [MachineStatus.DISABLED]: { variant: 'default', label: 'Отключен' },
}

export const machineColumns: ColumnDef<Machine>[] = [
  {
    accessorKey: 'machine_number',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Номер" />
    ),
    cell: ({ row }) => {
      return (
        <div className="font-medium text-foreground">
          {row.getValue('machine_number')}
        </div>
      )
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Название" />
    ),
    cell: ({ row }) => {
      return <div className="max-w-[200px] truncate">{row.getValue('name')}</div>
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Статус" />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as MachineStatus
      const config = statusConfig[status] || statusConfig[MachineStatus.OFFLINE]

      return (
        <Badge variant={config.variant}>
          {config.label}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'location',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Локация" />
    ),
    cell: ({ row }) => {
      const location = row.original.location
      return (
        <div className="max-w-[200px]">
          <div className="font-medium text-foreground">{location?.name || '-'}</div>
          {location?.address && (
            <div className="text-xs text-muted-foreground truncate">
              {location.address}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'type_code',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Тип" />
    ),
    cell: ({ row }) => {
      return <div className="text-sm">{row.getValue('type_code')}</div>
    },
  },
  {
    id: 'stock',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Заполненность" />
    ),
    cell: ({ row }) => {
      const current = row.original.current_product_count || 0
      const max = row.original.max_product_slots || 0
      const percentage = max > 0 ? Math.round((current / max) * 100) : 0

      return (
        <div className="flex items-center gap-2">
          <div className="w-24 bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                percentage > 50
                  ? 'bg-green-500'
                  : percentage > 20
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {current}/{max}
          </span>
        </div>
      )
    },
  },
  {
    id: 'cash',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Наличные" />
    ),
    cell: ({ row }) => {
      const current = row.original.current_cash_amount || 0
      const capacity = row.original.cash_capacity || 0
      const percentage = capacity > 0 ? Math.round((current / capacity) * 100) : 0

      return (
        <div className="text-sm">
          <div className="font-medium text-foreground">
            {current.toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-xs text-muted-foreground">
            {percentage}% от {capacity.toLocaleString('ru-RU')} ₽
          </div>
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const machine = row.original

      return (
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/machines/${machine.id}`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
          >
            <Eye className="h-4 w-4" />
            <span className="sr-only">Просмотр</span>
          </Link>
          <Link
            href={`/dashboard/machines/${machine.id}/edit`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Редактировать</span>
          </Link>
        </div>
      )
    },
  },
]
