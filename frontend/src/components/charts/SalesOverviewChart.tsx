'use client'

import { memo, useMemo, useCallback } from 'react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  Line,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTheme } from 'next-themes'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

interface SalesDataPoint {
  date: string
  revenue: number
  transactions?: number
}

interface SalesOverviewChartProps {
  data: SalesDataPoint[]
  title?: string
  height?: number
  showTransactions?: boolean
}

export const SalesOverviewChart = memo(function SalesOverviewChart({
  data,
  title = 'Обзор продаж',
  height = 300,
  showTransactions = false,
}: SalesOverviewChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const formattedData = useMemo(() => {
    return data.map((point) => ({
      date: format(parseISO(point.date), 'dd MMM', { locale: ru }),
      revenue: point.revenue,
      transactions: point.transactions || 0,
    }))
  }, [data])

  const formatCurrency = useCallback((value: number) => {
    return `${new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)} сўм`
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={formattedData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? '#374151' : '#f0f0f0'}
            />
            <XAxis
              dataKey="date"
              stroke={isDark ? '#9ca3af' : '#6b7280'}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke={isDark ? '#9ca3af' : '#6b7280'}
              style={{ fontSize: '12px' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1f2937' : '#fff',
                border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                borderRadius: '8px',
                color: isDark ? '#f9fafb' : '#111827',
              }}
              formatter={(value, name) => {
                const numValue = Number(value) || 0
                if (name === 'revenue') {
                  return [formatCurrency(numValue), 'Выручка']
                }
                return [numValue, 'Транзакции']
              }}
            />
            <Legend wrapperStyle={{ fontSize: '14px' }} iconType="line" />
            <Area
              type="monotone"
              dataKey="revenue"
              name="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
            {showTransactions && (
              <Line
                type="monotone"
                dataKey="transactions"
                name="transactions"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})
