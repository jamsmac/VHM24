'use client'

import { ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend, Area, AreaChart } from 'recharts'

interface RevenueChartProps {
  data: Array<{ date: string; revenue: number; expenses: number }>
}

/**
 * RevenueChart - Revenue and expenses chart
 * Part of VendHub "Warm Brew" design system
 */
export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 hover:shadow-lg hover:border-amber-200 transition-all">
      <h3 className="text-lg font-semibold text-stone-900 mb-4">Выручка и расходы</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#78716c" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#78716c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis
            dataKey="date"
            stroke="#78716c"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#d6d3d1' }}
          />
          <YAxis
            stroke="#78716c"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#d6d3d1' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e7e5e4',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            labelStyle={{ color: '#1c1917', fontWeight: 600 }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            name="Выручка"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="#78716c"
            strokeWidth={2}
            fill="url(#expensesGradient)"
            name="Расходы"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
