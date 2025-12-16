import type { Meta, StoryObj } from '@storybook/react'
import { Avatar, AvatarWithName, AvatarGroup, AvatarButton } from './Avatar'

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    name: 'Иван Иванов',
    size: 'md',
  },
}

export const WithImage: Story = {
  args: {
    name: 'Иван Иванов',
    src: 'https://i.pravatar.cc/150?img=1',
    size: 'md',
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Avatar name="User" size="xs" />
      <Avatar name="User" size="sm" />
      <Avatar name="User" size="md" />
      <Avatar name="User" size="lg" />
      <Avatar name="User" size="xl" />
    </div>
  ),
}

export const Initials: Story = {
  render: () => (
    <div className="flex gap-2">
      <Avatar name="Иван Иванов" />
      <Avatar name="Петр Петров" />
      <Avatar name="Анна Сидорова" />
      <Avatar name="Мария Козлова" />
    </div>
  ),
}

export const WithName: Story = {
  render: () => (
    <div className="space-y-4">
      <AvatarWithName
        name="Иван Иванов"
        subtitle="Администратор"
        size="md"
      />
      <AvatarWithName
        name="Петр Петров"
        subtitle="Оператор"
        size="md"
        src="https://i.pravatar.cc/150?img=2"
      />
      <AvatarWithName
        name="Анна Сидорова"
        subtitle="Менеджер"
        size="lg"
      />
    </div>
  ),
}

export const Group: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-500 mb-2">3 users</p>
        <AvatarGroup
          avatars={[
            { name: 'Иван Иванов' },
            { name: 'Петр Петров' },
            { name: 'Анна Сидорова' },
          ]}
        />
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-2">6 users (max 4)</p>
        <AvatarGroup
          avatars={[
            { name: 'Иван Иванов' },
            { name: 'Петр Петров' },
            { name: 'Анна Сидорова' },
            { name: 'Мария Козлова' },
            { name: 'Сергей Смирнов' },
            { name: 'Елена Новикова' },
          ]}
          max={4}
        />
      </div>
    </div>
  ),
}

export const Clickable: Story = {
  render: () => (
    <div className="flex gap-4">
      <AvatarButton
        name="Иван Иванов"
        onClick={() => alert('Avatar clicked!')}
      />
      <AvatarButton
        name="Петр Петров"
        src="https://i.pravatar.cc/150?img=3"
        onClick={() => alert('Avatar clicked!')}
      />
    </div>
  ),
}

export const UserList: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      {[
        { name: 'Иван Иванов', role: 'Администратор', status: 'online' },
        { name: 'Петр Петров', role: 'Оператор', status: 'offline' },
        { name: 'Анна Сидорова', role: 'Менеджер', status: 'online' },
        { name: 'Мария Козлова', role: 'Техник', status: 'away' },
      ].map((user) => (
        <div
          key={user.name}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
        >
          <div className="relative">
            <Avatar name={user.name} size="md" />
            <span
              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                user.status === 'online'
                  ? 'bg-green-500'
                  : user.status === 'away'
                  ? 'bg-yellow-500'
                  : 'bg-gray-400'
              }`}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-gray-500">{user.role}</p>
          </div>
        </div>
      ))}
    </div>
  ),
}
