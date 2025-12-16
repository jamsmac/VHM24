import type { Meta, StoryObj } from '@storybook/react'
import { SalesTrendChart, SalesComparisonChart } from './SalesTrendChart'

const meta: Meta<typeof SalesTrendChart> = {
  title: 'Charts/SalesTrendChart',
  component: SalesTrendChart,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const generateSalesData = (days: number, baseRevenue: number) => {
  const data = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const variance = (Math.random() - 0.5) * 0.4
    data.push({
      date: date.toISOString().split('T')[0],
      revenue: Math.round(baseRevenue * (1 + variance)),
      transactions: Math.round(50 + Math.random() * 100),
      average_check: Math.round(15000 + Math.random() * 10000),
    })
  }
  return data
}

const weekData = generateSalesData(7, 5000000)
const monthData = generateSalesData(30, 5000000)

export const Default: Story = {
  args: {
    data: weekData,
  },
}

export const MonthView: Story = {
  args: {
    data: monthData,
    height: 350,
  },
}

export const WithTransactions: Story = {
  args: {
    data: weekData,
    showTransactions: true,
  },
}

export const WithAverageCheck: Story = {
  args: {
    data: weekData,
    showAverageCheck: true,
  },
}

export const WithoutTrend: Story = {
  args: {
    data: weekData,
    showTrend: false,
  },
}

export const UpwardTrend: Story = {
  args: {
    data: [
      { date: '2025-01-01', revenue: 2000000, transactions: 40 },
      { date: '2025-01-02', revenue: 2500000, transactions: 50 },
      { date: '2025-01-03', revenue: 3000000, transactions: 60 },
      { date: '2025-01-04', revenue: 3200000, transactions: 65 },
      { date: '2025-01-05', revenue: 4000000, transactions: 80 },
      { date: '2025-01-06', revenue: 4500000, transactions: 90 },
      { date: '2025-01-07', revenue: 5000000, transactions: 100 },
    ],
  },
}

export const DownwardTrend: Story = {
  args: {
    data: [
      { date: '2025-01-01', revenue: 5000000, transactions: 100 },
      { date: '2025-01-02', revenue: 4500000, transactions: 90 },
      { date: '2025-01-03', revenue: 4000000, transactions: 80 },
      { date: '2025-01-04', revenue: 3500000, transactions: 70 },
      { date: '2025-01-05', revenue: 3000000, transactions: 60 },
      { date: '2025-01-06', revenue: 2500000, transactions: 50 },
      { date: '2025-01-07', revenue: 2000000, transactions: 40 },
    ],
  },
}

export const Comparison: StoryObj<typeof SalesComparisonChart> = {
  render: () => (
    <SalesComparisonChart
      currentPeriod={weekData}
      previousPeriod={generateSalesData(7, 4500000)}
      labels={{ current: 'Эта неделя', previous: 'Прошлая неделя' }}
    />
  ),
}
