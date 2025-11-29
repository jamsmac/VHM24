'use client'

import { useEffect, useState } from 'react'
import { Package, Plus } from 'lucide-react'
import { sparePartsApi } from '@/lib/equipment-api'
import { SparePartModal } from '@/components/equipment/SparePartModal'
import { StockAdjustmentModal } from '@/components/equipment/StockAdjustmentModal'
import type { SparePart } from '@/types/equipment'
import { ComponentTypeLabels } from '@/types/equipment'

export default function SparePartsPage() {
  const [spareParts, setSpareParts] = useState<SparePart[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isStockModalOpen, setIsStockModalOpen] = useState(false)
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null)

  useEffect(() => {
    fetchSpareParts()
  }, [])

  const fetchSpareParts = async () => {
    try {
      setLoading(true)
      const data = await sparePartsApi.getAll()
      setSpareParts(data)
    } catch (error) {
      console.error('Error fetching spare parts:', error)
    } finally {
      setLoading(false)
    }
  }

  const isLowStock = (part: SparePart) => part.quantity_in_stock <= part.min_stock_level

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
            Запасные Части
          </h1>
          <p className="mt-2 text-gray-600">
            Управление инвентарем запасных частей
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedPart(null)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="h-5 w-5" />
          Добавить запчасть
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spareParts.map((part) => (
            <div
              key={part.id}
              className={`backdrop-blur-md bg-white/80 border ${
                isLowStock(part) ? 'border-red-300' : 'border-white/20'
              } rounded-xl p-6 shadow-lg hover:shadow-xl transition-all`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{part.name}</h3>
                  <p className="text-sm text-gray-500">{part.part_number}</p>
                </div>
                <Package className={`h-6 w-6 ${isLowStock(part) ? 'text-red-500' : 'text-green-500'}`} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Тип:</span>
                  <span className="font-medium">{ComponentTypeLabels[part.component_type]}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">В наличии:</span>
                  <span className={`font-semibold ${isLowStock(part) ? 'text-red-600' : 'text-green-600'}`}>
                    {part.quantity_in_stock} {part.unit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Мин. уровень:</span>
                  <span className="font-medium">{part.min_stock_level} {part.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Цена:</span>
                  <span className="font-medium">{part.unit_price} {part.currency}</span>
                </div>
              </div>

              {isLowStock(part) && (
                <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-800 font-semibold">⚠️ Низкий остаток</p>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedPart(part)
                    setIsModalOpen(true)
                  }}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Изменить
                </button>
                <button
                  onClick={() => {
                    setSelectedPart(part)
                    setIsStockModalOpen(true)
                  }}
                  className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                >
                  + Пополнить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Spare Part Modal */}
      <SparePartModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedPart(null)
        }}
        onSuccess={fetchSpareParts}
        sparePart={selectedPart}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isStockModalOpen}
        onClose={() => {
          setIsStockModalOpen(false)
          setSelectedPart(null)
        }}
        onSuccess={fetchSpareParts}
        sparePart={selectedPart}
      />
    </div>
  )
}
