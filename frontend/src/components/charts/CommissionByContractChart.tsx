'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface CommissionData {
  contractName: string
  commission: number
  revenue: number
}

interface CommissionByContractChartProps {
  data: CommissionData[]
  title?: string
  height?: number
  maxItems?: number
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
]

/**
 * Commission by Contract Chart
 *
 * Displays commission amounts by contract using a bar chart
 *
 * @param data - Array of commission data by contract
 * @param title - Optional chart title
 * @param height - Chart height in pixels (default: 350)
 * @param maxItems - Maximum number of contracts to display (default: 8)
 */
export function CommissionByContractChart({
  data,
  title,
  height = 350,
  maxItems = 8,
}: CommissionByContractChartProps) {
  const topContracts = useMemo(() => {
    // Sort by commission descending and take top N
    return [...data]
      .sort((a, b) => b.commission - a.commission)
      .slice(0, maxItems)
      .map((item, index) => ({
        ...item,
        color: COLORS[index % COLORS.length],
      }))
  }, [data, maxItems])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const truncateLabel = (label: string, maxLength: number = 20) => {
    return label.length > maxLength
      ? label.substring(0, maxLength) + '...'
      : label
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={topContracts}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="contractName"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
            tickFormatter={(value) => truncateLabel(value, 15)}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value, name) => [
              formatCurrency(Number(value) || 0),
              name === 'commission' ? 'Комиссия' : 'Выручка',
            ]}
            labelFormatter={(label) => `Договор: ${label}`}
          />
          <Legend
            wrapperStyle={{ fontSize: '14px', marginTop: '20px' }}
            verticalAlign="top"
          />
          <Bar
            dataKey="commission"
            name="Комиссия"
            radius={[8, 8, 0, 0]}
          >
            {topContracts.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
