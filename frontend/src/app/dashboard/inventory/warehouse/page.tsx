'use client'

import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '@/lib/inventory-api'
import { warehouseInventoryColumns } from '@/components/inventory/warehouse-columns'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from '@/providers/I18nProvider'
import { WarehouseInventoryItem } from '@/types/inventory'

export default function WarehouseInventoryPage() {
  const { t } = useTranslations()

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', 'warehouse'],
    queryFn: () => inventoryApi.getWarehouseInventory(),
  })

  const warehouseInventory = inventory || []
  const lowStockItems = warehouseInventory.filter(item => item.quantity < item.min_stock) || []

  const totalItems = warehouseInventory.length
  const totalQuantity = warehouseInventory.reduce((sum, item) => sum + item.quantity, 0)
  const stockValue = warehouseInventory.reduce((sum, item) => sum + (item.quantity * (item.product?.price ?? 0)), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('inventory.warehouseTitle')}</h1>
          <p className="mt-2 text-muted-foreground">{t('inventory.warehouseSubtitle')}</p>
        </div>
        <Link href="/inventory/transfer/warehouse-operator">
          <Button>
            <ArrowRight className="h-4 w-4 mr-2" />
            {t('inventory.transferToOperator')}
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      {warehouseInventory && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{t('inventory.stats.totalItems')}</p>
            <p className="text-2xl font-bold text-foreground">{totalItems}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{t('inventory.stats.lowStockItems')}</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{lowStockItems.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{t('inventory.stats.totalQuantity')}</p>
            <p className="text-2xl font-bold text-primary">{totalQuantity}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{t('inventory.stats.stockValue')}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stockValue.toLocaleString('ru-RU')} сўм
            </p>
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                {t('inventory.alert.lowStockTitle')} ({lowStockItems.length} {t('inventory.stats.totalItems').toLowerCase()})
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                {t('inventory.alert.lowStockMessage')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DataTable */}
      <div className="bg-card rounded-lg border border-border">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : warehouseInventory && warehouseInventory.length > 0 ? (
          <DataTable
            columns={warehouseInventoryColumns}
            data={warehouseInventory}
            searchKey="product.name"
            searchPlaceholder={t('common.search')}
          />
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">{t('inventory.noInventory')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
