'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { machinesApi } from '@/lib/machines-api'
import { machineColumns } from '@/components/machines/columns'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { ExportButton } from '@/components/ui/ExportButton'
import { Plus, Filter } from 'lucide-react'
import Link from 'next/link'
import { Machine, MachineStatus } from '@/types/machines'
import { useTranslations } from '@/providers/I18nProvider'
import { formatDateForExport, formatCurrencyForExport, type ExportColumn } from '@/lib/export'

// Export columns configuration
const machineExportColumns: ExportColumn<Machine>[] = [
  { key: 'machine_number', header: 'Номер' },
  { key: 'name', header: 'Название' },
  { key: 'status', header: 'Статус' },
  { key: 'location', header: 'Локация', format: (v) => (v as Machine['location'])?.name || '' },
  { key: 'manufacturer', header: 'Производитель', format: (v) => String(v || '') },
  { key: 'model', header: 'Модель', format: (v) => String(v || '') },
  { key: 'serial_number', header: 'Серийный номер', format: (v) => String(v || '') },
  { key: 'current_cash_amount', header: 'Наличные', format: (v) => formatCurrencyForExport(v as number) },
  { key: 'current_product_count', header: 'Товаров', format: (v) => String(v || 0) },
  { key: 'max_product_slots', header: 'Макс. слотов', format: (v) => String(v || 0) },
  { key: 'last_refill_date', header: 'Посл. пополнение', format: (v) => formatDateForExport(v as string) },
  { key: 'last_collection_date', header: 'Посл. инкассация', format: (v) => formatDateForExport(v as string) },
  { key: 'installation_date', header: 'Дата установки', format: (v) => formatDateForExport(v as string) },
]

export default function MachinesPage() {
  const { t } = useTranslations()
  const [statusFilter, setStatusFilter] = useState<MachineStatus | undefined>()

  const { data: machines, isLoading } = useQuery({
    queryKey: ['machines', statusFilter],
    queryFn: () => machinesApi.getAll({ status: statusFilter }),
  })

  const { data: stats } = useQuery({
    queryKey: ['machines', 'stats'],
    queryFn: machinesApi.getStats,
  })

  // Memoize export data to prevent unnecessary re-renders
  const exportData = useMemo(() => machines || [], [machines])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('machines.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('machines.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={exportData}
            columns={machineExportColumns}
            filename={`machines-${new Date().toISOString().split('T')[0]}`}
          />
          <Link href="/dashboard/machines/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('machines.addMachine')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{t('machines.stats.total')}</p>
            <p className="text-2xl font-bold text-foreground">{stats.total_machines}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{t('machines.stats.active')}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.by_status?.active || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{t('machines.stats.revenueToday')}</p>
            <p className="text-2xl font-bold text-primary">
              {stats.total_revenue_today?.toLocaleString('ru-RU') || 0} сўм
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{t('machines.stats.lowStock')}</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.low_stock_count || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-foreground">{t('machines.filter.title')}</h3>
        </div>
        <select
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value as MachineStatus || undefined)}
          className="w-full md:w-64 px-3 py-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-input"
        >
          <option value="">{t('machines.filter.allStatuses')}</option>
          <option value="active">{t('machines.active')}</option>
          <option value="low_stock">{t('machines.lowStock')}</option>
          <option value="error">{t('machines.error')}</option>
          <option value="maintenance">{t('machines.maintenance')}</option>
          <option value="offline">{t('machines.offline')}</option>
        </select>
      </div>

      {/* DataTable */}
      <div className="bg-card rounded-lg border border-border">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : machines && machines.length > 0 ? (
          <DataTable
            columns={machineColumns}
            data={machines}
            searchKey="machine_number"
            searchPlaceholder={t('common.search')}
          />
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">{t('machines.noMachines')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
