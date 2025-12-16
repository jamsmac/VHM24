import type { Meta, StoryObj } from '@storybook/react'
import { RealTimeChart, MultiRealTimeChart, Sparkline } from './RealTimeChart'

const meta: Meta<typeof RealTimeChart> = {
  title: 'Charts/RealTimeChart',
  component: RealTimeChart,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

let cpuValue = 45
let memoryValue = 60
let networkValue = 25

const mockCpuFetch = async () => {
  cpuValue += (Math.random() - 0.5) * 10
  cpuValue = Math.max(10, Math.min(95, cpuValue))
  return cpuValue
}

const mockMemoryFetch = async () => {
  memoryValue += (Math.random() - 0.5) * 5
  memoryValue = Math.max(40, Math.min(90, memoryValue))
  return memoryValue
}

const mockNetworkFetch = async () => {
  networkValue += (Math.random() - 0.5) * 15
  networkValue = Math.max(5, Math.min(100, networkValue))
  return networkValue
}

export const Default: Story = {
  args: {
    fetchData: mockCpuFetch,
    label: 'CPU Usage',
    unit: '%',
    refreshInterval: 2000,
  },
}

export const WithThresholds: Story = {
  args: {
    fetchData: mockCpuFetch,
    label: 'CPU Usage',
    unit: '%',
    refreshInterval: 2000,
    thresholds: {
      warning: 70,
      critical: 90,
    },
  },
}

export const MemoryMonitor: Story = {
  args: {
    fetchData: mockMemoryFetch,
    label: 'Memory Usage',
    unit: '%',
    refreshInterval: 3000,
    thresholds: {
      warning: 75,
      critical: 85,
    },
  },
}

export const WithoutControls: Story = {
  args: {
    fetchData: mockCpuFetch,
    label: 'CPU Usage',
    unit: '%',
    refreshInterval: 2000,
    showControls: false,
  },
}

export const TallChart: Story = {
  args: {
    fetchData: mockCpuFetch,
    label: 'System Load',
    unit: '',
    refreshInterval: 2000,
    height: 300,
  },
}

export const MultiMetric: StoryObj<typeof MultiRealTimeChart> = {
  render: () => (
    <div className="w-full max-w-2xl">
      <MultiRealTimeChart
        metrics={[
          { id: 'cpu', label: 'CPU', color: 'hsl(217, 91%, 60%)', fetchData: mockCpuFetch },
          { id: 'memory', label: 'Memory', color: 'hsl(142, 76%, 36%)', fetchData: mockMemoryFetch },
          { id: 'network', label: 'Network', color: 'hsl(38, 92%, 50%)', fetchData: mockNetworkFetch },
        ]}
        refreshInterval={2000}
      />
    </div>
  ),
}

export const SparklineDefault: StoryObj<typeof Sparkline> = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 w-20">CPU:</span>
        <Sparkline data={[45, 52, 48, 55, 60, 58, 62, 65, 70, 68]} showChange />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 w-20">Memory:</span>
        <Sparkline data={[60, 62, 61, 63, 65, 64, 66, 65, 67, 68]} showChange color="hsl(142, 76%, 36%)" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 w-20">Network:</span>
        <Sparkline data={[30, 25, 35, 20, 40, 30, 25, 35, 28, 22]} showChange color="hsl(38, 92%, 50%)" />
      </div>
    </div>
  ),
}

export const SparklineUptrend: StoryObj<typeof Sparkline> = {
  render: () => (
    <div className="flex items-center gap-2">
      <span className="font-medium">Sales Today:</span>
      <Sparkline
        data={[10, 15, 18, 22, 28, 35, 42, 48, 55, 62]}
        showChange
        width={120}
      />
    </div>
  ),
}

export const SparklineDowntrend: StoryObj<typeof Sparkline> = {
  render: () => (
    <div className="flex items-center gap-2">
      <span className="font-medium">Error Rate:</span>
      <Sparkline
        data={[50, 45, 42, 38, 35, 30, 28, 25, 22, 18]}
        showChange
        width={120}
        color="hsl(0, 84%, 60%)"
      />
    </div>
  ),
}

export const SparklineTable: StoryObj<typeof Sparkline> = {
  render: () => (
    <table className="w-full max-w-xl border-collapse">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2">Machine</th>
          <th className="text-left py-2">Revenue Trend</th>
          <th className="text-right py-2">Today</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b">
          <td className="py-2">VM-001</td>
          <td className="py-2">
            <Sparkline data={[100, 120, 115, 130, 145, 140, 160]} showChange />
          </td>
          <td className="text-right py-2 font-medium">2.5M</td>
        </tr>
        <tr className="border-b">
          <td className="py-2">VM-002</td>
          <td className="py-2">
            <Sparkline data={[80, 85, 90, 88, 92, 95, 98]} showChange />
          </td>
          <td className="text-right py-2 font-medium">1.8M</td>
        </tr>
        <tr className="border-b">
          <td className="py-2">VM-003</td>
          <td className="py-2">
            <Sparkline data={[150, 140, 135, 130, 125, 120, 115]} showChange />
          </td>
          <td className="text-right py-2 font-medium">1.2M</td>
        </tr>
        <tr>
          <td className="py-2">VM-004</td>
          <td className="py-2">
            <Sparkline data={[60, 65, 62, 68, 70, 72, 75]} showChange />
          </td>
          <td className="text-right py-2 font-medium">980K</td>
        </tr>
      </tbody>
    </table>
  ),
}

export const MonitoringDashboard: StoryObj = {
  render: () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">System Monitoring</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RealTimeChart
          fetchData={mockCpuFetch}
          label="CPU Usage"
          unit="%"
          refreshInterval={2000}
          thresholds={{ warning: 70, critical: 90 }}
          height={150}
        />
        <RealTimeChart
          fetchData={mockMemoryFetch}
          label="Memory Usage"
          unit="%"
          refreshInterval={2000}
          thresholds={{ warning: 75, critical: 85 }}
          height={150}
        />
      </div>
      <MultiRealTimeChart
        metrics={[
          { id: 'cpu', label: 'CPU', color: 'hsl(217, 91%, 60%)', fetchData: mockCpuFetch },
          { id: 'memory', label: 'Memory', color: 'hsl(142, 76%, 36%)', fetchData: mockMemoryFetch },
        ]}
        refreshInterval={2000}
        height={200}
      />
    </div>
  ),
}
