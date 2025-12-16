import type { Meta, StoryObj } from '@storybook/react'
import { InventoryHeatmap, TimeHeatmap } from './InventoryHeatmap'

const meta: Meta<typeof InventoryHeatmap> = {
  title: 'Charts/InventoryHeatmap',
  component: InventoryHeatmap,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const machines = [
  { id: 'm1', name: 'VM-001 Центр' },
  { id: 'm2', name: 'VM-002 Офис' },
  { id: 'm3', name: 'VM-003 ТЦ' },
  { id: 'm4', name: 'VM-004 Вокзал' },
  { id: 'm5', name: 'VM-005 Аэропорт' },
]

const products = [
  { id: 'p1', name: 'Кофе' },
  { id: 'p2', name: 'Чай' },
  { id: 'p3', name: 'Вода' },
  { id: 'p4', name: 'Сок' },
  { id: 'p5', name: 'Снеки' },
  { id: 'p6', name: 'Шоколад' },
]

const generateHeatmapData = () => {
  const data = []
  for (const machine of machines) {
    for (const product of products) {
      const maxQty = 20 + Math.floor(Math.random() * 30)
      const qty = Math.floor(Math.random() * maxQty)
      data.push({
        machineId: machine.id,
        machineName: machine.name,
        productId: product.id,
        productName: product.name,
        stockLevel: Math.round((qty / maxQty) * 100),
        quantity: qty,
        maxQuantity: maxQty,
      })
    }
  }
  return data
}

export const Default: Story = {
  args: {
    data: generateHeatmapData(),
  },
}

export const WithoutLegend: Story = {
  args: {
    data: generateHeatmapData(),
    showLegend: false,
  },
}

export const LowStock: Story = {
  args: {
    data: machines.flatMap((machine) =>
      products.map((product) => ({
        machineId: machine.id,
        machineName: machine.name,
        productId: product.id,
        productName: product.name,
        stockLevel: Math.floor(Math.random() * 25),
        quantity: Math.floor(Math.random() * 5),
        maxQuantity: 20,
      }))
    ),
  },
}

export const FullStock: Story = {
  args: {
    data: machines.flatMap((machine) =>
      products.map((product) => ({
        machineId: machine.id,
        machineName: machine.name,
        productId: product.id,
        productName: product.name,
        stockLevel: 80 + Math.floor(Math.random() * 20),
        quantity: 16 + Math.floor(Math.random() * 4),
        maxQuantity: 20,
      }))
    ),
  },
}

export const Clickable: Story = {
  args: {
    data: generateHeatmapData(),
    onCellClick: (cell) => {
      alert(`Clicked: ${cell.machineName} - ${cell.productName} (${cell.stockLevel}%)`)
    },
  },
}

const generateTimeData = () => {
  const data = []
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const isWorkHours = hour >= 8 && hour <= 20
      const isWeekend = day >= 5
      let value = 0
      if (isWorkHours) {
        value = isWeekend ? Math.random() * 30 : Math.random() * 100
        if (hour >= 11 && hour <= 14) value *= 1.5
      }
      data.push({ hour, dayOfWeek: day, value: Math.round(value) })
    }
  }
  return data
}

export const TimeHeatmapDefault: StoryObj<typeof TimeHeatmap> = {
  render: () => <TimeHeatmap data={generateTimeData()} />,
}

export const TimeHeatmapRevenue: StoryObj<typeof TimeHeatmap> = {
  render: () => (
    <TimeHeatmap
      data={generateTimeData().map((d) => ({ ...d, value: d.value * 50000 }))}
      valueLabel="Выручка"
      formatValue={(v) => `${(v / 1000).toFixed(0)}K`}
    />
  ),
}
