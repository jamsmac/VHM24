'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTheme } from 'next-themes'

interface TaskTypeData {
  type: string
  count: number
  label: string
}

interface TasksByTypeChartProps {
  data: TaskTypeData[]
  title?: string
  height?: number
}

const TYPE_COLORS: Record<string, string> = {
  refill: '#10b981', // green
  collection: '#3b82f6', // blue
  repair: '#ef4444', // red
  maintenance: '#f59e0b', // amber
  cleaning: '#06b6d4', // cyan
  inspection: '#8b5cf6', // purple
  other: '#6b7280', // gray
}

export function TasksByTypeChart({
  data,
  title = 'Задачи по типам',
  height = 300,
}: TasksByTypeChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? '#374151' : '#f0f0f0'}
            />
            <XAxis
              dataKey="label"
              stroke={isDark ? '#9ca3af' : '#6b7280'}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke={isDark ? '#9ca3af' : '#6b7280'}
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1f2937' : '#fff',
                border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                borderRadius: '8px',
                color: isDark ? '#f9fafb' : '#111827',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            <Bar
              dataKey="count"
              name="Количество"
              fill="#3b82f6"
              radius={[8, 8, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={TYPE_COLORS[entry.type] || '#6b7280'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
