import type { Meta, StoryObj } from '@storybook/react'
import {
  Skeleton,
  TextSkeleton,
  AvatarSkeleton,
  ButtonSkeleton,
  InputSkeleton,
  BadgeSkeleton
} from './Skeleton'
import {
  StatsCardSkeleton,
  MachineCardSkeleton,
  TaskCardSkeleton,
} from './CardSkeleton'
import { TableSkeleton, CompactTableSkeleton } from './TableSkeleton'
import { DashboardSkeleton, DetailPageSkeleton } from './PageSkeleton'

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'circular', 'rounded'],
    },
    animation: {
      control: 'select',
      options: ['pulse', 'shimmer', 'none'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    className: 'h-4 w-48',
  },
}

export const Circular: Story = {
  args: {
    variant: 'circular',
    className: 'h-12 w-12',
  },
}

export const Rounded: Story = {
  args: {
    variant: 'rounded',
    className: 'h-24 w-32',
  },
}

export const PulseAnimation: Story = {
  args: {
    animation: 'pulse',
    className: 'h-4 w-48',
  },
}

export const ShimmerAnimation: Story = {
  args: {
    animation: 'shimmer',
    className: 'h-4 w-48',
  },
}

export const NoAnimation: Story = {
  args: {
    animation: 'none',
    className: 'h-4 w-48',
  },
}

export const TextLines: Story = {
  render: () => <TextSkeleton lines={4} />,
}

export const AvatarSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <AvatarSkeleton size="sm" />
      <AvatarSkeleton size="md" />
      <AvatarSkeleton size="lg" />
      <AvatarSkeleton size="xl" />
    </div>
  ),
}

export const ButtonSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ButtonSkeleton size="sm" />
      <ButtonSkeleton size="md" />
      <ButtonSkeleton size="lg" />
    </div>
  ),
}

export const FormElements: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <InputSkeleton />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <InputSkeleton />
      </div>
      <div className="flex justify-end gap-2">
        <ButtonSkeleton />
        <ButtonSkeleton />
      </div>
    </div>
  ),
}

export const CardSkeletons: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>
  ),
}

export const MachineCards: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <MachineCardSkeleton />
      <MachineCardSkeleton />
    </div>
  ),
}

export const TaskCards: Story = {
  render: () => (
    <div className="space-y-4">
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </div>
  ),
}

export const Table: Story = {
  render: () => (
    <div className="w-[600px]">
      <TableSkeleton columns={4} rows={5} />
    </div>
  ),
}

export const CompactTable: Story = {
  render: () => (
    <div className="w-[400px]">
      <CompactTableSkeleton rows={5} />
    </div>
  ),
}

export const ListItems: Story = {
  render: () => (
    <div className="w-80 space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <AvatarSkeleton size="md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <BadgeSkeleton />
        </div>
      ))}
    </div>
  ),
}

export const Dashboard: Story = {
  render: () => (
    <div className="w-[800px] h-[600px] overflow-auto">
      <DashboardSkeleton />
    </div>
  ),
}

export const DetailPage: Story = {
  render: () => (
    <div className="w-[800px] h-[600px] overflow-auto">
      <DetailPageSkeleton />
    </div>
  ),
}
