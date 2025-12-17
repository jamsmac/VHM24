'use client'

import { memo, useMemo, useCallback } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MachineStatusData {
  status: string
  count: number
  label: string
  [key: string]: string | number
}

interface MachineStatusChartProps {
  data: MachineStatusData[]
  title?: string
  height?: number
}

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981', // green
  low_stock: '#f59e0b', // amber
  error: '#ef4444', // red
  maintenance: '#3b82f6', // blue
  offline: '#6b7280', // gray
  disabled: '#9ca3af', // gray
}

export const MachineStatusChart = memo(function MachineStatusChart({
  data,
  title = 'Статусы аппаратов',
  height = 300,
}: MachineStatusChartProps) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.count, 0), [data])

  const formatTooltip = useCallback((value: number) => {
    const percentage = ((value / total) * 100).toFixed(1)
    return `${value} (${percentage}%)`
  }, [total])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ percent }: { percent?: number }) => `${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.status] || '#6b7280'}
                />
              ))}
            </Pie>
            <Tooltip formatter={formatTooltip} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry) => (entry.payload as MachineStatusData)?.label ?? value}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})
