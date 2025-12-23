import type { Meta, StoryObj } from '@storybook/react'
import {
  MachineStatusBadge,
  TaskStatusBadge,
  TaskTypeBadge,
  PriorityBadge,
  IncidentStatusBadge,
  RoleBadge,
  UserStatusBadge,
  StatusDot,
  CountBadge
} from './StatusBadge'
import { UserRole } from '@/types/users'

const meta: Meta = {
  title: 'UI/StatusBadge',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj

export const MachineStatuses: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Machine Status Badges</h3>
      <div className="flex flex-wrap gap-2">
        <MachineStatusBadge status="active" />
        <MachineStatusBadge status="low_stock" />
        <MachineStatusBadge status="error" />
        <MachineStatusBadge status="maintenance" />
        <MachineStatusBadge status="offline" />
        <MachineStatusBadge status="disabled" />
      </div>
    </div>
  ),
}

export const TaskStatuses: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Task Status Badges</h3>
      <div className="flex flex-wrap gap-2">
        <TaskStatusBadge status="created" />
        <TaskStatusBadge status="assigned" />
        <TaskStatusBadge status="in_progress" />
        <TaskStatusBadge status="completed" />
        <TaskStatusBadge status="cancelled" />
        <TaskStatusBadge status="overdue" />
      </div>
    </div>
  ),
}

export const TaskTypes: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Task Type Badges</h3>
      <div className="flex flex-wrap gap-2">
        <TaskTypeBadge type="refill" />
        <TaskTypeBadge type="collection" />
        <TaskTypeBadge type="maintenance" />
        <TaskTypeBadge type="inspection" />
        <TaskTypeBadge type="repair" />
        <TaskTypeBadge type="cleaning" />
      </div>
    </div>
  ),
}

export const Priorities: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Priority Badges</h3>
      <div className="flex flex-wrap gap-2">
        <PriorityBadge priority="low" />
        <PriorityBadge priority="medium" />
        <PriorityBadge priority="high" />
        <PriorityBadge priority="critical" />
      </div>
    </div>
  ),
}

export const IncidentStatuses: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Incident Status Badges</h3>
      <div className="flex flex-wrap gap-2">
        <IncidentStatusBadge status="open" />
        <IncidentStatusBadge status="in_progress" />
        <IncidentStatusBadge status="resolved" />
        <IncidentStatusBadge status="closed" />
      </div>
    </div>
  ),
}

export const Roles: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Role Badges</h3>
      <div className="flex flex-wrap gap-2">
        <RoleBadge role={UserRole.OWNER} />
        <RoleBadge role={UserRole.ADMIN} />
        <RoleBadge role={UserRole.MANAGER} />
        <RoleBadge role={UserRole.OPERATOR} />
        <RoleBadge role={UserRole.COLLECTOR} />
        <RoleBadge role={UserRole.TECHNICIAN} />
        <RoleBadge role={UserRole.VIEWER} />
      </div>
    </div>
  ),
}

export const UserStatuses: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">User Status Badges</h3>
      <div className="flex flex-wrap gap-2">
        <UserStatusBadge status="active" />
        <UserStatusBadge status="inactive" />
        <UserStatusBadge status="blocked" />
      </div>
    </div>
  ),
}

export const StatusDots: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Status Dots</h3>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <StatusDot status="success" />
          <span className="text-sm">Online</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status="warning" />
          <span className="text-sm">Warning</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status="danger" />
          <span className="text-sm">Error</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status="default" />
          <span className="text-sm">Offline</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <StatusDot status="success" pulse />
          <span className="text-sm">Active (pulse)</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status="danger" pulse />
          <span className="text-sm">Error (pulse)</span>
        </div>
      </div>
    </div>
  ),
}

export const CountBadges: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Count Badges</h3>
      <div className="flex items-center gap-4">
        <CountBadge count={5} />
        <CountBadge count={42} />
        <CountBadge count={100} max={99} />
        <CountBadge count={1000} max={999} />
      </div>
    </div>
  ),
}

export const CompleteOverview: Story = {
  render: () => (
    <div className="space-y-8 p-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Статусы аппаратов</h3>
        <div className="flex flex-wrap gap-2">
          <MachineStatusBadge status="active" />
          <MachineStatusBadge status="low_stock" />
          <MachineStatusBadge status="error" />
          <MachineStatusBadge status="maintenance" />
          <MachineStatusBadge status="offline" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Статусы задач</h3>
        <div className="flex flex-wrap gap-2">
          <TaskStatusBadge status="created" />
          <TaskStatusBadge status="in_progress" />
          <TaskStatusBadge status="completed" />
          <TaskStatusBadge status="cancelled" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Типы задач</h3>
        <div className="flex flex-wrap gap-2">
          <TaskTypeBadge type="refill" />
          <TaskTypeBadge type="collection" />
          <TaskTypeBadge type="maintenance" />
          <TaskTypeBadge type="repair" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Приоритеты</h3>
        <div className="flex flex-wrap gap-2">
          <PriorityBadge priority="low" />
          <PriorityBadge priority="medium" />
          <PriorityBadge priority="high" />
          <PriorityBadge priority="critical" />
        </div>
      </div>
    </div>
  ),
}
