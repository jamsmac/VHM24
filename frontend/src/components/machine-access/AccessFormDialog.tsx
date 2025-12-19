'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { machineAccessApi } from '@/lib/machine-access-api'
import { machinesApi } from '@/lib/machines-api'
import { usersApi } from '@/lib/users-api'
import {
  MachineAccess,
  MachineAccessRole,
  machineAccessRoleLabels,
  CreateMachineAccessDto,
} from '@/types/machine-access'

interface AccessFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  access?: MachineAccess | null
  machineId?: string
  userId?: string
}

export function AccessFormDialog({
  open,
  onOpenChange,
  access,
  machineId,
  userId,
}: AccessFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!access

  const [formData, setFormData] = useState({
    machine_id: machineId || '',
    user_id: userId || '',
    role: MachineAccessRole.VIEWER,
  })

  useEffect(() => {
    if (access) {
      setFormData({
        machine_id: access.machine_id,
        user_id: access.user_id,
        role: access.role,
      })
    } else {
      setFormData({
        machine_id: machineId || '',
        user_id: userId || '',
        role: MachineAccessRole.VIEWER,
      })
    }
  }, [access, machineId, userId])

  const { data: machines } = useQuery({
    queryKey: ['machines-list'],
    queryFn: () => machinesApi.getAll(),
    enabled: !machineId && !isEdit,
  })

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.getAll(),
    enabled: !userId && !isEdit,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateMachineAccessDto) => machineAccessApi.create(data),
    onSuccess: () => {
      toast.success('Доступ добавлен')
      queryClient.invalidateQueries({ queryKey: ['machine-access'] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Ошибка при добавлении доступа')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: MachineAccessRole }) =>
      machineAccessApi.update(id, { role }),
    onSuccess: () => {
      toast.success('Роль изменена')
      queryClient.invalidateQueries({ queryKey: ['machine-access'] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Ошибка при изменении роли')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isEdit && access) {
      updateMutation.mutate({ id: access.id, role: formData.role })
    } else {
      createMutation.mutate(formData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Изменить роль доступа' : 'Добавить доступ к аппарату'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && !machineId && (
            <div className="space-y-2">
              <Label htmlFor="machine">Аппарат</Label>
              <Select
                value={formData.machine_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, machine_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите аппарат" />
                </SelectTrigger>
                <SelectContent>
                  {machines?.map((machine: any) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.machine_number} - {machine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isEdit && !userId && (
            <div className="space-y-2">
              <Label htmlFor="user">Пользователь</Label>
              <Select
                value={formData.user_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, user_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите пользователя" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.username} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Роль</Label>
            <Select
              value={formData.role}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, role: value as MachineAccessRole }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(MachineAccessRole).map((role) => (
                  <SelectItem key={role} value={role}>
                    {machineAccessRoleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
