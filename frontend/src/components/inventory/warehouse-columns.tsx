'use client'

import { ColumnDef } from '@tanstack/react-table'
import { WarehouseInventoryItem } from '@/types/inventory'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/ui/data-table'
import { Package, AlertTriangle } from 'lucide-react'

export const warehouseInventoryColumns: ColumnDef<WarehouseInventoryItem>[] = [
  {
    accessorKey: 'product',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Товар" />
    ),
    cell: ({ row }) => {
      const product = row.original.product
      return (
        <div className="flex items-center gap-3 max-w-[250px]">
          <Package className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div className="overflow-hidden">
            <p className="font-medium text-foreground truncate">{product?.name || '-'}</p>
            {product?.sku && (
              <p className="text-xs text-muted-foreground truncate">{product.sku}</p>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Количество" />
    ),
    cell: ({ row }) => {
      const quantity = row.original.quantity
      const minStock = row.original.min_stock
      const isLowStock = quantity < minStock
      const product = row.original.product

      return (
        <div>
          <p className={`font-semibold ${isLowStock ? 'text-orange-600 dark:text-orange-400' : 'text-foreground'}`}>
            {quantity} {product?.unit_of_measure_code || 'шт'}
          </p>
        </div>
      )
    },
  },
  {
    accessorKey: 'min_stock',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Мин. запас" />
    ),
    cell: ({ row }) => {
      const minStock = row.original.min_stock
      const product = row.original.product
      return (
        <p className="text-muted-foreground">
          {minStock} {product?.unit_of_measure_code || 'шт'}
        </p>
      )
    },
  },
  {
    id: 'stockLevel',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Уровень запаса" />
    ),
    cell: ({ row }) => {
      const quantity = row.original.quantity
      const minStock = row.original.min_stock
      const percentage = minStock > 0 ? Math.round((quantity / (minStock * 2)) * 100) : 100

      return (
        <div className="w-full max-w-[120px]">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                percentage > 75
                  ? 'bg-green-500'
                  : percentage > 40
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'reserved_quantity',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Зарезервировано" />
    ),
    cell: ({ row }) => {
      const reserved = row.original.reserved_quantity || 0
      const product = row.original.product
      return (
        <p className="text-sm text-muted-foreground">
          {reserved > 0 ? `${reserved} ${product?.unit_of_measure_code || 'шт'}` : '-'}
        </p>
      )
    },
  },
  {
    id: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Цена" />
    ),
    cell: ({ row }) => {
      const price = row.original.product?.price
      return (
        <p className="font-medium text-foreground">
          {price ? `${price.toLocaleString('ru-RU')} ₽` : '-'}
        </p>
      )
    },
  },
  {
    id: 'totalValue',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Стоимость" />
    ),
    cell: ({ row }) => {
      const quantity = row.original.quantity
      const price = row.original.product?.price || 0
      const totalValue = quantity * price

      return (
        <p className="font-semibold text-foreground">
          {totalValue.toLocaleString('ru-RU')} ₽
        </p>
      )
    },
  },
  {
    accessorKey: 'batch_number',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Партия" />
    ),
    cell: ({ row }) => {
      const batchNumber = row.original.batch_number
      return (
        <p className="text-sm text-muted-foreground">
          {batchNumber || '-'}
        </p>
      )
    },
  },
  {
    id: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Статус" />
    ),
    cell: ({ row }) => {
      const quantity = row.original.quantity
      const minStock = row.original.min_stock
      const isLowStock = quantity < minStock

      return isLowStock ? (
        <Badge variant="warning" className="whitespace-nowrap">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Низкий запас
        </Badge>
      ) : (
        <Badge variant="success" className="whitespace-nowrap">
          В норме
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      const quantity = row.original.quantity
      const minStock = row.original.min_stock
      const isLowStock = quantity < minStock

      if (value === 'low_stock') {return isLowStock}
      if (value === 'normal') {return !isLowStock}
      return true
    },
  },
]
