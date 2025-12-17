'use client'

import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

interface PaymentStatusData {
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  count: number
  totalAmount: number
}

interface PaymentStatusChartProps {
  data: PaymentStatusData[]
  title?: string
  height?: number
}

const STATUS_COLORS = {
  pending: '#f59e0b', // amber - Ожидает
  paid: '#10b981', // green - Оплачено
  overdue: '#ef4444', // red - Просрочено
  cancelled: '#6b7280', // gray - Отменено
}

const STATUS_LABELS = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачено',
  overdue: 'Просрочено',
  cancelled: 'Отменено',
}

/**
 * Payment Status Pie Chart
 *
 * Displays distribution of payment statuses using a pie chart
 *
 * @param data - Array of payment status data
 * @param title - Optional chart title
 * @param height - Chart height in pixels (default: 300)
 */
export function PaymentStatusChart({
  data,
  title,
  height = 300,
}: PaymentStatusChartProps) {
  const chartData = useMemo(() => {
    return data
      .filter((item) => item.count > 0)
      .map((item) => ({
        name: STATUS_LABELS[item.status],
        value: item.count,
        amount: item.totalAmount,
        color: STATUS_COLORS[item.status],
      }))
  }, [data])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  interface TooltipPayloadItem {
    payload: {
      name: string
      value: number
      amount: number
      color: string
    }
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Количество: <span className="font-semibold">{data.value}</span>
          </p>
          <p className="text-sm text-gray-600">
            Сумма: <span className="font-semibold">{formatCurrency(data.amount)}</span>
          </p>
        </div>
      )
    }
    return null
  }

  const RADIAN = Math.PI / 180
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx?: number
    cy?: number
    midAngle?: number
    innerRadius?: number
    outerRadius?: number
    percent?: number
  }) => {
    if (cx === undefined || cy === undefined || midAngle === undefined || innerRadius === undefined || outerRadius === undefined || percent === undefined) {
      return null
    }
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        )}
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          Нет данных для отображения
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '14px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
