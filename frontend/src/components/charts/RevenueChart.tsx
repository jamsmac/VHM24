'use client'

import { memo, useMemo, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface RevenueDataPoint {
  date: string
  revenue: number
  commission: number
}

interface RevenueChartProps {
  data: RevenueDataPoint[]
  title?: string
  height?: number
}

/**
 * Revenue Chart Component
 *
 * Displays revenue and commission trends over time using a line chart
 *
 * @param data - Array of revenue data points with date, revenue, and commission
 * @param title - Optional chart title
 * @param height - Chart height in pixels (default: 300)
 */
export const RevenueChart = memo(function RevenueChart({ data, title, height = 300 }: RevenueChartProps) {
  const formattedData = useMemo(() => {
    return data.map((point) => ({
      date: format(parseISO(point.date), 'dd MMM'),
      revenue: point.revenue,
      commission: point.commission,
    }))
  }, [data])

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }, [])

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
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
            formatter={(value: number) => [formatCurrency(value), '']}
          />
          <Legend
            wrapperStyle={{ fontSize: '14px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Выручка"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="commission"
            name="Комиссия"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
})
