'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { getColumns, AccessFormDialog } from '@/components/machine-access'
import { machineAccessApi } from '@/lib/machine-access-api'
import { machinesApi } from '@/lib/machines-api'
import { MachineAccess } from '@/types/machine-access'

interface MachineAccessPageProps {
  params: {
    id: string
  }
}

export default function MachineAccessPage({ params }: MachineAccessPageProps) {
  const queryClient = useQueryClient()
  const machineId = params.id
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingAccess, setEditingAccess] = useState<MachineAccess | null>(null)
  const [deletingAccess, setDeletingAccess] = useState<MachineAccess | null>(null)

  const { data: machine } = useQuery({
    queryKey: ['machines', machineId],
    queryFn: () => machinesApi.getById(machineId),
  })

  const { data: accessList = [], isLoading } = useQuery({
    queryKey: ['machine-access', 'machine', machineId],
    queryFn: () => machineAccessApi.getByMachine(machineId),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => machineAccessApi.delete(id),
    onSuccess: () => {
      toast.success('Доступ удалён')
      queryClient.invalidateQueries({ queryKey: ['machine-access'] })
      setDeletingAccess(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Ошибка при удалении')
    },
  })

  const columns = getColumns({
    onEdit: (access) => setEditingAccess(access),
    onDelete: (access) => setDeletingAccess(access),
    showMachine: false, // Hide machine column since we're viewing one machine
    showUser: true,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/machines/${machineId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Доступ к аппарату {machine?.machine_number}
            </h1>
            <p className="text-muted-foreground">
              {machine?.name || 'Загрузка...'}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить доступ
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessList.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Владельцев</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accessList.filter((a) => a.role === 'owner').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Операторов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accessList.filter((a) => a.role === 'operator').length}
            </div>
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
            searchPlaceholder="Поиск пользователей..."
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AccessFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        machineId={machineId}
      />

      <AccessFormDialog
        open={!!editingAccess}
        onOpenChange={(open) => !open && setEditingAccess(null)}
        access={editingAccess}
        machineId={machineId}
      />

      <ConfirmDialog
        isOpen={!!deletingAccess}
        onClose={() => setDeletingAccess(null)}
        title="Удалить доступ?"
        message={`Вы уверены, что хотите удалить доступ пользователя ${
          deletingAccess?.user?.full_name || deletingAccess?.user?.username
        }?`}
        onConfirm={() => {
          if (deletingAccess) deleteMutation.mutate(deletingAccess.id)
        }}
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </div>
  )
}
