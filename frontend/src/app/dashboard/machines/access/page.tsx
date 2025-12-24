'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Upload, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  getColumns,
  AccessFormDialog,
  ImportAccessDialog,
} from '@/components/machine-access'
import { machineAccessApi } from '@/lib/machine-access-api'
import { MachineAccess } from '@/types/machine-access'
import { getErrorMessage } from '@/types/common'

export default function MachineAccessPage() {
  const queryClient = useQueryClient()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [editingAccess, setEditingAccess] = useState<MachineAccess | null>(null)
  const [deletingAccess, setDeletingAccess] = useState<MachineAccess | null>(null)

  const { data: accessList = [], isLoading } = useQuery({
    queryKey: ['machine-access'],
    queryFn: () => machineAccessApi.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => machineAccessApi.delete(id),
    onSuccess: () => {
      toast.success('Доступ удалён')
      queryClient.invalidateQueries({ queryKey: ['machine-access'] })
      setDeletingAccess(null)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Ошибка при удалении')
    },
  })

  const assignOwnerMutation = useMutation({
    mutationFn: () => machineAccessApi.assignOwnerToAll(),
    onSuccess: (data) => {
      toast.success(`Вы назначены владельцем для ${data.count} аппаратов`)
      queryClient.invalidateQueries({ queryKey: ['machine-access'] })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Ошибка при назначении')
    },
  })

  const columns = getColumns({
    onEdit: (access) => setEditingAccess(access),
    onDelete: (access) => setDeletingAccess(access),
    showMachine: true,
    showUser: true,
  })

  // Calculate stats
  const stats = {
    total: accessList.length,
    owners: accessList.filter((a) => a.role === 'owner').length,
    uniqueMachines: new Set(accessList.map((a) => a.machine_id)).size,
    uniqueUsers: new Set(accessList.map((a) => a.user_id)).size,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Доступ к аппаратам</h1>
          <p className="text-muted-foreground">
            Управление доступом пользователей к аппаратам
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => assignOwnerMutation.mutate()}
            disabled={assignOwnerMutation.isPending}
          >
            <Shield className="mr-2 h-4 w-4" />
            Стать владельцем всех
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Импорт
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить доступ
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего записей</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Владельцев</CardTitle>
            <Shield className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.owners}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Аппаратов</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueMachines}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Пользователей</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={accessList}
            searchKey="user"
            searchPlaceholder="Поиск..."
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AccessFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      <AccessFormDialog
        open={!!editingAccess}
        onOpenChange={(open) => !open && setEditingAccess(null)}
        access={editingAccess}
      />

      <ImportAccessDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />

      <ConfirmDialog
        isOpen={!!deletingAccess}
        onClose={() => setDeletingAccess(null)}
        title="Удалить доступ?"
        message={`Вы уверены, что хотите удалить доступ пользователя ${
          deletingAccess?.user?.full_name || deletingAccess?.user?.username
        } к аппарату ${deletingAccess?.machine?.machine_number}?`}
        onConfirm={() => {
          if (deletingAccess) deleteMutation.mutate(deletingAccess.id)
        }}
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </div>
  )
}
