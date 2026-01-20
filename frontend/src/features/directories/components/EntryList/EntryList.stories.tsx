import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EntryList from './EntryList';
import {
  DirectoryEntry,
  EntryStatus,
  EntryOrigin,
} from '../../types';

// Mock entries data
const mockEntries: DirectoryEntry[] = [
  {
    id: 'entry-1',
    directory_id: 'dir-1',
    data: { name: 'Кофе Американо', code: 'AMER', price: 150 },
    origin: EntryOrigin.OFFICIAL,
    status: EntryStatus.ACTIVE,
    version: 1,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'entry-2',
    directory_id: 'dir-1',
    data: { name: 'Кофе Латте', code: 'LATT', price: 180 },
    origin: EntryOrigin.OFFICIAL,
    status: EntryStatus.ACTIVE,
    version: 2,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-16T14:30:00Z',
  },
  {
    id: 'entry-3',
    directory_id: 'dir-1',
    data: { name: 'Капучино', code: 'CAPP', price: 170 },
    origin: EntryOrigin.LOCAL,
    status: EntryStatus.PENDING,
    version: 1,
    created_at: '2024-01-17T09:00:00Z',
    updated_at: '2024-01-17T09:00:00Z',
  },
  {
    id: 'entry-4',
    directory_id: 'dir-1',
    data: { name: 'Эспрессо', code: 'ESPR', price: 120 },
    origin: EntryOrigin.OFFICIAL,
    status: EntryStatus.ACTIVE,
    version: 1,
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-10T08:00:00Z',
  },
  {
    id: 'entry-5',
    directory_id: 'dir-1',
    data: { name: 'Моккачино (устарело)', code: 'MOKK', price: 200 },
    origin: EntryOrigin.OFFICIAL,
    status: EntryStatus.DEPRECATED,
    version: 3,
    deprecated_at: '2024-01-18T12:00:00Z',
    created_at: '2024-01-05T08:00:00Z',
    updated_at: '2024-01-18T12:00:00Z',
  },
];

// Create a query client for stories
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

// Wrapper component for stories
const StoryWrapper = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => createQueryClient());
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const meta: Meta<typeof EntryList> = {
  title: 'Directories/EntryList',
  component: EntryList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <StoryWrapper>
        <div className="w-full max-w-4xl">
          <Story />
        </div>
      </StoryWrapper>
    ),
  ],
  argTypes: {
    directoryId: {
      control: 'text',
      description: 'ID справочника',
    },
    showFilters: {
      control: 'boolean',
      description: 'Показывать фильтры',
    },
    showBulkActions: {
      control: 'boolean',
      description: 'Показывать массовые действия',
    },
    selectable: {
      control: 'boolean',
      description: 'Разрешить выделение строк',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    directoryId: 'products',
  },
  render: (args) => (
    <EntryList
      {...args}
      onEdit={(entry) => console.log('Edit:', entry)}
      onView={(entry) => console.log('View:', entry)}
    />
  ),
};

export const WithFilters: Story = {
  args: {
    directoryId: 'products',
    showFilters: true,
  },
  render: (args) => (
    <EntryList
      {...args}
      onEdit={(entry) => console.log('Edit:', entry)}
      onView={(entry) => console.log('View:', entry)}
    />
  ),
};

export const Selectable: Story = {
  args: {
    directoryId: 'products',
    selectable: true,
    showBulkActions: true,
  },
  render: (args) => {
    const [selected, setSelected] = useState<string[]>([]);
    return (
      <div>
        <div className="mb-4 text-sm text-gray-500">
          Выбрано: {selected.length} записей
        </div>
        <EntryList
          {...args}
          selectedIds={selected}
          onSelectionChange={setSelected}
          onEdit={(entry) => console.log('Edit:', entry)}
          onView={(entry) => console.log('View:', entry)}
        />
      </div>
    );
  },
};

export const WithBulkActions: Story = {
  args: {
    directoryId: 'products',
    selectable: true,
    showBulkActions: true,
  },
  render: (args) => {
    const [selected, setSelected] = useState<string[]>(['entry-1', 'entry-2']);
    return (
      <EntryList
        {...args}
        selectedIds={selected}
        onSelectionChange={setSelected}
        onEdit={(entry) => console.log('Edit:', entry)}
        onView={(entry) => console.log('View:', entry)}
        onBulkAction={(action, ids) => {
          console.log('Bulk action:', action, ids);
          alert(`Действие "${action}" для ${ids.length} записей`);
        }}
      />
    );
  },
};

export const Loading: Story = {
  args: {
    directoryId: 'products',
  },
  parameters: {
    mockData: {
      isLoading: true,
    },
  },
};

export const Empty: Story = {
  args: {
    directoryId: 'empty-directory',
  },
  render: (args) => (
    <EntryList
      {...args}
      onEdit={(entry) => console.log('Edit:', entry)}
      onView={(entry) => console.log('View:', entry)}
    />
  ),
};

export const WithStatusFilter: Story = {
  args: {
    directoryId: 'products',
    showFilters: true,
    initialFilters: {
      status: EntryStatus.PENDING,
    },
  },
  render: (args) => (
    <EntryList
      {...args}
      onEdit={(entry) => console.log('Edit:', entry)}
      onView={(entry) => console.log('View:', entry)}
    />
  ),
};

export const CompactView: Story = {
  args: {
    directoryId: 'products',
    compact: true,
  },
  render: (args) => (
    <EntryList
      {...args}
      onEdit={(entry) => console.log('Edit:', entry)}
      onView={(entry) => console.log('View:', entry)}
    />
  ),
};

export const ReadOnly: Story = {
  args: {
    directoryId: 'products',
    readOnly: true,
  },
  render: (args) => (
    <EntryList
      {...args}
      onView={(entry) => console.log('View:', entry)}
    />
  ),
};
