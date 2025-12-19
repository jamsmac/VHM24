'use client'

import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import {
  MachineAccess,
  MachineAccessRole,
  machineAccessRoleLabels,
  machineAccessRoleColors,
} from '@/types/machine-access'

interface ColumnsProps {
  onEdit: (access: MachineAccess) => void
  onDelete: (access: MachineAccess) => void
  showMachine?: boolean
  showUser?: boolean
}

export const getColumns = ({
  onEdit,
  onDelete,
  showMachine = true,
  showUser = true,
}: ColumnsProps): ColumnDef<MachineAccess>[] => {
  const columns: ColumnDef<MachineAccess>[] = []

  if (showMachine) {
    columns.push({
      accessorKey: 'machine',
      header: 'Аппарат',
      cell: ({ row }) => {
        const machine = row.original.machine
        if (!machine) return '-'
        return (
          <div>
            <div className="font-medium">{machine.machine_number}</div>
            <div className="text-sm text-muted-foreground">{machine.name}</div>
          </div>
        )
      },
    })
  }

  if (showUser) {
    columns.push({
      accessorKey: 'user',
      header: 'Пользователь',
      cell: ({ row }) => {
        const user = row.original.user
        if (!user) return '-'
        return (
          <div>
            <div className="font-medium">{user.full_name || user.username}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        )
      },
    })
  }

  columns.push(
    {
      accessorKey: 'role',
      header: 'Роль',
      cell: ({ row }) => {
        const role = row.original.role as MachineAccessRole
        return (
          <Badge className={machineAccessRoleColors[role]}>
            {machineAccessRoleLabels[role]}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Добавлен',
      cell: ({ row }) => formatDateTime(row.original.created_at),
    },
    {
      accessorKey: 'created_by',
      header: 'Добавил',
      cell: ({ row }) => {
        const createdBy = row.original.created_by
        return createdBy?.full_name || createdBy?.username || '-'
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const access = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Открыть меню</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(access)}>
                <Edit className="mr-2 h-4 w-4" />
                Изменить роль
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(access)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить доступ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    }
  )

  return columns
}
