import type { Meta, StoryObj } from '@storybook/react'
import {
  EmptyState,
  EmptyMachines,
  EmptyTasks,
  EmptyIncidents,
  EmptyUsers,
  EmptyNotifications,
  EmptySearchResults,
  EmptyFilterResults,
  EmptyLocations,
} from './EmptyState'

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Нет данных',
    description: 'Здесь пока ничего нет. Попробуйте добавить что-нибудь.',
  },
}

export const WithAction: Story = {
  args: {
    title: 'Нет данных',
    description: 'Создайте первую запись, чтобы начать работу.',
    action: {
      label: 'Создать',
      onClick: () => alert('Action clicked!'),
    },
  },
}

export const Machines: Story = {
  render: () => <EmptyMachines onAdd={() => alert('Add machine')} />,
}

export const Tasks: Story = {
  render: () => <EmptyTasks onAdd={() => alert('Add task')} />,
}

export const Incidents: Story = {
  render: () => <EmptyIncidents onAdd={() => alert('Add incident')} />,
}

export const Users: Story = {
  render: () => <EmptyUsers onAdd={() => alert('Invite user')} />,
}

export const Notifications: Story = {
  render: () => <EmptyNotifications />,
}

export const Locations: Story = {
  render: () => <EmptyLocations onAdd={() => alert('Add location')} />,
}

export const SearchResults: Story = {
  render: () => (
    <EmptySearchResults
      query="кофе"
      onClear={() => alert('Clear search')}
    />
  ),
}

export const FilterResults: Story = {
  render: () => (
    <EmptyFilterResults onClear={() => alert('Reset filters')} />
  ),
}

export const AllEmptyStates: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4">Machines</h3>
        <EmptyMachines />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4">Tasks</h3>
        <EmptyTasks />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4">Incidents</h3>
        <EmptyIncidents />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4">Notifications</h3>
        <EmptyNotifications />
      </div>
    </div>
  ),
}
