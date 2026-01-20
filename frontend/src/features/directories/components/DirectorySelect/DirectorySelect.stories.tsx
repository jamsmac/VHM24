import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DirectorySelect from './DirectorySelect';
import {
  Directory,
  DirectoryEntry,
  DirectoryType,
  DirectoryScope,
  EntryStatus,
  EntryOrigin,
} from '../../types';

// Mock data
const mockDirectory: Directory = {
  id: 'dir-1',
  slug: 'products',
  name_ru: 'Товары',
  name_en: 'Products',
  description_ru: 'Справочник товаров',
  directory_type: DirectoryType.INTERNAL,
  scope: DirectoryScope.ORGANIZATION,
  is_active: true,
  is_hierarchical: false,
  version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  fields: [
    {
      id: 'field-1',
      directory_id: 'dir-1',
      code: 'name',
      name_ru: 'Название',
      field_type: 'text',
      is_required: true,
      is_unique: false,
      is_searchable: true,
      is_active: true,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
};

const mockEntries: DirectoryEntry[] = [
  {
    id: 'entry-1',
    directory_id: 'dir-1',
    data: { name: 'Кофе Американо', code: 'AMER' },
    origin: EntryOrigin.OFFICIAL,
    status: EntryStatus.ACTIVE,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'entry-2',
    directory_id: 'dir-1',
    data: { name: 'Кофе Латте', code: 'LATT' },
    origin: EntryOrigin.OFFICIAL,
    status: EntryStatus.ACTIVE,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'entry-3',
    directory_id: 'dir-1',
    data: { name: 'Капучино', code: 'CAPP' },
    origin: EntryOrigin.LOCAL,
    status: EntryStatus.ACTIVE,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'entry-4',
    directory_id: 'dir-1',
    data: { name: 'Эспрессо', code: 'ESPR' },
    origin: EntryOrigin.OFFICIAL,
    status: EntryStatus.ACTIVE,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'entry-5',
    directory_id: 'dir-1',
    data: { name: 'Моккачино', code: 'MOKK' },
    origin: EntryOrigin.OFFICIAL,
    status: EntryStatus.ACTIVE,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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

const meta: Meta<typeof DirectorySelect> = {
  title: 'Directories/DirectorySelect',
  component: DirectorySelect,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <StoryWrapper>
        <div className="w-[400px] p-4">
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
    value: {
      control: 'text',
      description: 'Выбранное значение (ID записи)',
    },
    placeholder: {
      control: 'text',
      description: 'Текст плейсхолдера',
    },
    disabled: {
      control: 'boolean',
      description: 'Отключен',
    },
    allowCreate: {
      control: 'boolean',
      description: 'Разрешить создание новых записей',
    },
    showRecent: {
      control: 'boolean',
      description: 'Показывать недавние выборы',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    directoryId: 'products',
    placeholder: 'Выберите товар...',
  },
  render: (args) => {
    const [value, setValue] = useState<string | null>(null);
    return (
      <DirectorySelect
        {...args}
        value={value}
        onChange={(id, entry) => {
          setValue(id);
          console.log('Selected:', id, entry);
        }}
      />
    );
  },
};

export const WithValue: Story = {
  args: {
    directoryId: 'products',
    value: 'entry-1',
    placeholder: 'Выберите товар...',
  },
  render: (args) => {
    const [value, setValue] = useState<string | null>('entry-1');
    return (
      <DirectorySelect
        {...args}
        value={value}
        onChange={(id) => setValue(id)}
      />
    );
  },
};

export const Disabled: Story = {
  args: {
    directoryId: 'products',
    placeholder: 'Выберите товар...',
    disabled: true,
  },
};

export const WithCreateButton: Story = {
  args: {
    directoryId: 'products',
    placeholder: 'Выберите или создайте...',
    allowCreate: true,
  },
  render: (args) => {
    const [value, setValue] = useState<string | null>(null);
    return (
      <DirectorySelect
        {...args}
        value={value}
        onChange={(id) => setValue(id)}
      />
    );
  },
};

export const WithRecentSelections: Story = {
  args: {
    directoryId: 'products',
    placeholder: 'Выберите товар...',
    showRecent: true,
  },
  render: (args) => {
    const [value, setValue] = useState<string | null>(null);
    return (
      <DirectorySelect
        {...args}
        value={value}
        onChange={(id) => setValue(id)}
      />
    );
  },
};

export const CustomDisplayField: Story = {
  args: {
    directoryId: 'products',
    placeholder: 'Выберите товар...',
    displayField: 'code',
  },
  render: (args) => {
    const [value, setValue] = useState<string | null>(null);
    return (
      <DirectorySelect
        {...args}
        value={value}
        onChange={(id) => setValue(id)}
      />
    );
  },
};

export const InForm: Story = {
  render: () => {
    const [product, setProduct] = useState<string | null>(null);
    const [category, setCategory] = useState<string | null>(null);

    return (
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Товар</label>
          <DirectorySelect
            directoryId="products"
            value={product}
            onChange={(id) => setProduct(id)}
            placeholder="Выберите товар..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Категория</label>
          <DirectorySelect
            directoryId="categories"
            value={category}
            onChange={(id) => setCategory(id)}
            placeholder="Выберите категорию..."
          />
        </div>
        <div className="pt-4 text-sm text-gray-500">
          Выбрано: товар={product || 'нет'}, категория={category || 'нет'}
        </div>
      </form>
    );
  },
};
