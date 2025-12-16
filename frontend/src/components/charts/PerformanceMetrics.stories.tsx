import type { Meta, StoryObj } from '@storybook/react'
import {
  MachineRankingChart,
  MachineHealthRadar,
  KPISummary,
  CategoryDonut,
} from './PerformanceMetrics'

const meta: Meta = {
  title: 'Charts/PerformanceMetrics',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta

const machineData = [
  { machineId: 'm1', machineName: 'VM-001 Центр', revenue: 15000000, transactions: 450, uptime: 98, efficiency: 92 },
  { machineId: 'm2', machineName: 'VM-002 Офис', revenue: 12000000, transactions: 380, uptime: 95, efficiency: 88 },
  { machineId: 'm3', machineName: 'VM-003 ТЦ', revenue: 18000000, transactions: 520, uptime: 99, efficiency: 95 },
  { machineId: 'm4', machineName: 'VM-004 Вокзал', revenue: 9500000, transactions: 290, uptime: 92, efficiency: 78 },
  { machineId: 'm5', machineName: 'VM-005 Аэропорт', revenue: 22000000, transactions: 680, uptime: 97, efficiency: 91 },
  { machineId: 'm6', machineName: 'VM-006 Университет', revenue: 8000000, transactions: 420, uptime: 94, efficiency: 85 },
  { machineId: 'm7', machineName: 'VM-007 Больница', revenue: 11000000, transactions: 350, uptime: 96, efficiency: 89 },
  { machineId: 'm8', machineName: 'VM-008 Метро', revenue: 25000000, transactions: 780, uptime: 91, efficiency: 82 },
]

export const RankingByRevenue: StoryObj<typeof MachineRankingChart> = {
  render: () => (
    <div className="w-full max-w-2xl">
      <h3 className="text-lg font-medium mb-4">Топ аппаратов по выручке</h3>
      <MachineRankingChart data={machineData} metric="revenue" limit={5} />
    </div>
  ),
}

export const RankingByTransactions: StoryObj<typeof MachineRankingChart> = {
  render: () => (
    <div className="w-full max-w-2xl">
      <h3 className="text-lg font-medium mb-4">Топ аппаратов по транзакциям</h3>
      <MachineRankingChart data={machineData} metric="transactions" limit={5} />
    </div>
  ),
}

export const RankingByEfficiency: StoryObj<typeof MachineRankingChart> = {
  render: () => (
    <div className="w-full max-w-2xl">
      <h3 className="text-lg font-medium mb-4">Топ аппаратов по эффективности</h3>
      <MachineRankingChart data={machineData} metric="efficiency" limit={5} />
    </div>
  ),
}

export const WorstPerformers: StoryObj<typeof MachineRankingChart> = {
  render: () => (
    <div className="w-full max-w-2xl">
      <h3 className="text-lg font-medium mb-4">Аппараты с низкой эффективностью</h3>
      <MachineRankingChart data={machineData} metric="efficiency" limit={5} showBest={false} />
    </div>
  ),
}

export const HealthRadar: StoryObj<typeof MachineHealthRadar> = {
  render: () => (
    <div className="w-full max-w-md">
      <h3 className="text-lg font-medium mb-4">Здоровье аппарата VM-001</h3>
      <MachineHealthRadar
        data={[
          { category: 'Выручка', value: 85, maxValue: 100 },
          { category: 'Uptime', value: 98, maxValue: 100 },
          { category: 'Заполненность', value: 72, maxValue: 100 },
          { category: 'Эффективность', value: 91, maxValue: 100 },
          { category: 'Обслуживание', value: 88, maxValue: 100 },
        ]}
      />
    </div>
  ),
}

export const HealthRadarLow: StoryObj<typeof MachineHealthRadar> = {
  render: () => (
    <div className="w-full max-w-md">
      <h3 className="text-lg font-medium mb-4">Проблемный аппарат VM-004</h3>
      <MachineHealthRadar
        data={[
          { category: 'Выручка', value: 45, maxValue: 100 },
          { category: 'Uptime', value: 68, maxValue: 100 },
          { category: 'Заполненность', value: 32, maxValue: 100 },
          { category: 'Эффективность', value: 51, maxValue: 100 },
          { category: 'Обслуживание', value: 40, maxValue: 100 },
        ]}
      />
    </div>
  ),
}

export const KPISummaryDefault: StoryObj<typeof KPISummary> = {
  render: () => (
    <KPISummary
      data={[
        { label: 'Общая выручка', value: 125000000, previousValue: 112000000, format: 'currency', suffix: ' сум' },
        { label: 'Транзакции', value: 3840, previousValue: 3520, format: 'number' },
        { label: 'Средний чек', value: 32500, previousValue: 31800, format: 'currency', suffix: ' сум' },
        { label: 'Uptime', value: 96.5, previousValue: 94.2, format: 'percent' },
      ]}
    />
  ),
}

export const KPIWithTargets: StoryObj<typeof KPISummary> = {
  render: () => (
    <KPISummary
      data={[
        { label: 'Выручка', value: 125000000, target: 150000000, format: 'currency', suffix: ' сум' },
        { label: 'Транзакции', value: 3840, target: 4000, format: 'number' },
        { label: 'Конверсия', value: 78, target: 80, format: 'percent' },
        { label: 'NPS', value: 72, target: 70, format: 'number' },
      ]}
    />
  ),
}

export const KPIThreeColumns: StoryObj<typeof KPISummary> = {
  render: () => (
    <KPISummary
      columns={3}
      data={[
        { label: 'Активные аппараты', value: 142, previousValue: 138, format: 'number' },
        { label: 'Требуют внимания', value: 8, previousValue: 12, format: 'number' },
        { label: 'На ремонте', value: 3, previousValue: 2, format: 'number' },
      ]}
    />
  ),
}

export const CategoryDonutDefault: StoryObj<typeof CategoryDonut> = {
  render: () => (
    <div className="w-full max-w-md">
      <h3 className="text-lg font-medium mb-4">Продажи по категориям</h3>
      <CategoryDonut
        data={[
          { name: 'Кофе', value: 45000000 },
          { name: 'Чай', value: 15000000 },
          { name: 'Вода', value: 25000000 },
          { name: 'Снеки', value: 20000000 },
          { name: 'Другое', value: 8000000 },
        ]}
        centerValue="113M"
        centerLabel="Всего"
      />
    </div>
  ),
}

export const CategoryDonutMachineStatus: StoryObj<typeof CategoryDonut> = {
  render: () => (
    <div className="w-full max-w-md">
      <h3 className="text-lg font-medium mb-4">Статус аппаратов</h3>
      <CategoryDonut
        data={[
          { name: 'Активные', value: 142, color: 'hsl(142, 76%, 36%)' },
          { name: 'Низкий запас', value: 8, color: 'hsl(38, 92%, 50%)' },
          { name: 'Ошибка', value: 3, color: 'hsl(0, 84%, 60%)' },
          { name: 'Обслуживание', value: 3, color: 'hsl(217, 91%, 60%)' },
        ]}
        centerValue="156"
        centerLabel="Всего"
      />
    </div>
  ),
}

export const FullDashboard: StoryObj = {
  render: () => (
    <div className="space-y-8">
      <KPISummary
        data={[
          { label: 'Выручка', value: 125000000, previousValue: 112000000, target: 150000000, format: 'currency', suffix: ' сум' },
          { label: 'Транзакции', value: 3840, previousValue: 3520, format: 'number' },
          { label: 'Средний чек', value: 32500, previousValue: 31800, format: 'currency', suffix: ' сум' },
          { label: 'Uptime', value: 96.5, previousValue: 94.2, format: 'percent' },
        ]}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-medium mb-4">Топ аппаратов</h3>
          <MachineRankingChart data={machineData} metric="revenue" limit={5} />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-4">По категориям</h3>
          <CategoryDonut
            data={[
              { name: 'Кофе', value: 45 },
              { name: 'Чай', value: 15 },
              { name: 'Вода', value: 25 },
              { name: 'Снеки', value: 15 },
            ]}
          />
        </div>
      </div>
    </div>
  ),
}
